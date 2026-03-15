// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/YoCAExecutor.sol";

contract DeployMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address keeper = vm.envAddress("KEEPER_ADDRESS");
        address router1inch = vm.envOr("ROUTER_1INCH", address(0));
        address router0x = vm.envOr("ROUTER_0X", address(0));

        vm.startBroadcast(deployerPrivateKey);

        YoCAExecutor impl = new YoCAExecutor();

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(YoCAExecutor.initialize, (deployer))
        );

        YoCAExecutor dca = YoCAExecutor(address(proxy));
        dca.setKeeper(keeper);

        if (router1inch != address(0)) {
            dca.setRouterAllowed(router1inch, true);
        }
        if (router0x != address(0)) {
            dca.setRouterAllowed(router0x, true);
        }

        vm.stopBroadcast();

        console.log("=== Base Mainnet Deployment ===");
        console.log("Implementation:  ", address(impl));
        console.log("YoCAExecutor:    ", address(proxy));
        console.log("Keeper:          ", keeper);
    }
}
