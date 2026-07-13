// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ponytail: minimal mock for unit testing executeDCA
contract MockRouter {
    address public lastTokenIn;
    uint256 public lastAmountIn;
    uint256 public lastAmountOutMin;
    uint256 public returnAmount;
    uint256 public callCount;

    function setReturnAmount(uint256 _amount) external {
        returnAmount = _amount;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(returnAmount >= amountOutMin, "MockRouter: Insufficient output amount");

        lastTokenIn = path[0];
        lastAmountIn = amountIn;
        lastAmountOutMin = amountOutMin;
        callCount++;

        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = returnAmount;

        // Transfer input tokens from caller
        _pullTokens(path[0], msg.sender, amountIn);
        // Send output tokens to caller
        _pushTokens(path[1], to, returnAmount);
    }

    function _pullTokens(address token, address from, uint256 amount) internal {
        // Use low-level call to transferFrom
        (bool success, ) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, address(this), amount)
        );
        require(success, "MockRouter: pull failed");
    }

    function _pushTokens(address token, address to, uint256 amount) internal {
        (bool success, ) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success, "MockRouter: push failed");
    }
}
