// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

/// @title YoCAExecutor
/// @notice Thin execution layer for DCA swaps between Yo Protocol vault tokens on Base
/// @custom:oz-upgrades
contract YoCAExecutor is OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    address public keeper;
    mapping(address => bool) public allowedRouters;

    event DCAExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);
    event RouterUpdated(address indexed router, bool allowed);
    event TokensRescued(address indexed token, address indexed to, uint256 amount);

    error OnlyKeeper();
    error RouterNotAllowed();
    error InsufficientOutput();

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert OnlyKeeper();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
    }

    /// @notice Execute a DCA swap for a user
    /// @param user The user receiving the output tokens
    /// @param tokenIn Input token (e.g., yoUSD)
    /// @param tokenOut Output token (e.g., yoETH)
    /// @param amountIn Amount of tokenIn to swap
    /// @param minAmountOut Minimum amount of tokenOut to receive
    /// @param router DEX aggregator router address
    /// @param swapData Calldata from DEX aggregator API
    function executeDCA(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address router,
        bytes calldata swapData
    ) external onlyKeeper nonReentrant {
        if (!allowedRouters[router]) revert RouterNotAllowed();

        IERC20 tokenInContract = IERC20(tokenIn);
        IERC20 tokenOutContract = IERC20(tokenOut);

        tokenInContract.safeTransferFrom(user, address(this), amountIn);
        tokenInContract.forceApprove(router, amountIn);

        uint256 balanceBefore = tokenOutContract.balanceOf(address(this));

        (bool success, ) = router.call(swapData);
        require(success, "YoCAExecutor: swap failed");

        uint256 amountOut = tokenOutContract.balanceOf(address(this)) - balanceBefore;
        if (amountOut < minAmountOut) revert InsufficientOutput();

        tokenOutContract.safeTransfer(user, amountOut);
        tokenInContract.forceApprove(router, 0);

        emit DCAExecuted(user, tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice Set the keeper address (backend wallet that executes DCA)
    function setKeeper(address newKeeper) external onlyOwner {
        address oldKeeper = keeper;
        keeper = newKeeper;
        emit KeeperUpdated(oldKeeper, newKeeper);
    }

    /// @notice Whitelist or remove a DEX router
    function setRouterAllowed(address router, bool allowed) external onlyOwner {
        allowedRouters[router] = allowed;
        emit RouterUpdated(router, allowed);
    }

    /// @notice Rescue stuck tokens (safety function)
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit TokensRescued(token, to, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
