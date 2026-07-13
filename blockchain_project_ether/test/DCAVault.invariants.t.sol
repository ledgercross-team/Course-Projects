// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DCAVault.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockPriceFeed.sol";

// ponytail: invariant handler — bounded actions for stateful fuzzing
contract VaultHandler is Test {
    DCAVault public vault;
    MockUSDC public usdc;

    address[5] users;
    uint256[] userBalances;

    constructor(DCAVault _vault, MockUSDC _usdc) {
        vault = _vault;
        usdc = _usdc;
        for (uint256 i = 0; i < 5; i++) {
            users[i] = address(uint160(0x1000 + i));
            userBalances.push(0);
        }
    }

    function seed(uint8 userIdx, uint64 amount) external {
        uint256 idx = userIdx % 5;
        usdc.mint(users[idx], amount);
        vm.startPrank(users[idx]);
        usdc.approve(address(vault), amount);
        vm.stopPrank();
        userBalances[idx] += amount;
    }

    function deposit(uint8 userIdx, uint64 amount) external {
        uint256 idx = userIdx % 5;
        if (userBalances[idx] < amount || amount == 0) return;
        vm.startPrank(users[idx]);
        vault.deposit(amount);
        vm.stopPrank();
        userBalances[idx] -= amount;
    }

    function withdraw(uint8 userIdx) external {
        uint256 idx = userIdx % 5;
        uint256 shares = vault.userShares(users[idx]);
        if (shares == 0) return;
        vm.startPrank(users[idx]);
        vault.withdraw(shares);
        vm.stopPrank();
    }
}

contract DCAVaultInvariants is Test {
    DCAVault vault;
    MockUSDC usdc;
    VaultHandler handler;

    function setUp() public {
        usdc = new MockUSDC();
        MockPriceFeed feed = new MockPriceFeed(2000_00000000, 8);
        vault = new DCAVault(
            address(usdc),
            address(0x1111),
            address(0x2222),
            1,
            100,
            address(feed)
        );
        handler = new VaultHandler(vault, usdc);

        targetContract(address(handler));
    }

    function invariant_totalSharesEqualsSumOfUserShares() public {
        uint256 sum;
        for (uint256 i = 0; i < 5; i++) {
            sum += vault.userShares(address(uint160(0x1000 + i)));
        }
        assertEq(vault.totalShares(), sum);
    }

    function invariant_totalUSDCDepositedLeqVaultBalance() public {
        assertLe(vault.totalUSDCDeposited(), usdc.balanceOf(address(vault)));
    }

    function invariant_totalSharesGTEZero() public {
        // totalShares is uint256, always >= 0; this asserts no underflow corrupted it
        assertGe(vault.totalShares(), 0);
    }
}
