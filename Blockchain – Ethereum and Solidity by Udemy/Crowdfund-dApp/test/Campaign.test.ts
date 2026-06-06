import { describe, it } from "node:test";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

use(chaiAsPromised);

describe("Crowdfunding Platform", function () {
  async function deployFixture() {
    const { viem } = await network.create();
    const [owner, contributor1, contributor2, recipient] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    const factory = await viem.deployContract("CampaignFactory");

    const MINIMUM_CONTRIBUTION = parseEther("0.1");
    const FUNDING_GOAL = parseEther("10");
    const TITLE = "Test Campaign";
    const DESCRIPTION = "A test description";
    const IMAGE_URL = "https://example.com/image.png";

    await factory.write.createCampaign([
      TITLE,
      DESCRIPTION,
      IMAGE_URL,
      FUNDING_GOAL,
      MINIMUM_CONTRIBUTION
    ]);

    const deployedCampaigns = await factory.read.getDeployedCampaigns();
    const campaignAddress = deployedCampaigns[0];
    const campaign = await viem.getContractAt("Campaign", campaignAddress);

    return { 
      viem,
      factory, 
      campaign, 
      owner, 
      contributor1, 
      contributor2, 
      recipient, 
      publicClient,
      MINIMUM_CONTRIBUTION,
      FUNDING_GOAL
    };
  }

  describe("Factory", function () {
    it("deploys a factory and a campaign", async function () {
      const { factory, campaign } = await deployFixture();
      expect(factory.address).to.not.be.undefined;
      expect(campaign.address).to.not.be.undefined;
    });

    it("marks caller as the campaign manager", async function () {
      const { campaign, owner } = await deployFixture();
      const manager = await campaign.read.manager();
      expect(manager.toLowerCase()).to.equal(owner.account.address.toLowerCase());
    });
  });

  describe("Campaign", function () {
    it("allows people to contribute and marks them as approvers", async function () {
      const { campaign, contributor1, MINIMUM_CONTRIBUTION } = await deployFixture();
      
      await campaign.write.contribute({ 
        value: MINIMUM_CONTRIBUTION,
        account: contributor1.account 
      });

      const isApprover = await campaign.read.approvers([contributor1.account.address]);
      expect(isApprover).to.be.true;
      
      const approversCount = await campaign.read.approversCount();
      expect(approversCount).to.equal(1n);
    });

    it("requires a minimum contribution", async function () {
      const { campaign, contributor1 } = await deployFixture();
      
      await expect(
        campaign.write.contribute({ 
          value: parseEther("0.05"),
          account: contributor1.account 
        })
      ).to.be.rejectedWith("MinimumContributionNotMet");
    });

    it("allows a manager to create a spending request", async function () {
      const { campaign, recipient } = await deployFixture();
      
      await campaign.write.createRequest([
        "Buy batteries", 
        parseEther("0.1"), 
        recipient.account.address
      ]);
      
      const request = await campaign.read.requests([0n]);

      expect(request[0]).to.equal("Buy batteries");
      expect(getAddress(request[2])).to.equal(getAddress(recipient.account.address));
      expect(request[3]).to.be.false;
    });

    it("restricts request creation to manager only", async function () {
      const { campaign, contributor1, recipient } = await deployFixture();
      
      await expect(
        campaign.write.createRequest([
          "Hack", 
          parseEther("0.1"), 
          recipient.account.address
        ], {
          account: contributor1.account
        })
      ).to.be.rejectedWith("OnlyManager");
    });

    it("processes requests", async function () {
      const { campaign, contributor1, recipient, publicClient } = await deployFixture();

      // 1. Contribute
      await campaign.write.contribute({ 
        value: parseEther("1"),
        account: contributor1.account
      });

      // 2. Create Request
      await campaign.write.createRequest([
        "Buy parts", 
        parseEther("0.5"), 
        recipient.account.address
      ]);

      // 3. Approve Request
      await campaign.write.approveRequest([0n], {
        account: contributor1.account
      });

      // 4. Finalize Request
      const initialBalance = await publicClient.getBalance({ address: recipient.account.address });
      await campaign.write.finalizeRequest([0n]);
      const finalBalance = await publicClient.getBalance({ address: recipient.account.address });

      expect(finalBalance - initialBalance).to.equal(parseEther("0.5"));
      
      const request = await campaign.read.requests([0n]);
      expect(request[3]).to.be.true; // complete is at index 3
    });

    it("fails to finalize if not enough approvals", async function () {
      const { campaign, contributor1, contributor2 } = await deployFixture();

      await campaign.write.contribute({ 
        value: parseEther("1"),
        account: contributor1.account
      });
      await campaign.write.contribute({ 
        value: parseEther("1"),
        account: contributor2.account
      });
      
      await campaign.write.createRequest([
        "Spend", 
        parseEther("0.5"), 
        contributor1.account.address
      ]);
      
      // Only 1 out of 2 approves
      await campaign.write.approveRequest([0n], {
        account: contributor1.account
      });

      await expect(
        campaign.write.finalizeRequest([0n])
      ).to.be.rejectedWith("InsufficientApprovals");
    });
  });
});
