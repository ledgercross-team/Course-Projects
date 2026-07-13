// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DCAVault.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployer = vm.envUint("DEPLOYER_PRIVATE_KEY");

        // Sepolia addresses — verify these before deploying
        address usdc = vm.envAddress("SEPOLIA_USDC");
        address weth = vm.envAddress("SEPOLIA_WETH");
        address router = vm.envAddress("SEPOLIA_UNISWAP_V2_ROUTER");
        address priceFeed = vm.envAddress("SEPOLIA_PRICE_FEED");

        vm.startBroadcast(deployer);
        new DCAVault(usdc, weth, router, 50, 100, priceFeed); // 50 blocks interval, 1% swap
        vm.stopBroadcast();
    }
}
