// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/YoCADCA.sol";
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockYoVault.sol";
import "../src/mocks/MockSwapRouter.sol";

contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock underlying assets
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 eurc = new MockERC20("Euro Coin", "EURC", 6);
        MockERC20 weth = new MockERC20("Wrapped Ether", "WETH", 18);
        MockERC20 cbbtc = new MockERC20("Coinbase BTC", "cbBTC", 8);

        // Deploy mock Yo vaults (ERC-4626)
        MockYoVault yoUSD = new MockYoVault(address(usdc), "Yo USD", "yoUSD");
        MockYoVault yoEUR = new MockYoVault(address(eurc), "Yo EUR", "yoEUR");
        MockYoVault yoETH = new MockYoVault(address(weth), "Yo ETH", "yoETH");
        MockYoVault yoBTC = new MockYoVault(address(cbbtc), "Yo BTC", "yoBTC");

        // Deploy mock swap router (simulates DEX aggregator)
        MockSwapRouter router = new MockSwapRouter();

        // Set exchange rates (approximate real-world rates for testing)
        // yoUSD <-> yoETH: 1 ETH ~ 2000 USD
        router.setRate(address(yoUSD), address(yoETH), 1, 2000);    // 1 yoUSD -> 0.0005 yoETH
        router.setRate(address(yoETH), address(yoUSD), 2000, 1);    // 1 yoETH -> 2000 yoUSD

        // yoUSD <-> yoBTC: 1 BTC ~ 50000 USD
        router.setRate(address(yoUSD), address(yoBTC), 1, 50000);   // 1 yoUSD -> 0.00002 yoBTC
        router.setRate(address(yoBTC), address(yoUSD), 50000, 1);   // 1 yoBTC -> 50000 yoUSD

        // yoEUR <-> yoETH: 1 ETH ~ 1850 EUR
        router.setRate(address(yoEUR), address(yoETH), 1, 1850);
        router.setRate(address(yoETH), address(yoEUR), 1850, 1);

        // yoEUR <-> yoBTC: 1 BTC ~ 46000 EUR
        router.setRate(address(yoEUR), address(yoBTC), 1, 46000);
        router.setRate(address(yoBTC), address(yoEUR), 46000, 1);

        // Deploy YoCADCA
        YoCADCA dca = new YoCADCA();
        dca.setKeeper(deployer);
        dca.setRouterAllowed(address(router), true);

        vm.stopBroadcast();

        // Output addresses for easy copy-paste
        console.log("");
        console.log("========================================");
        console.log("  Base Sepolia Testnet Deployment");
        console.log("========================================");
        console.log("");
        console.log("Underlying tokens:");
        console.log("  USDC:  ", address(usdc));
        console.log("  EURC:  ", address(eurc));
        console.log("  WETH:  ", address(weth));
        console.log("  cbBTC: ", address(cbbtc));
        console.log("");
        console.log("Yo vault mocks:");
        console.log("  yoUSD: ", address(yoUSD));
        console.log("  yoEUR: ", address(yoEUR));
        console.log("  yoETH: ", address(yoETH));
        console.log("  yoBTC: ", address(yoBTC));
        console.log("");
        console.log("Infrastructure:");
        console.log("  Router:  ", address(router));
        console.log("  YoCADCA: ", address(dca));
        console.log("");
        console.log("--- Copy into .env ---");
        console.log("");

        // Log env-ready lines (forge console.log can't do string concat,
        // so we log each address and the user copies them next to the keys)
        console.log("NEXT_PUBLIC_MOCK_YOUSD=", address(yoUSD));
        console.log("NEXT_PUBLIC_MOCK_YOEUR=", address(yoEUR));
        console.log("NEXT_PUBLIC_MOCK_YOETH=", address(yoETH));
        console.log("NEXT_PUBLIC_MOCK_YOBTC=", address(yoBTC));
        console.log("NEXT_PUBLIC_MOCK_SWAP_ROUTER=", address(router));
        console.log("NEXT_PUBLIC_YOCA_CONTRACT=", address(dca));
    }
}
