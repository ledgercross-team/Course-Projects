// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {DCAVault} from "../src/DCAVault.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockWETH} from "../src/mocks/MockWETH.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";

contract DCAVaultPhaseCTest is Test {
    DCAVault vault;
    MockUSDC usdc;
    MockWETH weth;
    MockRouter router;
    MockPriceFeed feed;

    address deployer = address(this);
    address alice = makeAddr("alice");

    function setUp() public {
        usdc = new MockUSDC();
        weth = new MockWETH();
        router = new MockRouter();
        feed = new MockPriceFeed(2000_00000000, 8); // $2000 ETH/USDC, 8 decimals

        vault = new DCAVault(
            address(usdc),
            address(weth),
            address(router),
            10,   // dcaIntervalBlocks
            1000, // dcaPercentage = 10%
            address(feed)
        );

        vm.deal(address(weth), 100 ether);
        vm.roll(20);
    }

    // --- Helpers ---

    function _deposit(address who, uint256 amount) internal {
        usdc.mint(who, amount);
        vm.startPrank(who);
        usdc.approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();
    }

    // ================================================================
    //                     checkUpkeep TESTS
    // ================================================================

    function testCheckUpkeepReturnsFalseWhenPaused() public {
        _deposit(alice, 10000e6);
        vm.prank(deployer);
        vault.pause();

        (bool needed, ) = vault.checkUpkeep("");
        assertFalse(needed);
    }

    function testCheckUpkeepReturnsFalseBeforeInterval() public {
        _deposit(alice, 10000e6);

        // lastDCABlock = 0, interval = 10, current block ~20
        // vault was deployed at some block, deposit didn't change lastDCABlock
        // We need to check: block.number < lastDCABlock + dcaIntervalBlocks
        // After setUp, block.number = 20, lastDCABlock = 0, interval = 10
        // 20 < 0 + 10 → false, so upkeep IS needed
        // Reset to make it not needed:
        router.setReturnAmount(1 ether);
        vault.executeDCA(); // sets lastDCABlock = block.number

        (bool needed, ) = vault.checkUpkeep("");
        assertFalse(needed); // interval not reached yet
    }

    function testCheckUpkeepReturnsTrueAfterInterval() public {
        _deposit(alice, 10000e6);

        // Execute first DCA to set lastDCABlock
        router.setReturnAmount(1 ether);
        vault.executeDCA();

        // Roll past interval
        vm.roll(block.number + 11);

        (bool needed, ) = vault.checkUpkeep("");
        assertTrue(needed);
    }

    function testCheckUpkeepReturnsPerformanceData() public {
        _deposit(alice, 10000e6);

        // Execute first DCA
        router.setReturnAmount(1 ether);
        vault.executeDCA();

        // Roll past interval
        vm.roll(block.number + 11);

        (bool needed, bytes memory data) = vault.checkUpkeep("");
        assertTrue(needed);

        uint256 decoded = abi.decode(data, (uint256));
        // 10% of remaining 9000e6 (after first swap consumed 1000e6) = 900e6
        assertEq(decoded, 900e6);
    }

    function testCheckUpkeepReturnsFalseWhenEmpty() public {
        vm.roll(101);
        (bool needed, ) = vault.checkUpkeep("");
        assertFalse(needed);
    }

    function testCheckUpkeepReturnsFalseWhenInsufficientBalance() public {
        _deposit(alice, 10000e6);

        // Execute DCA to set lastDCABlock
        router.setReturnAmount(1 ether);
        vault.executeDCA();

        // Roll past interval
        vm.roll(block.number + 11);

        // Withdraw all USDC so vault has 0 USDC
        uint256 shares = vault.userShares(alice);
        vm.prank(alice);
        vault.withdraw(shares);

        (bool needed, ) = vault.checkUpkeep("");
        assertFalse(needed);
    }

    // ================================================================
    //                     performUpkeep TESTS
    // ================================================================

    function testPerformUpkeepExecutesSwap() public {
        _deposit(alice, 10000e6);

        // Execute first DCA
        router.setReturnAmount(1 ether);
        vault.executeDCA();

        // Roll past interval
        vm.roll(block.number + 11);

        // checkUpkeep
        (bool needed, bytes memory data) = vault.checkUpkeep("");
        assertTrue(needed);

        // Reset router return amount
        router.setReturnAmount(1 ether);

        // performUpkeep
        vault.performUpkeep(data);

        // Vault should have ETH
        assertGt(address(vault).balance, 0);
    }

    function testPerformUpkeepUpdatesLastDCABlock() public {
        _deposit(alice, 10000e6);

        router.setReturnAmount(1 ether);
        vault.executeDCA();

        vm.roll(block.number + 11);

        (bool needed, bytes memory data) = vault.checkUpkeep("");
        assertTrue(needed);

        router.setReturnAmount(1 ether);
        uint256 before = block.number;
        vault.performUpkeep(data);

        assertEq(vault.lastDCABlock(), before);
    }

    function testPerformUpkeepEmitsEvent() public {
        _deposit(alice, 10000e6);

        router.setReturnAmount(1 ether);
        vault.executeDCA();

        vm.roll(block.number + 11);

        (bool needed, bytes memory data) = vault.checkUpkeep("");
        assertTrue(needed);

        router.setReturnAmount(1 ether);

        vm.expectEmit(false, false, false, true);
        emit DCAVault.DCAExecuted(900e6, 1 ether, block.number);
        vault.performUpkeep(data);
    }

    function testPerformUpkeepRevertsWithZeroAmount() public {
        // ponytail: performUpkeep re-validates — no deposits → reverts before swap amount check
        vm.expectRevert("performUpkeep: no deposits");
        vault.performUpkeep(abi.encode(uint256(0)));
    }

    // ================================================================
    //                     PRICE FEED TESTS
    // ================================================================

    function testGetAmountOutMinCalculation() public {
        // At $2000 ETH/USD (8 decimals) with 0.5% slippage (50 bps):
        // ethOut = usdcAmount * 1e20 * (10000 - slippageBps) / (price * 10000)
        // First DCA swaps 10% of 10000e6 = 1000e6 USDC
        // = 1000e6 * 1e20 * 9950 / (2000e8 * 10000) = 0.4975 ETH
        uint256 expectedMin = (1000e6 * 1e20 * 9950) / (uint256(2000_00000000) * 10000);

        _deposit(alice, 10000e6);
        vault.setSlippageBps(50);

        router.setReturnAmount(1 ether);
        vault.executeDCA();

        assertEq(router.lastAmountOutMin(), expectedMin);
        assertEq(expectedMin, 0.4975 ether);
    }

    function testStalePriceFeedRevertsInPerformUpkeep() public {
        _deposit(alice, 10000e6);

        router.setReturnAmount(1 ether);
        vault.executeDCA();

        // Advance time past staleness threshold (24h)
        vm.warp(block.timestamp + 86401);

        vm.roll(block.number + 11);
        (bool needed, bytes memory data) = vault.checkUpkeep("");

        if (needed) {
            router.setReturnAmount(1 ether);
            vm.expectRevert("stale price");
            vault.performUpkeep(data);
        }
    }

    function testInvalidPriceFeedReverts() public {
        MockPriceFeed badFeed = new MockPriceFeed(0, 8);
        vm.prank(deployer);
        // Can't set price feed after construction (immutable), so test _getAmountOutMin indirectly
        // Deploy new vault with bad feed
        DCAVault badVault = new DCAVault(
            address(usdc),
            address(weth),
            address(router),
            10,
            1000,
            address(badFeed)
        );

        usdc.mint(alice, 10000e6);
        vm.startPrank(alice);
        usdc.approve(address(badVault), 10000e6);
        badVault.deposit(10000e6);
        vm.stopPrank();

        vm.roll(block.number + 11);
        router.setReturnAmount(1 ether);
        vm.expectRevert("invalid price");
        badVault.executeDCA();
    }

    // ================================================================
    //                     SLIPPAGE TESTS
    // ================================================================

    function testSetSlippageBpsUpdatesValue() public {
        vault.setSlippageBps(100);
        assertEq(vault.slippageBps(), 100);
    }

    function testSetSlippageBpsOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        vault.setSlippageBps(100);
    }

    function testSetSlippageBpsRevertsAboveMax() public {
        vm.expectRevert("DCAVault: max 10% slippage");
        vault.setSlippageBps(1001);
    }

    function testSetSlippageBpsEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit DCAVault.SlippageUpdated(200, 50);
        vault.setSlippageBps(50);
    }

    function testHigherSlippageLowersAmountOutMin() public {
        // ethOut = usdcAmount * 1e20 * (10000 - slippageBps) / (price * 10000)
        // Higher slippageBps → lower amountOutMin
        _deposit(alice, 10000e6);

        vault.setSlippageBps(0);
        router.setReturnAmount(1 ether);
        vault.executeDCA();
        uint256 minAt0Bps = router.lastAmountOutMin();

        vm.roll(block.number + 11);

        vault.setSlippageBps(500);
        router.setReturnAmount(1 ether);
        vault.executeDCA();
        uint256 minAt500Bps = router.lastAmountOutMin();

        assertGt(minAt0Bps, minAt500Bps);
        assertEq(minAt0Bps, (1000e6 * 1e20 * 10000) / (uint256(2000_00000000) * 10000));
        assertEq(minAt500Bps, (900e6 * 1e20 * 9500) / (uint256(2000_00000000) * 10000));
    }

    // ================================================================
    //                     COMBINED LIFECYCLE TEST
    // ================================================================

    function testFullAutomationLifecycle() public {
        // 1. Deposit
        _deposit(alice, 10000e6);
        assertEq(vault.totalUSDCDeposited(), 10000e6);

        // 2. First DCA (manual)
        router.setReturnAmount(1 ether);
        vault.executeDCA();
        assertGt(address(vault).balance, 0);

        // 3. Roll past interval
        vm.roll(block.number + 11);

        // 4. checkUpkeep → true
        (bool needed, bytes memory data) = vault.checkUpkeep("");
        assertTrue(needed);

        // 5. performUpkeep (Chainlink path)
        router.setReturnAmount(1 ether);
        vault.performUpkeep(data);

        // 6. Verify state
        assertGt(address(vault).balance, 1 ether);
        assertLt(usdc.balanceOf(address(vault)), 10000e6);
    }
}
