import { network } from "hardhat";

async function main() {
    const { ethers } = await network.create();
    const Lottery = await ethers.getContractFactory("Lottery");

    console.log("Deploying contract...");

    const lottery = await Lottery.deploy();

    await lottery.waitForDeployment();

    console.log(
        "Lottery deployed to:",
        await lottery.getAddress()
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });