// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Binary prediction market (CPMM)
/// @notice Fixed-product market maker over YES/NO outcome shares, settled in an ERC20 collateral.
///         Every unit of collateral deposited mints one YES + one NO share (a "complete set"),
///         so `collateralHeld == totalYesShares == totalNoShares` always holds — the market is
///         solvent by construction. After resolution, each winning share redeems for 1 collateral.
contract PredictionMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Outcome {
        UNRESOLVED,
        YES,
        NO
    }

    IERC20 public immutable collateral;
    address public immutable creator; // owns the AMM liquidity position
    address public immutable resolver; // who may report the outcome (Chainlink adapter / oracle / creator)
    uint256 public immutable closeTime; // no trading at/after this; resolvable after this
    string public question;

    uint256 public reserveYes; // YES shares held by the pool
    uint256 public reserveNo; // NO shares held by the pool

    Outcome public outcome;
    bool public resolved;
    bool public liquidityRedeemed;

    mapping(address => uint256) public balYes;
    mapping(address => uint256) public balNo;

    event Bought(address indexed buyer, bool isYes, uint256 amountIn, uint256 sharesOut);
    event Resolved(Outcome outcome);
    event Redeemed(address indexed user, uint256 payout);
    event LiquidityRedeemed(address indexed creator, uint256 payout);

    error MarketClosed();
    error MarketOpen();
    error AlreadyResolved();
    error NotResolved();
    error NotResolver();
    error BadOutcome();
    error Slippage();
    error NothingToRedeem();

    /// @dev Reserves are seeded to `liquidity` for both sides. The factory must transfer exactly
    ///      `liquidity` collateral into this contract in the same tx (backs the seeded complete sets).
    constructor(
        IERC20 _collateral,
        string memory _question,
        uint256 _closeTime,
        address _resolver,
        address _creator,
        uint256 _liquidity
    ) {
        collateral = _collateral;
        question = _question;
        closeTime = _closeTime;
        resolver = _resolver;
        creator = _creator;
        reserveYes = _liquidity;
        reserveNo = _liquidity;
    }

    /// @notice Shares received for buying `amountIn` collateral of the `isYes` side. Pure quote for the UI.
    function calcBuyShares(bool isYes, uint256 amountIn) public view returns (uint256) {
        uint256 rBuy = isYes ? reserveYes : reserveNo;
        uint256 rOther = isYes ? reserveNo : reserveYes;
        // sharesOut = (rBuy + amountIn) - k/(rOther + amountIn), preserving k = rBuy*rOther.
        return (rBuy + amountIn) - (rBuy * rOther) / (rOther + amountIn);
    }

    /// @notice YES probability in 1e18 fixed point (reserveNo / (reserveYes + reserveNo)).
    function priceYes() external view returns (uint256) {
        return (reserveNo * 1e18) / (reserveYes + reserveNo);
    }

    function buy(bool isYes, uint256 amountIn, uint256 minSharesOut) external nonReentrant returns (uint256 sharesOut) {
        if (block.timestamp >= closeTime) revert MarketClosed();
        if (resolved) revert AlreadyResolved();

        sharesOut = calcBuyShares(isYes, amountIn);
        if (sharesOut < minSharesOut) revert Slippage();

        collateral.safeTransferFrom(msg.sender, address(this), amountIn);

        // Mint a complete set (both reserves += amountIn), then hand `sharesOut` of the bought side to the user.
        if (isYes) {
            reserveYes = reserveYes + amountIn - sharesOut;
            reserveNo += amountIn;
            balYes[msg.sender] += sharesOut;
        } else {
            reserveNo = reserveNo + amountIn - sharesOut;
            reserveYes += amountIn;
            balNo[msg.sender] += sharesOut;
        }

        emit Bought(msg.sender, isYes, amountIn, sharesOut);
    }

    function resolve(Outcome _outcome) external {
        if (msg.sender != resolver) revert NotResolver();
        if (block.timestamp < closeTime) revert MarketOpen();
        if (resolved) revert AlreadyResolved();
        if (_outcome != Outcome.YES && _outcome != Outcome.NO) revert BadOutcome();

        outcome = _outcome;
        resolved = true;
        emit Resolved(_outcome);
    }

    /// @notice Redeem your winning shares 1:1 for collateral.
    function redeem() external nonReentrant returns (uint256 payout) {
        if (!resolved) revert NotResolved();

        payout = outcome == Outcome.YES ? balYes[msg.sender] : balNo[msg.sender];
        if (payout == 0) revert NothingToRedeem();

        balYes[msg.sender] = 0;
        balNo[msg.sender] = 0;
        collateral.safeTransfer(msg.sender, payout);
        emit Redeemed(msg.sender, payout);
    }

    /// @notice Creator redeems the pool's winning reserve — their LP position's final value.
    function redeemLiquidity() external nonReentrant returns (uint256 payout) {
        if (!resolved) revert NotResolved();
        if (msg.sender != creator) revert NotResolver();
        if (liquidityRedeemed) revert NothingToRedeem();

        liquidityRedeemed = true;
        payout = outcome == Outcome.YES ? reserveYes : reserveNo;
        collateral.safeTransfer(creator, payout);
        emit LiquidityRedeemed(creator, payout);
    }
}
