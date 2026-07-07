// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract PredictionMarketTest is Test {
    MockUSDC usdc;
    MarketFactory factory;
    PredictionMarket market;

    address creator = address(0xC0FFEE);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256 constant LIQ = 1000e6; // 1000 mUSDC seed
    uint256 closeTime;

    function setUp() public {
        usdc = new MockUSDC();
        factory = new MarketFactory();
        closeTime = block.timestamp + 7 days;

        usdc.mint(creator, LIQ);
        vm.startPrank(creator);
        usdc.approve(address(factory), LIQ);
        market = PredictionMarket(
            factory.createMarket(usdc, "Will ETH be above $5000 on close?", closeTime, address(0), LIQ)
        );
        vm.stopPrank();

        usdc.mint(alice, 10_000e6);
        usdc.mint(bob, 10_000e6);
    }

    function test_SeededAtEvenOdds() public view {
        assertEq(market.reserveYes(), LIQ);
        assertEq(market.reserveNo(), LIQ);
        assertEq(market.priceYes(), 0.5e18);
        assertEq(usdc.balanceOf(address(market)), LIQ);
    }

    function test_BuyYesRaisesYesPrice() public {
        uint256 before = market.priceYes();
        _buy(alice, true, 200e6);
        assertGt(market.priceYes(), before, "YES price should rise after buying YES");
    }

    function test_BuyGivesMoreSharesThanCollateralAtEvenOdds() public {
        // At 50/50, buying YES should return > amountIn shares (payout > cost if YES wins).
        uint256 shares = _buy(alice, true, 100e6);
        assertGt(shares, 100e6);
    }

    function test_FullLifecycle_YesWins() public {
        uint256 aliceShares = _buy(alice, true, 300e6); // Alice bets YES
        _buy(bob, false, 300e6); // Bob bets NO

        vm.warp(closeTime);
        vm.prank(creator);
        market.resolve(PredictionMarket.Outcome.YES);

        // Alice redeems her winning YES shares.
        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = market.redeem();
        assertEq(payout, aliceShares);
        assertEq(usdc.balanceOf(alice) - aliceBefore, aliceShares);

        // Bob's NO shares are worthless.
        vm.prank(bob);
        vm.expectRevert(PredictionMarket.NothingToRedeem.selector);
        market.redeem();

        // Creator recovers the winning reserve.
        vm.prank(creator);
        market.redeemLiquidity();

        // Market fully drained — solvent to the last unit.
        assertLe(usdc.balanceOf(address(market)), 0);
    }

    function test_CannotBuyAfterClose() public {
        vm.warp(closeTime);
        vm.startPrank(alice);
        usdc.approve(address(market), 100e6);
        vm.expectRevert(PredictionMarket.MarketClosed.selector);
        market.buy(true, 100e6, 0);
        vm.stopPrank();
    }

    function test_OnlyResolverResolves() public {
        vm.warp(closeTime);
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.NotResolver.selector);
        market.resolve(PredictionMarket.Outcome.YES);
    }

    function test_CannotResolveBeforeClose() public {
        vm.prank(creator);
        vm.expectRevert(PredictionMarket.MarketOpen.selector);
        market.resolve(PredictionMarket.Outcome.YES);
    }

    function testFuzz_SolventAfterArbitraryBuys(uint96 aYes, uint96 bNo) public {
        aYes = uint96(bound(aYes, 1e6, 5000e6));
        bNo = uint96(bound(bNo, 1e6, 5000e6));

        uint256 sYes = _buy(alice, true, aYes);
        uint256 sNo = _buy(bob, false, bNo);

        // Solvency invariant: collateral held == total shares on each side.
        uint256 held = usdc.balanceOf(address(market));
        assertEq(held, market.reserveYes() + sYes, "YES side insolvent");
        assertEq(held, market.reserveNo() + sNo, "NO side insolvent");
    }

    // --- helpers ---

    function _buy(address who, bool isYes, uint256 amountIn) internal returns (uint256 shares) {
        vm.startPrank(who);
        usdc.approve(address(market), amountIn);
        shares = market.buy(isYes, amountIn, 0);
        vm.stopPrank();
    }
}
