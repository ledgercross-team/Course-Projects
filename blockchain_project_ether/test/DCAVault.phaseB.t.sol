// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {DCAVault} from "../src/DCAVault.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockWETH} from "../src/mocks/MockWETH.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract DCAVaultPhaseBTest is Test {
    DCAVault vault;
    MockUSDC usdc;
    MockWETH weth;
    MockRouter router;

    address deployer = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockUSDC();
        weth = new MockWETH();
        router = new MockRouter();
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        vault = new DCAVault(
            address(usdc),
            address(weth),
            address(router),
            10,   // dcaIntervalBlocks
            1000,  // dcaPercentage = 10%
            address(feed)
        );
    }

    // --- Constructor Validation ---

    function testConstructorSetsOwnerToDeployer() public view {
        assertEq(vault.owner(), deployer);
    }

    function testConstructorSetsImmutables() public view {
        assertEq(vault.usdc(), address(usdc));
        assertEq(vault.weth(), address(weth));
        assertEq(vault.router(), address(router));
        assertEq(vault.dcaIntervalBlocks(), 10);
        assertEq(vault.dcaPercentage(), 1000);
    }

    function testConstructorRevertsOnZeroUSDC() public {
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        vm.expectRevert("DCAVault: usdc is zero address");
        new DCAVault(address(0), address(weth), address(router), 10, 1000, address(feed));
    }

    function testConstructorRevertsOnZeroWETH() public {
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        vm.expectRevert("DCAVault: weth is zero address");
        new DCAVault(address(usdc), address(0), address(router), 10, 1000, address(feed));
    }

    function testConstructorRevertsOnZeroRouter() public {
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        vm.expectRevert("DCAVault: router is zero address");
        new DCAVault(address(usdc), address(weth), address(0), 10, 1000, address(feed));
    }

    function testConstructorRevertsOnHighPercentage() public {
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        vm.expectRevert("DCAVault: percentage too high");
        new DCAVault(address(usdc), address(weth), address(router), 10, 5001, address(feed));
    }

    function testConstructorRevertsOnZeroPriceFeed() public {
        vm.expectRevert("DCAVault: price feed is zero address");
        new DCAVault(address(usdc), address(weth), address(router), 10, 1000, address(0));
    }

    function testConstructorAccepts50Percent() public {
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        DCAVault v = new DCAVault(address(usdc), address(weth), address(router), 10, 5000, address(feed));
        assertEq(v.dcaPercentage(), 5000);
    }

    // --- Admin Access Control ---

    function testSetDCAIntervalOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        vault.setDCAIntervalBlocks(20);
    }

    function testSetDCAPercentageOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        vault.setDCAPercentage(2000);
    }

    function testPauseOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        vault.pause();
    }

    function testUnpauseOnlyOwner() public {
        vault.pause();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        vault.unpause();
    }

    // --- Admin Functionality ---

    function testSetDCAIntervalUpdatesValue() public {
        vault.setDCAIntervalBlocks(20);
        assertEq(vault.dcaIntervalBlocks(), 20);
    }

    function testSetDCAIntervalEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit DCAVault.DCAIntervalUpdated(10, 20);
        vault.setDCAIntervalBlocks(20);
    }

    function testSetDCAPercentageUpdatesValue() public {
        vault.setDCAPercentage(2000);
        assertEq(vault.dcaPercentage(), 2000);
    }

    function testSetDCAPercentageEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit DCAVault.DCAPercentageUpdated(1000, 2000);
        vault.setDCAPercentage(2000);
    }

    function testSetDCAPercentageRevertsAbove5000() public {
        vm.expectRevert("DCAVault: percentage too high");
        vault.setDCAPercentage(5001);
    }

    // --- Pause/Unpause ---

    function testDepositRevertsWhenPaused() public {
        vault.pause();
        usdc.mint(alice, 1000e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.deposit(1000e6);
        vm.stopPrank();
    }

    function testExecuteDCARevertsWhenPaused() public {
        usdc.mint(deployer, 10000e6);
        usdc.approve(address(vault), 10000e6);
        vault.deposit(10000e6);

        vault.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.executeDCA();
    }

    function testWithdrawWorksWhenPaused() public {
        usdc.mint(deployer, 1000e6);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6);

        vault.pause();
        uint256 shares = vault.userShares(deployer);
        vault.withdraw(shares);
        assertEq(vault.userShares(deployer), 0);
    }

    function testUnpauseAllowsDeposits() public {
        vault.pause();
        vault.unpause();

        usdc.mint(alice, 1000e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6);
        vm.stopPrank();
        assertEq(vault.userShares(alice), 1000e6);
    }

    function testUnpauseEmitsEvent() public {
        vault.pause();
        vm.expectEmit(false, false, false, false);
        emit Pausable.Unpaused(deployer);
        vault.unpause();
    }

    function testPauseEmitsEvent() public {
        vm.expectEmit(false, false, false, false);
        emit Pausable.Paused(deployer);
        vault.pause();
    }

    // --- Ownership Transfer ---

    function testTransferOwnershipStartsTransfer() public {
        vault.transferOwnership(alice);
        assertEq(vault.pendingOwner(), alice);
        assertEq(vault.owner(), deployer);
    }

    function testTransferOwnershipEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit Ownable2Step.OwnershipTransferStarted(deployer, alice);
        vault.transferOwnership(alice);
    }

    function testAcceptOwnershipCompletesTransfer() public {
        vault.transferOwnership(alice);
        vm.prank(alice);
        vault.acceptOwnership();
        assertEq(vault.owner(), alice);
        assertEq(vault.pendingOwner(), address(0));
    }

    function testAcceptOwnershipOnlyPendingOwner() public {
        vault.transferOwnership(alice);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", bob));
        vault.acceptOwnership();
    }

    function testNewOwnerCanSetAdminParams() public {
        vault.transferOwnership(alice);
        vm.prank(alice);
        vault.acceptOwnership();

        vm.prank(alice);
        vault.setDCAIntervalBlocks(50);
        assertEq(vault.dcaIntervalBlocks(), 50);
    }

    function testOldOwnerCannotAdminAfterTransfer() public {
        vault.transferOwnership(alice);
        vm.prank(alice);
        vault.acceptOwnership();

        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", deployer));
        vault.setDCAIntervalBlocks(50);
    }
}
