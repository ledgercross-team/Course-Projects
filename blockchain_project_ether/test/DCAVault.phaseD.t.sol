// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {DCAVault} from "../src/DCAVault.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockWETH} from "../src/mocks/MockWETH.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";

contract DCAVaultPhaseDTest is Test {
    DCAVault vault;
    MockUSDC usdc;
    MockWETH weth;
    MockRouter router;
    MockPriceFeed feed;

    address deployer = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

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

    function _swap(uint256 ethOut) internal {
        // Ensure mock return meets oracle amountOutMin (USDC6 → WETH18, ETH/USD 8dp)
        uint256 swapAmount = (vault.totalUSDCDeposited() * vault.dcaPercentage()) / 10000;
        uint256 minOut = (swapAmount * 1e20 * (10000 - vault.slippageBps()))
            / (uint256(2000_00000000) * 10000);
        if (ethOut < minOut) ethOut = minOut;

        router.setReturnAmount(ethOut);
        vm.roll(block.number + 11);
        vault.executeDCA();
    }

    // ================================================================
    //                     ETH ACCOUNTING TESTS
    // ================================================================

    function testInitialETHState() public {
        assertEq(vault.ethPerShare(), 0);
        assertEq(vault.totalETHAccumulated(), 0);
        assertEq(vault.getUserETHEarned(alice), 0);
    }

    function testDepositSyncsETHCompensation() public {
        _deposit(alice, 1000e6);
        // No swaps happened — ethPerShare is 0, so compensation should be 0
        assertEq(vault.userETHCompensated(alice), 0);
        assertEq(vault.getUserETHEarned(alice), 0);
    }

    function testETHEarnedAfterSwap() public {
        _deposit(alice, 10000e6);
        // 10% of 10000 USDC at $2000 = 0.5 ETH oracle fair value
        _swap(0.5 ether);

        assertEq(vault.totalETHAccumulated(), 0.5 ether);
        assertGt(vault.ethPerShare(), 0);
        assertGt(vault.getUserETHEarned(alice), 0);
    }

    function testSingleUserGetsAllETH() public {
        _deposit(alice, 10000e6);
        _swap(0.5 ether);

        // Alice is only depositor — she gets 100% of ETH
        assertEq(vault.getUserETHEarned(alice), 0.5 ether);
    }

    function testMultiUserProportionalETH() public {
        // Alice 75%, Bob 25%
        _deposit(alice, 3000e6);
        _deposit(bob, 1000e6);

        // 10% of 4000 USDC at $2000 = 0.2 ETH
        _swap(0.2 ether);

        uint256 aliceETH = vault.getUserETHEarned(alice);
        uint256 bobETH = vault.getUserETHEarned(bob);

        // Alice ~75%, Bob ~25% (rounding favors vault)
        assertApproxEqRel(aliceETH, 0.15 ether, 0.01e18); // ~1% tolerance
        assertApproxEqRel(bobETH, 0.05 ether, 0.01e18);

        // Total distributed <= total accumulated (rounding)
        assertLe(aliceETH + bobETH, vault.totalETHAccumulated());
    }

    // ================================================================
    //                     ETH WITHDRAWAL TESTS
    // ================================================================

    function testWithdrawETH() public {
        _deposit(alice, 10000e6);
        _swap(0.5 ether);

        uint256 aliceETHBefore = alice.balance;
        uint256 ethOwed = vault.getUserETHEarned(alice);

        vm.prank(alice);
        vault.withdrawETH();

        assertEq(alice.balance, aliceETHBefore + ethOwed);
        assertEq(vault.getUserETHEarned(alice), 0); // no double-dip
    }

    function testWithdrawETHIsIdempotent() public {
        _deposit(alice, 10000e6);
        _swap(0.5 ether);

        vm.startPrank(alice);
        vault.withdrawETH();

        // Second call reverts — can't double-dip
        vm.expectRevert("withdrawETH: no ETH to withdraw");
        vault.withdrawETH();
        vm.stopPrank();
    }

    function testWithdrawETHRevertsWhenNoETH() public {
        _deposit(alice, 10000e6);
        // No swap — no ETH

        vm.prank(alice);
        vm.expectRevert("withdrawETH: no ETH to withdraw");
        vault.withdrawETH();
    }

    function testWithdrawIncludesETH() public {
        _deposit(alice, 10000e6);
        _swap(0.5 ether);

        uint256 aliceETHBefore = alice.balance;
        uint256 aliceUSDCBefore = usdc.balanceOf(alice);

        uint256 shares = vault.userShares(alice);
        vm.prank(alice);
        vault.withdraw(shares);

        assertGt(usdc.balanceOf(alice), aliceUSDCBefore); // got USDC
        assertGt(alice.balance, aliceETHBefore); // got ETH
    }

    function testWithdrawUSDCOnly() public {
        _deposit(alice, 10000e6);
        _swap(0.5 ether);

        uint256 aliceETHBefore = alice.balance;
        uint256 aliceUSDCBefore = usdc.balanceOf(alice);

        // withdraw 50% of shares — gets 50% USDC + 50% ETH
        uint256 shares = vault.userShares(alice);
        vm.prank(alice);
        vault.withdraw(shares / 2);

        assertGt(usdc.balanceOf(alice), aliceUSDCBefore);
        assertGt(alice.balance, aliceETHBefore);
    }

    // ================================================================
    //                     DEPOSIT AFTER SWAP (ANTI-DILUTION)
    // ================================================================

    function testDepositAfterSwapDoesntGetPastETH() public {
        _deposit(alice, 10000e6);
        _swap(0.5 ether); // Alice gets 100% of this ETH

        // Bob deposits AFTER swap
        _deposit(bob, 5000e6);

        // Bob should get 0 ETH from the past swap
        assertEq(vault.getUserETHEarned(bob), 0);

        // Alice still gets her 0.5 ETH
        assertEq(vault.getUserETHEarned(alice), 0.5 ether);
    }

    function testNewDepositorGetsFutureSwapsOnly() public {
        _deposit(alice, 10000e6);
        _swap(0.5 ether); // swap #1 — Alice gets 100%

        _deposit(bob, 10000e6); // Bob joins

        // After bob joins, 10% of ~19k USDC needs ~0.95 ETH min — helper bumps
        _swap(0.5 ether); // swap #2 — Alice and Bob share

        uint256 aliceETH = vault.getUserETHEarned(alice);
        uint256 bobETH = vault.getUserETHEarned(bob);

        // Alice was present for both swaps, Bob only for swap #2
        assertGt(aliceETH, bobETH);
        assertGt(bobETH, 0);
        assertLe(aliceETH + bobETH, vault.totalETHAccumulated());
    }

    // ================================================================
    //                     MULTI-SWAP ACCUMULATION
    // ================================================================

    function testMultipleSwapsAccumulate() public {
        _deposit(alice, 10000e6);

        _swap(0.5 ether); // swap 1
        _swap(0.5 ether); // swap 2
        _swap(0.5 ether); // swap 3

        // Alice gets all ETH (only depositor)
        assertEq(vault.totalETHAccumulated(), 1.5 ether);
        assertApproxEqRel(vault.getUserETHEarned(alice), 1.5 ether, 0.01e18);
    }

    // ================================================================
    //                     ROUNDING / DUST
    // ================================================================

    function testRoundingFavorsVault() public {
        _deposit(alice, 3000e6);
        _deposit(bob, 1000e6);

        _swap(0.2 ether);

        uint256 aliceETH = vault.getUserETHEarned(alice);
        uint256 bobETH = vault.getUserETHEarned(bob);

        // Total claimed <= total accumulated (rounding down)
        assertLe(aliceETH + bobETH, vault.totalETHAccumulated());
    }

    function testETHDustIsNegligible() public {
        // Deposit and withdraw multiple times — dust should be minimal
        for (uint256 i = 0; i < 5; i++) {
            _deposit(alice, 1000e6);
            // 10% of 1000 USDC at $2000 = 0.05 ETH
            _swap(0.05 ether);

            vm.prank(alice);
            vault.withdrawETH();
        }

        // Vault should retain < 1 wei of ETH dust per user
        assertLt(address(vault).balance, 10 wei);
    }

    // ================================================================
    //                     VIEW FUNCTION
    // ================================================================

    function testGetUserValue() public {
        _deposit(alice, 10000e6);
        _swap(0.5 ether);

        uint256 usdcBalance = vault.getUserUSDCBalance(alice);
        uint256 ethEarned = vault.getUserETHEarned(alice);

        assertGt(usdcBalance, 0);
        assertGt(ethEarned, 0);
    }
}
