// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AutomationCompatibleInterface} from "./interfaces/IAutomationCompatible.sol";
import {AggregatorV3Interface} from "./interfaces/IAggregatorV3.sol";

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface IWETH {
    function withdraw(uint wad) external;
    function deposit() external payable;
}

contract DCAVault is Ownable2Step, ReentrancyGuard, Pausable, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    // --- State ---
    mapping(address => uint256) public userShares;
    uint256 public totalShares;
    uint256 public totalUSDCDeposited;
    uint256 public lastDCABlock;
    uint256 public dcaIntervalBlocks;
    uint256 public dcaPercentage;
    uint256 public slippageBps; // e.g. 50 = 0.5%

    // --- ETH Accounting (accumulator pattern) ---
    uint256 public ethPerShare; // scaled by 1e27
    mapping(address => uint256) public userETHCompensated;
    uint256 public totalETHAccumulated;

    address public immutable usdc;
    address public immutable weth;
    address public immutable router;
    AggregatorV3Interface public immutable priceFeed;

    uint256 public constant PRICE_DECIMALS = 8;
    uint256 public constant STALENESS_THRESHOLD = 86400; // 24 hours

    // --- Events ---
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event DCAExecuted(uint256 swapAmount, uint256 ethReceived, uint256 blockNumber);
    event DCAIntervalUpdated(uint256 oldInterval, uint256 newInterval);
    event DCAPercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event SlippageUpdated(uint256 oldSlippage, uint256 newSlippage);
    event ETHWithdrawn(address indexed user, uint256 ethAmount);

    constructor(
        address _usdc,
        address _weth,
        address _router,
        uint256 _dcaIntervalBlocks,
        uint256 _dcaPercentage,
        address _priceFeed
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "DCAVault: usdc is zero address");
        require(_weth != address(0), "DCAVault: weth is zero address");
        require(_router != address(0), "DCAVault: router is zero address");
        require(_dcaPercentage <= 5000, "DCAVault: percentage too high");
        require(_priceFeed != address(0), "DCAVault: price feed is zero address");

        usdc = _usdc;
        weth = _weth;
        router = _router;
        dcaIntervalBlocks = _dcaIntervalBlocks;
        dcaPercentage = _dcaPercentage;
        priceFeed = AggregatorV3Interface(_priceFeed);
        slippageBps = 200; // ponytail: 2% default, owner can adjust
    }

    receive() external payable {}

    // --- Core Functions ---

    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "deposit: amount must be > 0");

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);

        uint256 shares;
        if (totalShares == 0) {
            shares = amount;
        } else {
            shares = (amount * totalShares) / totalUSDCDeposited;
        }

        userShares[msg.sender] += shares;
        totalShares += shares;
        totalUSDCDeposited += amount;

        // ponytail: sync ETH debt — new shares shouldn't get past ETH
        userETHCompensated[msg.sender] += (shares * ethPerShare) / 1e27;

        emit Deposited(msg.sender, amount, shares);
    }

    function withdraw(uint256 sharesToBurn) external nonReentrant {
        require(sharesToBurn > 0, "withdraw: shares must be > 0");
        require(userShares[msg.sender] >= sharesToBurn, "withdraw: insufficient shares");

        uint256 ethOwed = getUserETHEarned(msg.sender);

        uint256 vaultUSDC = IERC20(usdc).balanceOf(address(this));
        // Pay out against live balance (includes donations); decrement book value only
        uint256 usdcAmount = (sharesToBurn * vaultUSDC) / totalShares;
        uint256 bookAmount = (sharesToBurn * totalUSDCDeposited) / totalShares;

        // CEI: update state before external calls
        // 1. Claim pending ETH (sets compensated to current gross)
        if (ethOwed > 0) {
            userETHCompensated[msg.sender] += ethOwed;
        }
        // 2. Remove ETH entitlement for burned shares
        userETHCompensated[msg.sender] -= (sharesToBurn * ethPerShare) / 1e27;
        // 3. Burn shares
        userShares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;
        totalUSDCDeposited -= bookAmount;

        IERC20(usdc).safeTransfer(msg.sender, usdcAmount);

        if (ethOwed > 0) {
            uint256 vaultETH = address(this).balance;
            if (ethOwed > vaultETH) ethOwed = vaultETH;
            (bool sent, ) = payable(msg.sender).call{value: ethOwed}("");
            require(sent, "withdraw: ETH transfer failed");
        }

        emit Withdrawn(msg.sender, usdcAmount, sharesToBurn);
    }

    function executeDCA() external nonReentrant whenNotPaused {
        uint256 swapAmount = (totalUSDCDeposited * dcaPercentage) / 10000;
        require(swapAmount > 0, "executeDCA: swap amount is 0");
        require(block.number >= lastDCABlock + dcaIntervalBlocks, "executeDCA: interval not reached");

        _executeSwap(swapAmount);
    }

    // --- Chainlink Automation ---

    function checkUpkeep(bytes calldata)
        external view override returns (bool upkeepNeeded, bytes memory performData)
    {
        if (paused()) return (false, bytes("paused"));
        if (block.number < lastDCABlock + dcaIntervalBlocks) return (false, bytes("too soon"));
        if (totalUSDCDeposited == 0) return (false, bytes("no deposits"));

        uint256 swapAmount = (totalUSDCDeposited * dcaPercentage) / 10000;
        if (swapAmount == 0) return (false, bytes("swap amount zero"));
        if (IERC20(usdc).balanceOf(address(this)) < swapAmount) return (false, bytes("insufficient balance"));

        upkeepNeeded = true;
        performData = abi.encode(swapAmount);
    }

    function performUpkeep(bytes calldata) external override nonReentrant whenNotPaused {
        // ponytail: re-validate on-chain — checkUpkeep is a view, can be stale or manipulated
        require(block.number >= lastDCABlock + dcaIntervalBlocks, "performUpkeep: interval not reached");
        if (totalUSDCDeposited == 0) revert("performUpkeep: no deposits");

        uint256 swapAmount = (totalUSDCDeposited * dcaPercentage) / 10000;
        require(swapAmount > 0, "performUpkeep: swap amount zero");
        require(IERC20(usdc).balanceOf(address(this)) >= swapAmount, "performUpkeep: insufficient balance");

        _executeSwap(swapAmount);
    }

    // --- Internal ---

    function _executeSwap(uint256 swapAmount) internal {
        require(swapAmount > 0, "swap amount zero");
        require(IERC20(usdc).balanceOf(address(this)) >= swapAmount, "insufficient balance");

        uint256 amountOutMin = _getAmountOutMin(swapAmount);

        address[] memory path = new address[](2);
        path[0] = usdc;
        path[1] = weth;

        IERC20(usdc).forceApprove(router, swapAmount);

        uint[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            swapAmount,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 15
        );

        IWETH(weth).withdraw(amounts[1]);

        // ponytail: accumulator pattern — distribute ETH proportionally to shareholders
        if (totalShares > 0) {
            ethPerShare += (amounts[1] * 1e27) / totalShares;
        }
        totalETHAccumulated += amounts[1];
        totalUSDCDeposited -= swapAmount;

        lastDCABlock = block.number;

        emit DCAExecuted(swapAmount, amounts[1], block.number);
    }

    function _getAmountOutMin(uint256 usdcAmount) internal view returns (uint256) {
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
        require(price > 0, "invalid price");
        require(block.timestamp - updatedAt < STALENESS_THRESHOLD, "stale price");
        require(answeredInRound >= roundId, "round not complete");

        // ponytail: USDC(6) → WETH(18), price is ETH/USD(8)
        // ethOut = usdcAmount * 1e20 / price (before slippage)
        uint256 raw = usdcAmount * 1e20 * (10000 - slippageBps) / (uint256(price) * 10000);
        return raw;
    }

    // --- Admin Functions ---

    function setDCAIntervalBlocks(uint256 newInterval) external onlyOwner {
        require(newInterval > 0, "DCAVault: interval must be > 0");
        uint256 old = dcaIntervalBlocks;
        dcaIntervalBlocks = newInterval;
        emit DCAIntervalUpdated(old, newInterval);
    }

    function setDCAPercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage <= 5000, "DCAVault: percentage too high");
        uint256 old = dcaPercentage;
        dcaPercentage = newPercentage;
        emit DCAPercentageUpdated(old, newPercentage);
    }

    function setSlippageBps(uint256 _slippageBps) external onlyOwner {
        require(_slippageBps <= 1000, "DCAVault: max 10% slippage");
        uint256 old = slippageBps;
        slippageBps = _slippageBps;
        emit SlippageUpdated(old, _slippageBps);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Views ---

    function getUserUSDCBalance(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        uint256 vaultUSDC = IERC20(usdc).balanceOf(address(this));
        return (userShares[user] * vaultUSDC) / totalShares;
    }

    function getUserETHEarned(address user) public view returns (uint256) {
        uint256 gross = (userShares[user] * ethPerShare) / 1e27;
        if (gross <= userETHCompensated[user]) return 0;
        return gross - userETHCompensated[user];
    }

    // --- ETH Withdrawal ---

    function withdrawETH() external nonReentrant {
        uint256 ethOwed = getUserETHEarned(msg.sender);
        require(ethOwed > 0, "withdrawETH: no ETH to withdraw");

        // Write off full accounting debt; clamp only the transfer (dust)
        userETHCompensated[msg.sender] += ethOwed;
        uint256 vaultETH = address(this).balance;
        uint256 toSend = ethOwed > vaultETH ? vaultETH : ethOwed;

        (bool sent, ) = payable(msg.sender).call{value: toSend}("");
        require(sent, "withdrawETH: transfer failed");

        emit ETHWithdrawn(msg.sender, toSend);
    }
}
