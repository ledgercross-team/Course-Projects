import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";
import { parseEther } from "viem";

type DeliveryRequest = {
  id: bigint;
  shipmentId: string;
  description: string;
  amount: bigint;
  buyer: `0x${string}`;
  supplier: `0x${string}`;
  approver: `0x${string}`;
  status: number;
  createdAt: bigint;
  reviewedAt: bigint;
  paidAt: bigint;
};

const DEPOSIT_AMOUNT = parseEther("0.0001");
const REQUEST_AMOUNT = parseEther("0.0001");

describe("SupplyChainQAGateway", async () => {
  async function deployFixture() {
    const { viem } = await hre.network.connect();

    const publicClient = await viem.getPublicClient();
    const [admin, buyer, supplier, approver, outsider] =
      await viem.getWalletClients();

    const gateway = await viem.deployContract("SupplyChainQAGateway", [
      admin.account.address,
    ]);

    await publicClient.waitForTransactionReceipt({
      hash: await gateway.write.grantBuyerRole([buyer.account.address], {
        account: admin.account,
      }),
    });

    await publicClient.waitForTransactionReceipt({
      hash: await gateway.write.grantSupplierRole([supplier.account.address], {
        account: admin.account,
      }),
    });

    await publicClient.waitForTransactionReceipt({
      hash: await gateway.write.grantWarehouseManagerRole(
        [approver.account.address],
        { account: admin.account }
      ),
    });

    return {
      publicClient,
      admin,
      buyer,
      supplier,
      approver,
      outsider,
      gateway,
    };
  }

  it("deploys with the correct admin", async () => {
    const { gateway, admin } = await deployFixture();

    const hasAdminRole = await gateway.read.hasRole([
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      admin.account.address,
    ]);

    assert.equal(hasAdminRole, true);
  });

  it("allows a buyer to deposit funds", async () => {
    const { gateway, publicClient, buyer } = await deployFixture();

    const depositHash = await gateway.write.depositFunds({
      account: buyer.account.address,
      value: DEPOSIT_AMOUNT,
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });

    const availableBalance = await gateway.read.getBuyerAvailableBalance([
      buyer.account.address,
    ]);

    assert.equal(availableBalance, DEPOSIT_AMOUNT);
  });

  it("allows a supplier to create a delivery request", async () => {
    const { gateway, publicClient, buyer, supplier, approver } =
      await deployFixture();

    const depositHash = await gateway.write.depositFunds({
      account: buyer.account.address,
      value: DEPOSIT_AMOUNT,
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });

    const createHash = await gateway.write.createDeliveryRequest(
      [
        "SHIP-1001",
        "50 units of packaged electronics",
        REQUEST_AMOUNT,
        buyer.account.address,
        approver.account.address,
      ],
      {
        account: supplier.account.address,
      }
    );
    await publicClient.waitForTransactionReceipt({ hash: createHash });

    const request = (await gateway.read.getRequest([0n])) as DeliveryRequest;

    assert.equal(request.shipmentId, "SHIP-1001");
    assert.equal(
      request.supplier.toLowerCase(),
      supplier.account.address.toLowerCase()
    );
    assert.equal(
      request.buyer.toLowerCase(),
      buyer.account.address.toLowerCase()
    );
    assert.equal(
      request.approver.toLowerCase(),
      approver.account.address.toLowerCase()
    );
  });

  it("allows the assigned warehouse manager to approve and release payment", async () => {
    const { gateway, publicClient, buyer, supplier, approver } =
      await deployFixture();

    const depositHash = await gateway.write.depositFunds({
      account: buyer.account.address,
      value: DEPOSIT_AMOUNT,
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });

    const createHash = await gateway.write.createDeliveryRequest(
      [
        "SHIP-1002",
        "Medical devices shipment",
        REQUEST_AMOUNT,
        buyer.account.address,
        approver.account.address,
      ],
      {
        account: supplier.account.address,
      }
    );
    await publicClient.waitForTransactionReceipt({ hash: createHash });

    const supplierBalanceBefore = await publicClient.getBalance({
      address: supplier.account.address,
    });

    const approveHash = await gateway.write.approveRequest([0n], {
      account: approver.account.address,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const supplierBalanceAfter = await publicClient.getBalance({
      address: supplier.account.address,
    });

    const request = (await gateway.read.getRequest([0n])) as DeliveryRequest;
    const availableBalance = await gateway.read.getBuyerAvailableBalance([
      buyer.account.address,
    ]);

    assert.equal(request.status, 3);
    assert.equal(supplierBalanceAfter - supplierBalanceBefore, REQUEST_AMOUNT);
    assert.equal(availableBalance, 0n);
  });

  it("allows the assigned warehouse manager to reject and restore buyer balance", async () => {
    const { gateway, publicClient, buyer, supplier, approver } =
      await deployFixture();

    const depositHash = await gateway.write.depositFunds({
      account: buyer.account.address,
      value: DEPOSIT_AMOUNT,
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });

    const createHash = await gateway.write.createDeliveryRequest(
      [
        "SHIP-1003",
        "Rejected due to quality mismatch",
        REQUEST_AMOUNT,
        buyer.account.address,
        approver.account.address,
      ],
      {
        account: supplier.account.address,
      }
    );
    await publicClient.waitForTransactionReceipt({ hash: createHash });

    const rejectHash = await gateway.write.rejectRequest([0n], {
      account: approver.account.address,
    });
    await publicClient.waitForTransactionReceipt({ hash: rejectHash });

    const request = (await gateway.read.getRequest([0n])) as DeliveryRequest;
    const availableBalance = await gateway.read.getBuyerAvailableBalance([
      buyer.account.address,
    ]);

    assert.equal(request.status, 2);
    assert.equal(availableBalance, DEPOSIT_AMOUNT);
  });

  it("blocks actions when paused", async () => {
    const { gateway, publicClient, admin, buyer } = await deployFixture();

    const pauseHash = await gateway.write.pause({
      account: admin.account.address,
    });
    await publicClient.waitForTransactionReceipt({ hash: pauseHash });

    await assert.rejects(async () => {
      await gateway.write.depositFunds({
        account: buyer.account.address,
        value: DEPOSIT_AMOUNT,
      });
    });
  });
});