// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./MockERC20.sol";

/// @notice Mock DEX aggregator router for testnet - simulates swaps via configurable exchange rates
contract MockSwapRouter {
    address public owner;

    // (tokenIn, tokenOut) => (rateNum, rateDen) where amountOut = amountIn * rateNum / rateDen
    mapping(address => mapping(address => uint256)) public rateNum;
    mapping(address => mapping(address => uint256)) public rateDen;

    event RateSet(address indexed tokenIn, address indexed tokenOut, uint256 rateNum, uint256 rateDen);
    event Swap(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    error OnlyOwner();
    error RateNotSet();

    modifier onlyOwner_() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setRate(
        address tokenIn,
        address tokenOut,
        uint256 rateNum_,
        uint256 rateDen_
    ) external onlyOwner_ {
        rateNum[tokenIn][tokenOut] = rateNum_;
        rateDen[tokenIn][tokenOut] = rateDen_;
        emit RateSet(tokenIn, tokenOut, rateNum_, rateDen_);
    }

    /// @notice Swap tokenIn for tokenOut. Caller must have approved this contract for tokenIn.
    /// @param tokenIn Input token (will be burned)
    /// @param tokenOut Output token (will be minted to caller)
    /// @param amountIn Amount of tokenIn to swap
    /// @param minAmountOut Minimum amount of tokenOut (ignored in mock - allows testing YoCAExecutor's check)
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external {
        minAmountOut; // silence unused param
        uint256 den = rateDen[tokenIn][tokenOut];
        if (den == 0) revert RateNotSet();

        uint256 amountOut = (amountIn * rateNum[tokenIn][tokenOut]) / den;

        MockERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        MockERC20(tokenIn).burn(address(this), amountIn);
        MockERC20(tokenOut).mint(msg.sender, amountOut);

        emit Swap(tokenIn, tokenOut, amountIn, amountOut);
    }
}
