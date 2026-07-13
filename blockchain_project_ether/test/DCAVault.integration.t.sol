// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DCAVault.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockWETH.sol";
import "../src/mocks/MockRouter.sol";
import "../src/mocks/MockPriceFeed.sol";

// ponytail: local integration test — deploys full stack, runs deposit + DCA flow
contract DCAVaultIntegrationTest is Test {
    DCAVault vault;
    MockUSDC usdc;
    MockWETH weth;
    MockRouter router;
    address user = address(0x1);

    function setUp() public {
        usdc = new MockUSDC();
        weth = new MockWETH();
        router = new MockRouter();
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        vault = new DCAVault(
            address(usdc),
            address(weth),
            address(router),
            10,
            100,
            address(feed)
        );
        vm.deal(address(weth), 100 ether);
        vm.roll(20);
    }

    function testDeployLocalIntegration() public {
        // Full lifecycle: deposit → executeDCA → verify ETH received
        usdc.mint(user, 10000e6);
        vm.startPrank(user);
        usdc.approve(address(vault), 10000e6);
        vault.deposit(10000e6);
        vm.stopPrank();

        assertEq(vault.totalUSDCDeposited(), 10000e6);
        assertEq(vault.totalShares(), 10000e6);

        // Set mock router to return 1 ETH per swap
        router.setReturnAmount(1 ether);

        // Execute DCA
        vm.prank(address(0xBEEF));
        vault.executeDCA();

        // Verify: vault USDC decreased, vault has ETH
        assertEq(usdc.balanceOf(address(vault)), 9900e6);
        assertEq(address(vault).balance, 1 ether);
        assertEq(vault.lastDCABlock(), block.number);

        // User can withdraw remaining USDC
        uint256 shares = vault.userShares(user);
        uint256 expectedUSDC = vault.getUserUSDCBalance(user);
        vm.startPrank(user);
        vault.withdraw(shares);
        vm.stopPrank();
        assertEq(usdc.balanceOf(user), expectedUSDC);
    }
}
