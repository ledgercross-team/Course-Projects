// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MarketFactory} from "../src/MarketFactory.sol";

/// @notice Deploys collateral + factory and seeds a few demo markets.
/// Usage: forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        MockUSDC usdc = new MockUSDC();
        MarketFactory factory = new MarketFactory();

        uint256 liq = 5000e6; // 5000 mUSDC seeded per demo market
        usdc.mint(msg.sender, liq * 3);
        usdc.approve(address(factory), liq * 3);

        uint256 close = block.timestamp + 30 days;
        factory.createMarket(usdc, "Will ETH close above $5,000 by month end?", close, address(0), liq);
        factory.createMarket(usdc, "Will BTC make a new all-time high this month?", close, address(0), liq);
        factory.createMarket(usdc, "Will the Fed cut rates at the next meeting?", close, address(0), liq);

        vm.stopBroadcast();

        console.log("MockUSDC:      ", address(usdc));
        console.log("MarketFactory: ", address(factory));
    }
}
