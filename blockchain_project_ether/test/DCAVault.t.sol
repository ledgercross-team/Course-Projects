// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DCAVault.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockWETH.sol";
import "../src/mocks/MockRouter.sol";
import "../src/mocks/MockPriceFeed.sol";

contract DCAVaultTest is Test {
    DCAVault vault;
    MockUSDC usdc;
    address alice = address(0x1);
    address bob = address(0x2);

    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event DCAExecuted(uint256 swapAmount, uint256 ethReceived, uint256 blockNumber);

    function setUp() public {
        usdc = new MockUSDC();
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8); // $2000 ETH/USDC
        // ponytail: router/weth addresses are placeholders for unit tests
        // fork tests will use real Sepolia addresses
        vault = new DCAVault(
            address(usdc),
            address(0x1111), // weth placeholder
            address(0x2222), // router placeholder
            1,               // dcaIntervalBlocks = 1
            100,             // dcaPercentage = 1%
            address(feed)
        );
    }

    // --- Deposit Tests ---

    function testDepositIssuesCorrectShares() public {
        usdc.mint(alice, 1000e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(100e6);
        vm.stopPrank();

        assertEq(vault.userShares(alice), 100e6);
        assertEq(vault.totalShares(), 100e6);
        assertEq(vault.totalUSDCDeposited(), 100e6);
    }

    function testMultipleDepositors() public {
        usdc.mint(alice, 100e6);
        usdc.mint(bob, 100e6);

        vm.startPrank(alice);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6);
        vm.stopPrank();

        assertEq(vault.userShares(alice), vault.userShares(bob));
        assertEq(vault.totalShares(), 200e6);
    }

    function testDepositZeroReverts() public {
        vm.expectRevert("deposit: amount must be > 0");
        vm.prank(alice);
        vault.deposit(0);
    }

    function testProportionalSharesOnSecondDeposit() public {
        usdc.mint(alice, 300e6);
        usdc.mint(bob, 100e6);

        vm.startPrank(alice);
        usdc.approve(address(vault), 300e6);
        vault.deposit(300e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6);
        vm.stopPrank();

        // alice has 3x bob's shares
        assertEq(vault.userShares(alice), vault.userShares(bob) * 3);
    }

    // --- Withdraw Tests ---

    function testWithdrawReturnsCorrectUSDC() public {
        usdc.mint(alice, 500e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 500e6);
        vault.deposit(500e6);

        uint balanceBefore = usdc.balanceOf(alice);
        vault.withdraw(vault.userShares(alice));
        uint balanceAfter = usdc.balanceOf(alice);
        vm.stopPrank();

        assertEq(balanceAfter - balanceBefore, 500e6);
        assertEq(vault.userShares(alice), 0);
        assertEq(vault.totalShares(), 0);
        assertEq(vault.totalUSDCDeposited(), 0);
    }

    function testPartialWithdraw() public {
        usdc.mint(alice, 1000e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6);

        uint256 halfShares = vault.userShares(alice) / 2;
        vault.withdraw(halfShares);
        vm.stopPrank();

        assertEq(vault.userShares(alice), 1000e6 - halfShares);
    }

    function testWithdrawMoreThanBalanceReverts() public {
        usdc.mint(alice, 100e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6);

        vm.expectRevert("withdraw: insufficient shares");
        vault.withdraw(200e6);
        vm.stopPrank();
    }

    function testDepositWithdrawRoundTrip() public {
        usdc.mint(alice, 777e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 777e6);
        vault.deposit(777e6);

        uint shares = vault.userShares(alice);
        vault.withdraw(shares);
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), 777e6);
        assertEq(vault.totalUSDCDeposited(), 0);
        assertEq(vault.totalShares(), 0);
    }

    // --- Fuzz Tests ---

    function testFuzzDepositWithdraw(uint256 amount) public {
        vm.assume(amount > 0 && amount < 1_000_000_000e6);

        usdc.mint(alice, amount);
        vm.startPrank(alice);
        usdc.approve(address(vault), amount);
        vault.deposit(amount);

        uint shares = vault.userShares(alice);
        vault.withdraw(shares);
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), amount);
    }

    // --- getUserUSDCBalance ---

    function testGetUserUSDCBalanceAfterDeposit() public {
        usdc.mint(alice, 200e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 200e6);
        vault.deposit(200e6);
        vm.stopPrank();

        assertEq(vault.getUserUSDCBalance(alice), 200e6);
    }

    function testGetUserUSDCBalanceWithMultipleUsers() public {
        usdc.mint(alice, 300e6);
        usdc.mint(bob, 100e6);

        vm.startPrank(alice);
        usdc.approve(address(vault), 300e6);
        vault.deposit(300e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6);
        vm.stopPrank();

        assertEq(vault.getUserUSDCBalance(alice), 300e6);
        assertEq(vault.getUserUSDCBalance(bob), 100e6);
    }

    // --- executeDCA (unit: just tests revert conditions) ---

    function testExecuteDCARevertsWhenSwapAmountZero() public {
        vm.expectRevert("executeDCA: swap amount is 0");
        vault.executeDCA();
    }

    // --- Block 1: Deposit Hardened ---

    function testDepositEmitsEvent() public {
        usdc.mint(alice, 100e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 100e6);

        vm.expectEmit(true, true, true, true);
        emit Deposited(alice, 100e6, 100e6);
        vault.deposit(100e6);
        vm.stopPrank();
    }

    function testDepositMultipleTimesSameUser() public {
        usdc.mint(alice, 1000e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);

        vault.deposit(100e6);
        assertEq(vault.userShares(alice), 100e6);

        vault.deposit(200e6);
        // 200 deposited into pool of 100 → 200 shares (1:1 since total was 100)
        // new total shares = 300, totalUSDC = 300
        assertEq(vault.userShares(alice), 300e6);

        vault.deposit(300e6);
        // 300 deposited into pool of 300 → 300 shares
        assertEq(vault.userShares(alice), 600e6);
        assertEq(vault.totalShares(), 600e6);
        assertEq(vault.totalUSDCDeposited(), 600e6);
        vm.stopPrank();
    }

    function testDepositTransfersUSDCtoVault() public {
        usdc.mint(alice, 500e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 500e6);
        vault.deposit(500e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(vault)), 500e6);
        assertEq(usdc.balanceOf(alice), 0);
    }

    function testDepositWithoutApprovalReverts() public {
        usdc.mint(alice, 100e6);
        vm.prank(alice);
        vm.expectRevert("ERC20: insufficient allowance");
        vault.deposit(100e6);
    }

    // --- Block 2: Withdraw Hardened ---

    function testWithdrawEmitsEvent() public {
        usdc.mint(alice, 100e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6);

        uint256 shares = vault.userShares(alice);
        vm.expectEmit(true, true, true, true);
        emit Withdrawn(alice, 100e6, shares);
        vault.withdraw(shares);
        vm.stopPrank();
    }

    function testWithdrawZeroSharesReverts() public {
        vm.expectRevert("withdraw: shares must be > 0");
        vm.prank(alice);
        vault.withdraw(0);
    }

    function testWithdrawTransfersUSDCtoUser() public {
        usdc.mint(alice, 200e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 200e6);
        vault.deposit(200e6);

        uint256 shares = vault.userShares(alice);
        vault.withdraw(shares);
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), 200e6);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function testWithdrawSucceedsAfterDirectUSDCDonation() public {
        usdc.mint(alice, 100e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6);
        vm.stopPrank();

        // Grief / mistaken transfer: 1 wei USDC sent directly (no deposit)
        usdc.mint(address(vault), 1);

        uint256 shares = vault.userShares(alice);
        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        vault.withdraw(shares);

        // Alice receives book deposit + donated dust; ledger clears without underflow
        assertEq(usdc.balanceOf(alice), aliceBefore + 100e6 + 1);
        assertEq(vault.totalUSDCDeposited(), 0);
        assertEq(vault.totalShares(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function testWithdrawAfterMultipleDepositors() public {
        usdc.mint(alice, 300e6);
        usdc.mint(bob, 100e6);

        vm.startPrank(alice);
        usdc.approve(address(vault), 300e6);
        vault.deposit(300e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6);
        vm.stopPrank();

        // alice owns 75% of vault
        uint256 aliceShares = vault.userShares(alice);
        uint256 aliceUSDCBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        vault.withdraw(aliceShares);

        // alice gets 75% of 400 USDC = 300
        assertEq(usdc.balanceOf(alice) - aliceUSDCBefore, 300e6);
        assertEq(vault.totalShares(), vault.userShares(bob));
        assertEq(vault.totalUSDCDeposited(), 100e6);
    }

    function testFullWithdrawResetsVaultState() public {
        usdc.mint(alice, 500e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), 500e6);
        vault.deposit(500e6);

        uint256 shares = vault.userShares(alice);
        vault.withdraw(shares);
        vm.stopPrank();

        assertEq(vault.totalShares(), 0);
        assertEq(vault.totalUSDCDeposited(), 0);
        assertEq(vault.userShares(alice), 0);
    }

    // --- Block 3: Share Math Precision ---

    function testFuzzProportionalShares(uint96 amountA, uint96 amountB) public {
        vm.assume(amountA > 0 && amountB > 0);
        vm.assume(uint256(amountA) + uint256(amountB) < 1e18); // avoid overflow

        usdc.mint(alice, amountA);
        usdc.mint(bob, amountB);

        vm.startPrank(alice);
        usdc.approve(address(vault), amountA);
        vault.deposit(amountA);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), amountB);
        vault.deposit(amountB);
        vm.stopPrank();

        // shares should be proportional to deposits (1:1 on first two deposits)
        assertEq(vault.userShares(alice), uint256(amountA));
        assertEq(vault.userShares(bob), uint256(amountB));
    }

    function testFuzzDepositWithdrawManyUsers(uint64 a, uint64 b, uint64 c) public {
        vm.assume(a > 0 && b > 0 && c > 0);

        address dave = address(0x4);

        usdc.mint(alice, a);
        usdc.mint(bob, b);
        usdc.mint(dave, c);

        vm.startPrank(alice);
        usdc.approve(address(vault), a);
        vault.deposit(a);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), b);
        vault.deposit(b);
        vm.stopPrank();

        vm.startPrank(dave);
        usdc.approve(address(vault), c);
        vault.deposit(c);
        vault.withdraw(vault.userShares(dave));
        vm.stopPrank();
        assertEq(usdc.balanceOf(dave), c);

        vm.startPrank(bob);
        vault.withdraw(vault.userShares(bob));
        vm.stopPrank();
        assertGe(usdc.balanceOf(bob), b - 1);

        vm.startPrank(alice);
        vault.withdraw(vault.userShares(alice));
        vm.stopPrank();
        assertGe(usdc.balanceOf(alice), a - 1);
    }

    function testShareRoundingFavorsVault() public {
        // deposit 1 wei, then 3 wei → second depositor gets floor(3*1/1) = 3 shares
        // but with non-equal first deposits, rounding can leave dust
        usdc.mint(alice, 1);
        usdc.mint(bob, 3);

        vm.startPrank(alice);
        usdc.approve(address(vault), 1);
        vault.deposit(1);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 3);
        vault.deposit(3);
        vm.stopPrank();

        // both deposits are 1:1 since alice was first depositor
        assertEq(vault.userShares(alice), 1);
        assertEq(vault.userShares(bob), 3);

        // bob withdraws 3 shares → gets 3 USDC (3 * 4 / 4 = 3)
        uint256 bobBal = usdc.balanceOf(bob);
        vm.prank(bob);
        vault.withdraw(3);
        assertEq(usdc.balanceOf(bob) - bobBal, 3);
    }
}

