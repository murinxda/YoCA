// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/YoCADCA.sol";
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockYoVault.sol";
import "../src/mocks/MockSwapRouter.sol";

contract YoCADCATest is Test {
    YoCADCA public dca;
    MockERC20 public usdc;
    MockERC20 public weth;
    MockYoVault public yoUSD;
    MockYoVault public yoETH;
    MockSwapRouter public router;

    address public owner;
    address public keeper;
    address public user;

    function setUp() public {
        owner = address(this);
        keeper = makeAddr("keeper");
        user = makeAddr("user");

        usdc = new MockERC20("USD Coin", "USDC", 6);
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        yoUSD = new MockYoVault(address(usdc), "Yo USD", "yoUSD");
        yoETH = new MockYoVault(address(weth), "Yo ETH", "yoETH");
        router = new MockSwapRouter();
        dca = new YoCADCA();

        // Fund assets for vaults
        usdc.mint(address(yoUSD), 1_000_000 * 1e6);
        weth.mint(address(yoETH), 1000 * 1e18);

        // Set router rate: 1 yoUSD -> 0.0005 yoETH (e.g. ~$2000/ETH)
        router.setRate(address(yoUSD), address(yoETH), 5, 10000); // 0.0005

        dca.setKeeper(keeper);
        dca.setRouterAllowed(address(router), true);

        // User deposits into yoUSD and approves DCA
        usdc.mint(user, 1000 * 1e6);
        vm.prank(user);
        usdc.approve(address(yoUSD), type(uint256).max);
        vm.prank(user);
        yoUSD.deposit(100 * 1e6, user);
        vm.prank(user);
        yoUSD.approve(address(dca), type(uint256).max);
    }

    function test_ExecuteDCA_Success() public {
        uint256 amountIn = 10 * 1e6; // 10 yoUSD
        uint256 expectedOut = (amountIn * 5) / 10000; // 0.005 yoETH
        uint256 minAmountOut = expectedOut;

        bytes memory swapData = abi.encodeWithSelector(
            MockSwapRouter.swap.selector,
            address(yoUSD),
            address(yoETH),
            amountIn,
            minAmountOut
        );

        uint256 userYoUSDBefore = yoUSD.balanceOf(user);
        uint256 userYoETHBefore = yoETH.balanceOf(user);

        vm.prank(keeper);
        dca.executeDCA(
            user,
            address(yoUSD),
            address(yoETH),
            amountIn,
            minAmountOut,
            address(router),
            swapData
        );

        assertEq(yoUSD.balanceOf(user), userYoUSDBefore - amountIn);
        assertEq(yoETH.balanceOf(user), userYoETHBefore + expectedOut);
    }

    function test_ExecuteDCA_RevertIfNotKeeper() public {
        uint256 amountIn = 10 * 1e6;
        uint256 minAmountOut = 0;
        bytes memory swapData = abi.encodeWithSelector(
            MockSwapRouter.swap.selector,
            address(yoUSD),
            address(yoETH),
            amountIn,
            minAmountOut
        );

        vm.prank(user);
        vm.expectRevert(YoCADCA.OnlyKeeper.selector);
        dca.executeDCA(
            user,
            address(yoUSD),
            address(yoETH),
            amountIn,
            minAmountOut,
            address(router),
            swapData
        );
    }

    function test_ExecuteDCA_RevertIfRouterNotAllowed() public {
        MockSwapRouter otherRouter = new MockSwapRouter();
        otherRouter.setRate(address(yoUSD), address(yoETH), 5, 10000);

        uint256 amountIn = 10 * 1e6;
        uint256 minAmountOut = 0;
        bytes memory swapData = abi.encodeWithSelector(
            MockSwapRouter.swap.selector,
            address(yoUSD),
            address(yoETH),
            amountIn,
            minAmountOut
        );

        vm.prank(keeper);
        vm.expectRevert(YoCADCA.RouterNotAllowed.selector);
        dca.executeDCA(
            user,
            address(yoUSD),
            address(yoETH),
            amountIn,
            minAmountOut,
            address(otherRouter),
            swapData
        );
    }

    function test_ExecuteDCA_RevertIfMinAmountOutNotMet() public {
        uint256 amountIn = 10 * 1e6;
        uint256 minAmountOut = 1000 * 1e18; // Unrealistically high

        bytes memory swapData = abi.encodeWithSelector(
            MockSwapRouter.swap.selector,
            address(yoUSD),
            address(yoETH),
            amountIn,
            minAmountOut
        );

        vm.prank(keeper);
        vm.expectRevert(YoCADCA.InsufficientOutput.selector);
        dca.executeDCA(
            user,
            address(yoUSD),
            address(yoETH),
            amountIn,
            minAmountOut,
            address(router),
            swapData
        );
    }

    function test_SetKeeper_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(YoCADCA.OnlyOwner.selector);
        dca.setKeeper(user);
    }

    function test_SetKeeper_Success() public {
        address newKeeper = makeAddr("newKeeper");
        vm.expectEmit(true, true, false, true);
        emit YoCADCA.KeeperUpdated(keeper, newKeeper);
        dca.setKeeper(newKeeper);
        assertEq(dca.keeper(), newKeeper);
    }

    function test_SetRouterAllowed_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(YoCADCA.OnlyOwner.selector);
        dca.setRouterAllowed(address(router), false);
    }

    function test_SetRouterAllowed_Success() public {
        vm.expectEmit(true, false, false, true);
        emit YoCADCA.RouterUpdated(address(router), false);
        dca.setRouterAllowed(address(router), false);
        assertFalse(dca.allowedRouters(address(router)));
    }

    function test_RescueTokens_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(YoCADCA.OnlyOwner.selector);
        dca.rescueTokens(address(usdc), user, 100);
    }

    function test_RescueTokens_Success() public {
        usdc.mint(address(dca), 1000);
        uint256 userBefore = usdc.balanceOf(user);
        dca.rescueTokens(address(usdc), user, 500);
        assertEq(usdc.balanceOf(user), userBefore + 500);
        assertEq(usdc.balanceOf(address(dca)), 500);
    }
}
