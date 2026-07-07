// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PredictionMarket} from "./PredictionMarket.sol";

/// @notice Deploys prediction markets and keeps a registry the frontend reads.
contract MarketFactory {
    using SafeERC20 for IERC20;

    address[] public markets;

    event MarketCreated(address indexed market, address indexed creator, string question, uint256 closeTime);

    error ZeroLiquidity();
    error CloseInPast();

    /// @param resolver who reports the outcome; pass address(0) to use the creator.
    /// @param liquidity initial collateral seeded into both sides. Caller must approve this factory first.
    function createMarket(
        IERC20 collateral,
        string calldata question,
        uint256 closeTime,
        address resolver,
        uint256 liquidity
    ) external returns (address market) {
        if (liquidity == 0) revert ZeroLiquidity();
        if (closeTime <= block.timestamp) revert CloseInPast();

        PredictionMarket m = new PredictionMarket(
            collateral, question, closeTime, resolver == address(0) ? msg.sender : resolver, msg.sender, liquidity
        );
        // Back the seeded reserves with real collateral (pull from creator).
        collateral.safeTransferFrom(msg.sender, address(m), liquidity);

        market = address(m);
        markets.push(market);
        emit MarketCreated(market, msg.sender, question, closeTime);
    }

    function allMarkets() external view returns (address[] memory) {
        return markets;
    }

    function marketCount() external view returns (uint256) {
        return markets.length;
    }
}
