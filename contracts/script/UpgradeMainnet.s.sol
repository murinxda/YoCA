// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/YoCAExecutor.sol";

contract UpgradeMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxy = vm.envAddress("YOCA_PROXY");

        vm.startBroadcast(deployerPrivateKey);

        YoCAExecutor newImpl = new YoCAExecutor();
        YoCAExecutor(proxy).upgradeToAndCall(address(newImpl), "");

        vm.stopBroadcast();

        console.log("=== Base Mainnet Upgrade ===");
        console.log("Proxy:              ", proxy);
        console.log("New implementation: ", address(newImpl));
    }
}
