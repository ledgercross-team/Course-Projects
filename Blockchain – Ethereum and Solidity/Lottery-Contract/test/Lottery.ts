import { expect } from "chai";
import { network } from "hardhat";
import { Contract, Signer } from "ethers";

interface ILottery {
  manager(): Promise<string>;
  getPlayers(): Promise<string[]>;
  enter(overrides?: any): Promise<any>;
  pickWinner(): Promise<any>;
  connect(signer: Signer): ILottery;
  waitForDeployment(): Promise<void>;
}

type HardhatSigner = Signer & { address: string };

describe("Lottery", function () {
  let ethers: any;
  let lottery: ILottery;
  let owner: HardhatSigner;
  let player1: HardhatSigner;
  let player2: HardhatSigner;

  before(async function () {
    const networkConnection = await network.create();
    ethers = networkConnection.ethers;
  });

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const Lottery = await ethers.getContractFactory("Lottery");

    lottery = await Lottery.deploy();

    await lottery.waitForDeployment();
  });

  it("sets manager correctly", async function () {
    expect(await lottery.manager()).to.equal(owner.address);
  });

  it("allows player to enter", async function () {
    await lottery.connect(player1).enter({
      value: ethers.parseEther("0.02")
    });

    const players = await lottery.getPlayers();

    expect(players[0]).to.equal(player1.address);
  });

  it("allows multiple players to enter", async function () {
    await lottery.connect(player1).enter({
        value: ethers.parseEther("0.02")
    });

    await lottery.connect(player2).enter({
        value: ethers.parseEther("0.02")
    });

    const players = await lottery.getPlayers();

    expect(players.length).to.equal(2);
  });

  it("requires minimum ether", async function () {
    await expect(
        lottery.connect(player1).enter({
            value: ethers.parseEther("0.001")
        })
    ).to.revert(ethers);
  });

  it("only manager can pick winner", async function () {
    await expect(
        lottery.connect(player1).pickWinner()
    ).to.revert(ethers);
  });

  it("picks a winner and resets players", async function () {

    await lottery.connect(player1).enter({
        value: ethers.parseEther("0.02")
    });

    await lottery.connect(player2).enter({
        value: ethers.parseEther("0.02")
    });

    await lottery.pickWinner();

    const players = await lottery.getPlayers();

    expect(players.length).to.equal(0);
  });
});