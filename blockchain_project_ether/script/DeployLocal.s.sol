// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DCAVault.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockWETH.sol";
import "../src/mocks/MockRouter.sol";
import "../src/mocks/MockPriceFeed.sol";

// ponytail: local Anvil simulation — deploys all mocks + vault for integration testing
contract DeployLocalScript is Script {
    function run() external {
        vm.startBroadcast();

        MockUSDC usdc = new MockUSDC();
        MockWETH weth = new MockWETH();
        MockRouter router = new MockRouter();
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);

        DCAVault vault = new DCAVault(
            address(usdc),
            address(weth),
            address(router),
            10,   // dcaIntervalBlocks
            100,   // dcaPercentage = 1%
            address(feed)
        );

        // ponytail: mock router + WETH need liquidity for executeDCA to succeed locally
        router.setReturnAmount(1 ether);
        weth.deposit{value: 100 ether}();

        // ponytail: mint test USDC to deployer for testing
        usdc.mint(msg.sender, 100_000e6);

        vm.stopBroadcast();

        console.log("MockUSDC:", address(usdc));
        console.log("MockWETH:", address(weth));
        console.log("MockRouter:", address(router));
        console.log("MockPriceFeed:", address(feed));
        console.log("DCAVault:", address(vault));
    }
}
