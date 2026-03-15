// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/YoCADCA.sol";

contract DeployMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Set these before deploying
        address keeper = vm.envAddress("KEEPER_ADDRESS");
        address router1inch = vm.envOr("ROUTER_1INCH", address(0)); // 0x1111111254EEB25477B68fb85Ed929f73A960582
        address router0x = vm.envOr("ROUTER_0X", address(0));

        vm.startBroadcast(deployerPrivateKey);

        YoCADCA dca = new YoCADCA();
        dca.setKeeper(keeper);

        if (router1inch != address(0)) {
            dca.setRouterAllowed(router1inch, true);
        }
        if (router0x != address(0)) {
            dca.setRouterAllowed(router0x, true);
        }

        vm.stopBroadcast();

        console.log("=== Base Mainnet Deployment ===");
        console.log("YoCADCA: ", address(dca));
        console.log("Keeper:  ", keeper);
    }
}