// --- Block 4: executeDCA Mocked Tests ---

contract DCAVaultDCATest is Test {
    DCAVault vault;
    MockUSDC usdc;
    MockWETH weth;
    MockRouter router;
    address user = address(0x1);

    event DCAExecuted(uint256 swapAmount, uint256 ethReceived, uint256 blockNumber);

    function setUp() public {
        usdc = new MockUSDC();
        weth = new MockWETH();
        router = new MockRouter();
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        vault = new DCAVault(
            address(usdc),
            address(weth),
            address(router),
            10,  // dcaIntervalBlocks = 10
            100,  // dcaPercentage = 1%
            address(feed)
        );
        // Fund MockWETH so withdraw() can send ETH
        vm.deal(address(weth), 100 ether);
        // Roll past initial interval so first executeDCA works
        vm.roll(20);
    }

    function _deposit(uint256 amount) internal {
        usdc.mint(user, amount);
        vm.startPrank(user);
        usdc.approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();
    }

    function testExecuteDCACalculatesCorrectSwapAmount() public {
        _deposit(10000e6);
        router.setReturnAmount(1e18);

        vm.prank(address(0xBEEF));
        vault.executeDCA();

        // 1% of 10000e6 = 100e6
        assertEq(router.lastAmountIn(), 100e6);
    }

    function testExecuteDCAIntervalNotReachedReverts() public {
        _deposit(10000e6);
        router.setReturnAmount(1e18);

        vm.prank(address(0xBEEF));
        vault.executeDCA();

        // Try again immediately — should revert
        vm.expectRevert("executeDCA: interval not reached");
        vm.prank(address(0xBEEF));
        vault.executeDCA();
    }

    function testExecuteDCAAfterIntervalPasses() public {
        _deposit(10000e6);
        router.setReturnAmount(1e18);

        vm.prank(address(0xBEEF));
        vault.executeDCA();

        // Roll past interval
        vm.roll(block.number + 10);

        vm.prank(address(0xBEEF));
        vault.executeDCA();

        assertEq(router.callCount(), 2);
    }

    function testExecuteDCAUpdatesLastDCABlock() public {
        _deposit(10000e6);
        router.setReturnAmount(1e18);

        vm.prank(address(0xBEEF));
        vault.executeDCA();

        assertEq(vault.lastDCABlock(), block.number);
    }

    function testExecuteDCAEmitsEvent() public {
        _deposit(10000e6);
        router.setReturnAmount(1e18);

        vm.expectEmit(true, true, true, true);
        emit DCAExecuted(100e6, 1e18, block.number);
        vm.prank(address(0xBEEF));
        vault.executeDCA();
    }

    function testExecuteDCAApprovesRouter() public {
        _deposit(10000e6);
        router.setReturnAmount(1e18);

        vm.prank(address(0xBEEF));
        vault.executeDCA();

        assertEq(router.lastTokenIn(), address(usdc));
        assertEq(router.lastAmountIn(), 100e6);
    }

    function testExecuteDCADecreasesUSDCIncreasesETH() public {
        _deposit(10000e6);
        router.setReturnAmount(1e18);

        uint256 vaultUSDCBefore = usdc.balanceOf(address(vault));
        uint256 vaultETHBefore = address(vault).balance;

        vm.prank(address(0xBEEF));
        vault.executeDCA();

        assertEq(usdc.balanceOf(address(vault)), vaultUSDCBefore - 100e6);
        assertEq(address(vault).balance, vaultETHBefore + 1e18);
    }

    function testExecuteDCARevertsWhenSwapAmountZero() public {
        vm.expectRevert("executeDCA: swap amount is 0");
        vault.executeDCA();
    }
}
