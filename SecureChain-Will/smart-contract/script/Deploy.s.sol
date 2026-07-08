// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/WillRegistry.sol";

/// @notice Deploys WillRegistry to the configured network (e.g. Sepolia).
/// Usage:
///   forge script script/Deploy.s.sol:DeployWillRegistry \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast --verify
contract DeployWillRegistry is Script {
    function run() external returns (WillRegistry) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        WillRegistry registry = new WillRegistry();

        vm.stopBroadcast();

        console.log("WillRegistry deployed at:", address(registry));
        return registry;
    }
}
