// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./MockERC20.sol";

/// @notice Minimal ERC-4626 vault with 1:1 share/asset ratio
contract MockYoVault is MockERC20 {
    address public asset;

    constructor(
        address asset_,
        string memory name_,
        string memory symbol_
    ) MockERC20(name_, symbol_, MockERC20(asset_).decimals()) {
        asset = asset_;
    }

    function totalAssets() public view returns (uint256) {
        return MockERC20(asset).balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        return assets; // 1:1
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return shares; // 1:1
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = previewDeposit(assets);
        MockERC20(asset).transferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        shares = previewWithdraw(assets);
        if (msg.sender != owner) {
            allowance[owner][msg.sender] -= shares;
        }
        _burn(owner, shares);
        MockERC20(asset).transfer(receiver, assets);
        return shares;
    }

    function mint(uint256 shares, address receiver) external returns (uint256 assets) {
        assets = previewMint(shares);
        MockERC20(asset).transferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        return assets;
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        assets = previewRedeem(shares);
        if (msg.sender != owner) {
            allowance[owner][msg.sender] -= shares;
        }
        _burn(owner, shares);
        MockERC20(asset).transfer(receiver, assets);
        return assets;
    }

    function previewDeposit(uint256 assets) public pure returns (uint256) {
        return assets;
    }

    function previewWithdraw(uint256 assets) public pure returns (uint256) {
        return assets;
    }

    function previewMint(uint256 shares) public pure returns (uint256) {
        return shares;
    }

    function previewRedeem(uint256 shares) public pure returns (uint256) {
        return shares;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}
