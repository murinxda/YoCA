// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/mocks/MockERC20.sol";

interface IVault {
    function asset() external view returns (address);
}

contract MintTestAssets is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address recipient = vm.envAddress("RECIPIENT");

        address yoUSD = vm.envAddress("NEXT_PUBLIC_MOCK_YOUSD");
        address yoEUR = vm.envAddress("NEXT_PUBLIC_MOCK_YOEUR");
        address yoETH = vm.envAddress("NEXT_PUBLIC_MOCK_YOETH");
        address yoBTC = vm.envAddress("NEXT_PUBLIC_MOCK_YOBTC");

        address usdc = IVault(yoUSD).asset();
        address eurc = IVault(yoEUR).asset();
        address weth = IVault(yoETH).asset();
        address cbbtc = IVault(yoBTC).asset();

        vm.startBroadcast(deployerKey);

        // 10,000 USDC (6 decimals)
        MockERC20(usdc).mint(recipient, 10_000e6);
        // 10,000 EURC (6 decimals)
        MockERC20(eurc).mint(recipient, 10_000e6);
        // 5 WETH (18 decimals)
        MockERC20(weth).mint(recipient, 5e18);
        // 0.2 cbBTC (8 decimals)
        MockERC20(cbbtc).mint(recipient, 0.2e8);

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("  Minted test assets to:", recipient);
        console.log("========================================");
        console.log("");
        console.log("  10,000 USDC  at", usdc);
        console.log("  10,000 EURC  at", eurc);
        console.log("  5 WETH       at", weth);
        console.log("  0.2 cbBTC    at", cbbtc);
        console.log("");
    }
}
