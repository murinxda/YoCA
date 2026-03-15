// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @title YoCADCA
/// @notice Thin execution layer for DCA swaps between Yo Protocol vault tokens on Base
contract YoCADCA {
    address public owner;
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

    error OnlyOwner();
    error OnlyKeeper();
    error RouterNotAllowed();
    error InsufficientOutput();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert OnlyKeeper();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit KeeperUpdated(address(0), address(0));
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
    ) external onlyKeeper {
        if (!allowedRouters[router]) revert RouterNotAllowed();

        IERC20 tokenInContract = IERC20(tokenIn);
        IERC20 tokenOutContract = IERC20(tokenOut);

        // 1. Transfer tokenIn from user to this contract (user must have approved this contract)
        tokenInContract.transferFrom(user, address(this), amountIn);

        // 2. Approve router to spend tokenIn
        tokenInContract.approve(router, amountIn);

        // 3. Execute swap via router
        (bool success, ) = router.call(swapData);
        require(success, "YoCADCA: swap failed");

        // 4. Check output
        uint256 amountOut = tokenOutContract.balanceOf(address(this));
        if (amountOut < minAmountOut) revert InsufficientOutput();

        // 5. Transfer tokenOut to user
        tokenOutContract.transfer(user, amountOut);

        // 6. Reset approval
        tokenInContract.approve(router, 0);

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
        IERC20(token).transfer(to, amount);
    }

    /// @notice Transfer ownership
    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
