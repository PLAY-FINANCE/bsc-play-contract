// SPDX-License-Identifier: BUSL-1.1
/*
 _______   __         ______   __      __        ________  __                                                   
/       \ /  |       /      \ /  \    /  |      /        |/  |                                                  
$$$$$$$  |$$ |      /$$$$$$  |$$  \  /$$/       $$$$$$$$/ $$/  _______    ______   _______    _______   ______  
$$ |__$$ |$$ |      $$ |__$$ | $$  \/$$/        $$ |__    /  |/       \  /      \ /       \  /       | /      \ 
$$    $$/ $$ |      $$    $$ |  $$  $$/         $$    |   $$ |$$$$$$$  | $$$$$$  |$$$$$$$  |/$$$$$$$/ /$$$$$$  |
$$$$$$$/  $$ |      $$$$$$$$ |   $$$$/          $$$$$/    $$ |$$ |  $$ | /    $$ |$$ |  $$ |$$ |      $$    $$ |
$$ |      $$ |_____ $$ |  $$ |    $$ |          $$ |      $$ |$$ |  $$ |/$$$$$$$ |$$ |  $$ |$$ \_____ $$$$$$$$/ 
$$ |      $$       |$$ |  $$ |    $$ |          $$ |      $$ |$$ |  $$ |$$    $$ |$$ |  $$ |$$       |$$       |
$$/       $$$$$$$$/ $$/   $$/     $$/           $$/       $$/ $$/   $$/  $$$$$$$/ $$/   $$/  $$$$$$$/  $$$$$$$/ 
                                                                                                                
*/
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import "@openzeppelin/test-helpers";
import {
  PlayToken,
  PlayToken__factory,
  PlayDistributor,
  PlayDistributor__factory,
  MockERC20,
  MockERC20__factory,
  Vault,
  Vault__factory,
  StrategyAlpaca,
  StrategyAlpaca__factory,
  MockAlpacaFairLaunch,
  MockAlpacaFairLaunch__factory,
  MockAlpacaVault,  
  MockAlpacaVault__factory,
  MockWBNB,
  MockWBNB__factory,
  PancakeFactory,
  PancakeFactory__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  PancakeRouterV2__factory,
  Config,
  Config__factory
} from "../typechain";
import * as AssertHelpers from "./helpers/assert"

chai.use(solidity);
const { expect } = chai;

describe("VaultAlpacaStrategy", function() {
  this.timeout(0);
  const FOREVER = '2000000000';
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const PRICE_ORACLE_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const ALPACA_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const BASIC_MULTIPLIER = 10000;
  const PLAY_MULTIPLIER = 20000;
  const OPERATOR_FEE = 100;
  const SAFU_FEE = 200;
  const DENOMINATOR_FEE = 10000;
  const MAX_FEE = 10;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let lottery: Signer;
  let playToTheMoon: Signer;
  let safu: Signer;
  let operator: Signer;
  
  let wbnbToken: MockWBNB;

  /// Pancakeswap-related instance(s)
  let factoryV2: PancakeFactory;
  let routerV2: PancakeRouterV2;
  let lp: PancakePair;

  let alpacaToken: MockERC20;
  let busdToken: MockERC20;

  let alpacaFairLaunch: MockAlpacaFairLaunch;
  let alpacaVaultAlpaca: MockAlpacaVault;
  let alpacaVaultBusd: MockAlpacaVault;
  let alpacaVaultWbnb: MockAlpacaVault;

  let playToken: PlayToken;
  let playDistributor: PlayDistributor;

  let playTokenAsBob: PlayToken;

  let strategyAlpacaAlpaca: StrategyAlpaca;
  let strategyAlpacaBusd: StrategyAlpaca;
  let strategyAlpacaWbnb: StrategyAlpaca;

  let vaultAlpacaStrategyAlpaca: Vault;
  let vaultAlpacaStrategyBusd: Vault;
  let vaultAlpacaStrategyWbnb: Vault;
  
  let alpacaTokenAsDeployer: MockERC20;
  let alpacaTokenAsAlice: MockERC20;
  let alpacaTokenAsBob: MockERC20;
  let alpacaTokenAsPlayToTheMoon: MockERC20;
  let alpacaTokenAsSafu: MockERC20;
  let alpacaTokenAsOperator: MockERC20;

  let busdTokenAsDeployer: MockERC20;
  let busdTokenAsAlice: MockERC20;
  let busdTokenAsBob: MockERC20;
  let busdTokenAsPlayToTheMoon: MockERC20;
  let busdTokenAsSafu: MockERC20;
  let busdTokenAsOperator: MockERC20;

  let vaultAlpacaStrategyAlpacaAsDeployer: Vault;
  let vaultAlpacaStrategyAlpacaAsAlice: Vault;
  let vaultAlpacaStrategyAlpacaAsBob: Vault;
  let vaultAlpacaStrategyAlpacaAsLottery: Vault;
  let vaultAlpacaStrategyAlpacaAsPlayToTheMoon: Vault;
  let vaultAlpacaStrategyAlpacaAsSafu: Vault;
  let vaultAlpacaStrategyAlpacaAsOperator: Vault;
  
  let vaultAlpacaStrategyBusdAsDeployer: Vault;
  let vaultAlpacaStrategyBusdAsAlice: Vault;
  let vaultAlpacaStrategyBusdAsBob: Vault;
  let vaultAlpacaStrategyBusdAsLottery: Vault;
  let vaultAlpacaStrategyBusdAsPlayToTheMoon: Vault;
  let vaultAlpacaStrategyBusdAsSafu: Vault;
  let vaultAlpacaStrategyBusdAsOperator: Vault;
  
  let vaultAlpacaStrategyWbnbAsDeployer: Vault;
  let vaultAlpacaStrategyWbnbAsAlice: Vault;
  let vaultAlpacaStrategyWbnbAsBob: Vault;
  let vaultAlpacaStrategyWbnbAsLottery: Vault;
  let vaultAlpacaStrategyWbnbAsPlayToTheMoon: Vault;
  let vaultAlpacaStrategyWbnbAsSafu: Vault;
  let vaultAlpacaStrategyWbnbAsOperator: Vault;

  let config: Config;
  let configAsLottery: Config;

  let strategyAlpacaAlpacaAsDeployer: StrategyAlpaca;
  let strategyAlpacaAlpacaAsAlice: StrategyAlpaca;
  let strategyAlpacaAlpacaAsLottery: StrategyAlpaca;
  let strategyAlpacaAlpacaAsPlayToTheMoon: StrategyAlpaca;
  let strategyAlpacaBusdAsDeployer: StrategyAlpaca;
  let strategyAlpacaBusdAsAlice: StrategyAlpaca;
  let strategyAlpacaBusdAsLottery: StrategyAlpaca;
  let strategyAlpacaBusdAsPlayToTheMoon: StrategyAlpaca;

  let alpacaFairLaunchAsDeployer: MockAlpacaFairLaunch;

  beforeEach(async() => {
    [deployer, alice, bob, lottery, playToTheMoon, safu, operator] = await ethers.getSigners();
    
    const WBNB = (await ethers.getContractFactory(
      "MockWBNB",
      deployer
    )) as MockWBNB__factory;
    wbnbToken = await WBNB.deploy();
    await wbnbToken.deployed();

    // Setup Pancakeswap
    const PancakeFactory = (await ethers.getContractFactory(
      "PancakeFactory",
      deployer
    )) as PancakeFactory__factory;
    factoryV2 = await PancakeFactory.deploy((await deployer.getAddress()));
    await factoryV2.deployed();
    
    const PancakeRouterV2 = (await ethers.getContractFactory(
      "PancakeRouterV2",
      deployer
    )) as PancakeRouterV2__factory;
    routerV2 = await PancakeRouterV2.deploy(factoryV2.address, wbnbToken.address);
    await routerV2.deployed();
    
    // Deploy PLAYs
    const PlayToken = (await ethers.getContractFactory(
      "PlayToken",
      deployer
    )) as PlayToken__factory;
    playToken = await PlayToken.deploy();
    await playToken.deployed();
    
    playToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    playToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));
    playToken.mint(await bob.getAddress(), ethers.utils.parseEther('1000'));

    const MockERC20 = (await ethers.getContractFactory(
      "MockERC20",
      deployer
    )) as MockERC20__factory;

    alpacaToken = await MockERC20.deploy("AlpacaToken", "ALPACA");
    await alpacaToken.deployed();
    await alpacaToken.mint(await playToTheMoon.getAddress(), ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await operator.getAddress(), ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await safu.getAddress(), ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await bob.getAddress(), ethers.utils.parseEther('1000'));

    busdToken = await MockERC20.deploy("BusdToken", "BUSD");
    await busdToken.deployed();
    await busdToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    await busdToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));
    await busdToken.mint(await bob.getAddress(), ethers.utils.parseEther('1000'));
    
    /// Setup token0 token1 pair on Pancakeswap
    await factoryV2.createPair(alpacaToken.address, busdToken.address);
    await factoryV2.createPair(alpacaToken.address, wbnbToken.address);
    await factoryV2.createPair(playToken.address, busdToken.address);
    
    // Deployer adds 1 ALPACA + 1 BUSD
    await alpacaToken.approve(routerV2.address, ethers.utils.parseEther('1'));
    await busdToken.approve(routerV2.address, ethers.utils.parseEther('1'));
    await routerV2.addLiquidity(
      alpacaToken.address, busdToken.address,
      ethers.utils.parseEther('1'), ethers.utils.parseEther('1'),
      '0', '0', await deployer.getAddress(), FOREVER);

    // Deployer adds 0.01 ALPACA + 1 NATIVE
    await alpacaToken.approve(routerV2.address, ethers.utils.parseEther('0.01'));
    await routerV2.addLiquidityETH(
      alpacaToken.address, ethers.utils.parseEther('0.01'),
      '0', '0', await deployer.getAddress(), FOREVER, { value: ethers.utils.parseEther('1') });

    // Deployer adds 1 PLAY + 1 BUSD
    await playToken.approve(routerV2.address, ethers.utils.parseEther('10'));
    await busdToken.approve(routerV2.address, ethers.utils.parseEther('1'));
    await routerV2.addLiquidity(
      playToken.address, busdToken.address,
      ethers.utils.parseEther('10'), ethers.utils.parseEther('1'),
      '0', '0', await deployer.getAddress(), FOREVER);

    // Setup FairLaunch contract
    const MockAlpacaFairLaunch = (await ethers.getContractFactory(
      "MockAlpacaFairLaunch",
      deployer
    )) as MockAlpacaFairLaunch__factory;
    alpacaFairLaunch = await MockAlpacaFairLaunch.deploy(
      alpacaToken.address, (await deployer.getAddress()), ALPACA_REWARD_PER_BLOCK, 0)
    await alpacaFairLaunch.deployed();

    await alpacaToken.transferOwnership(alpacaFairLaunch.address);
    
    const MockAlpacaVault = (await ethers.getContractFactory(
      "MockAlpacaVault",
      deployer
    )) as MockAlpacaVault__factory;
    alpacaVaultAlpaca = await upgrades.deployProxy(MockAlpacaVault, [alpacaToken.address, 'Interest Bearing Alpaca TOKEN', 'ibAlpacaTOKEN', 18, wbnbToken.address
    ]) as MockAlpacaVault;
    await alpacaVaultAlpaca.deployed();
    alpacaVaultBusd = await upgrades.deployProxy(MockAlpacaVault, [busdToken.address, 'Interest Bearing Busd TOKEN', 'ibBusdTOKEN', 18, wbnbToken.address
    ]) as MockAlpacaVault;
    await alpacaVaultBusd.deployed();
    alpacaVaultWbnb = await upgrades.deployProxy(MockAlpacaVault, [wbnbToken.address, 'Interest Bearing Wbnb TOKEN', 'ibWbnbTOKEN', 18, wbnbToken.address
    ]) as MockAlpacaVault;
    await alpacaVaultWbnb.deployed();

    await alpacaFairLaunch.addPool(1, alpacaVaultAlpaca.address, false);
    await alpacaFairLaunch.addPool(1, alpacaVaultBusd.address, false);
    await alpacaFairLaunch.addPool(1, alpacaVaultWbnb.address, false);

    const Config = (await ethers.getContractFactory(
      "Config",
      deployer
    )) as Config__factory;
    config = await Config.deploy(await lottery.getAddress(), routerV2.address, factoryV2.address, wbnbToken.address, PRICE_ORACLE_ADDRESS, busdToken.address, MAX_FEE);
    await config.deployed();
    
    // Setup PlayDistributor contract
    // Deploy PlayDistributor
    const PlayDistributor = (await ethers.getContractFactory(
      "PlayDistributor",
      deployer
    )) as PlayDistributor__factory;
    playDistributor = await PlayDistributor.deploy(
      playToken.address, PLAY_REWARD_PER_BLOCK, await (deployer.getAddress()), await playToTheMoon.getAddress(), config.address)
    await playDistributor.deployed();

    await playToken.transferOwnership(playDistributor.address);

    const StrategyAlpaca = (await ethers.getContractFactory(
      "StrategyAlpaca",
      deployer
    )) as StrategyAlpaca__factory;

    strategyAlpacaAlpaca = await StrategyAlpaca.deploy(
      alpacaVaultAlpaca.address, alpacaToken.address, 0, [alpacaToken.address, alpacaToken.address], config.address, alpacaToken.address, alpacaFairLaunch.address, await safu.getAddress())
    await strategyAlpacaAlpaca.deployed();

    strategyAlpacaBusd = await StrategyAlpaca.deploy(
      alpacaVaultBusd.address, busdToken.address, 1, [alpacaToken.address, busdToken.address], config.address, alpacaToken.address, alpacaFairLaunch.address, await safu.getAddress())
    await strategyAlpacaBusd.deployed();

    strategyAlpacaWbnb = await StrategyAlpaca.deploy(
      alpacaVaultWbnb.address, wbnbToken.address, 2, [alpacaToken.address, wbnbToken.address], config.address, alpacaToken.address, alpacaFairLaunch.address, await safu.getAddress())
    await strategyAlpacaWbnb.deployed();

    const Vault = (await ethers.getContractFactory(
      "Vault",
      deployer
    )) as Vault__factory;

    vaultAlpacaStrategyAlpaca = await Vault.deploy(
      playDistributor.address, alpacaToken.address, strategyAlpacaAlpaca.address, await lottery.getAddress(), await playToTheMoon.getAddress(),
      await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pAlpacaToken", "pALPACA", 18)
    await vaultAlpacaStrategyAlpaca.deployed();

    await strategyAlpacaAlpaca.transferOwnership(vaultAlpacaStrategyAlpaca.address);

    vaultAlpacaStrategyBusd = await Vault.deploy(
      playDistributor.address, busdToken.address, strategyAlpacaBusd.address, await lottery.getAddress(), await playToTheMoon.getAddress(),
      await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pBusdToken", "pBUSD", 18)
    await vaultAlpacaStrategyBusd.deployed();

    await strategyAlpacaBusd.transferOwnership(vaultAlpacaStrategyBusd.address);

    vaultAlpacaStrategyWbnb = await Vault.deploy(
      playDistributor.address, wbnbToken.address, strategyAlpacaWbnb.address, await lottery.getAddress(), await playToTheMoon.getAddress(),
      await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pWbnbToken", "pWBNB", 18)
    await vaultAlpacaStrategyWbnb.deployed();

    await strategyAlpacaWbnb.transferOwnership(vaultAlpacaStrategyWbnb.address);

    await playDistributor.addPool(0, vaultAlpacaStrategyAlpaca.address, 0, BASIC_MULTIPLIER, 0, false);
    expect(await vaultAlpacaStrategyAlpaca.getPoolId()).to.be.eq(0);
    await playDistributor.addPool(0, vaultAlpacaStrategyBusd.address, 0, BASIC_MULTIPLIER, 0, false);
    expect(await vaultAlpacaStrategyBusd.getPoolId()).to.be.eq(1);
    await playDistributor.addPool(0, vaultAlpacaStrategyWbnb.address, 0, BASIC_MULTIPLIER, 0, false);
    expect(await vaultAlpacaStrategyWbnb.getPoolId()).to.be.eq(2);

    vaultAlpacaStrategyAlpacaAsDeployer = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, deployer);
    vaultAlpacaStrategyAlpacaAsAlice = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, alice);
    vaultAlpacaStrategyAlpacaAsBob = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, bob);
    vaultAlpacaStrategyAlpacaAsLottery = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, lottery);
    vaultAlpacaStrategyAlpacaAsPlayToTheMoon = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, playToTheMoon);
    vaultAlpacaStrategyAlpacaAsSafu = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, safu);
    vaultAlpacaStrategyAlpacaAsOperator = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, operator);

    vaultAlpacaStrategyBusdAsDeployer = Vault__factory.connect(vaultAlpacaStrategyBusd.address, deployer);
    vaultAlpacaStrategyBusdAsAlice = Vault__factory.connect(vaultAlpacaStrategyBusd.address, alice);
    vaultAlpacaStrategyBusdAsBob = Vault__factory.connect(vaultAlpacaStrategyBusd.address, bob);
    vaultAlpacaStrategyBusdAsLottery = Vault__factory.connect(vaultAlpacaStrategyBusd.address, lottery);
    vaultAlpacaStrategyBusdAsPlayToTheMoon = Vault__factory.connect(vaultAlpacaStrategyBusd.address, playToTheMoon);
    vaultAlpacaStrategyBusdAsSafu = Vault__factory.connect(vaultAlpacaStrategyBusd.address, safu);
    vaultAlpacaStrategyBusdAsOperator = Vault__factory.connect(vaultAlpacaStrategyBusd.address, operator);

    vaultAlpacaStrategyWbnbAsDeployer = Vault__factory.connect(vaultAlpacaStrategyWbnb.address, deployer);
    vaultAlpacaStrategyWbnbAsAlice = Vault__factory.connect(vaultAlpacaStrategyWbnb.address, alice);
    vaultAlpacaStrategyWbnbAsBob = Vault__factory.connect(vaultAlpacaStrategyWbnb.address, bob);
    vaultAlpacaStrategyWbnbAsLottery = Vault__factory.connect(vaultAlpacaStrategyWbnb.address, lottery);
    vaultAlpacaStrategyWbnbAsPlayToTheMoon = Vault__factory.connect(vaultAlpacaStrategyWbnb.address, playToTheMoon);
    vaultAlpacaStrategyWbnbAsSafu = Vault__factory.connect(vaultAlpacaStrategyWbnb.address, safu);
    vaultAlpacaStrategyWbnbAsOperator = Vault__factory.connect(vaultAlpacaStrategyWbnb.address, operator);

    alpacaTokenAsDeployer = MockERC20__factory.connect(alpacaToken.address, deployer);
    alpacaTokenAsAlice = MockERC20__factory.connect(alpacaToken.address, alice);
    alpacaTokenAsBob = MockERC20__factory.connect(alpacaToken.address, bob);
    alpacaTokenAsPlayToTheMoon = MockERC20__factory.connect(alpacaToken.address, playToTheMoon);
    alpacaTokenAsSafu = MockERC20__factory.connect(alpacaToken.address, safu);
    alpacaTokenAsOperator = MockERC20__factory.connect(alpacaToken.address, operator);
    
    busdTokenAsDeployer = MockERC20__factory.connect(busdToken.address, deployer);
    busdTokenAsAlice = MockERC20__factory.connect(busdToken.address, alice);
    busdTokenAsBob = MockERC20__factory.connect(busdToken.address, bob);
    busdTokenAsPlayToTheMoon = MockERC20__factory.connect(busdToken.address, playToTheMoon);
    busdTokenAsSafu = MockERC20__factory.connect(busdToken.address, safu);
    busdTokenAsOperator = MockERC20__factory.connect(busdToken.address, operator);

    await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('1'));
    await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('1'));

    await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('1'));
    await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('1'));

    await vaultAlpacaStrategyWbnbAsDeployer.deposit(ethers.utils.parseEther('1'), { value: ethers.utils.parseEther('1') });

    configAsLottery = Config__factory.connect(config.address, lottery);
    await configAsLottery.setFeeInfo(0, 100, 100, 100, 100, 10000);
    await vaultAlpacaStrategyAlpacaAsLottery.setLotteryType(0);
    await vaultAlpacaStrategyBusdAsLottery.setLotteryType(0);
    await vaultAlpacaStrategyWbnbAsLottery.setLotteryType(0);

    strategyAlpacaAlpacaAsDeployer = StrategyAlpaca__factory.connect(strategyAlpacaAlpaca.address, deployer);
    strategyAlpacaAlpacaAsAlice = StrategyAlpaca__factory.connect(strategyAlpacaAlpaca.address, alice);
    strategyAlpacaAlpacaAsLottery = StrategyAlpaca__factory.connect(strategyAlpacaAlpaca.address, lottery);
    strategyAlpacaAlpacaAsPlayToTheMoon = StrategyAlpaca__factory.connect(strategyAlpacaAlpaca.address, playToTheMoon);

    strategyAlpacaBusdAsDeployer = StrategyAlpaca__factory.connect(strategyAlpacaBusd.address, deployer);
    strategyAlpacaBusdAsAlice = StrategyAlpaca__factory.connect(strategyAlpacaBusd.address, alice);
    strategyAlpacaBusdAsLottery = StrategyAlpaca__factory.connect(strategyAlpacaBusd.address, lottery);
    strategyAlpacaBusdAsPlayToTheMoon = StrategyAlpaca__factory.connect(strategyAlpacaBusd.address, playToTheMoon);

    alpacaFairLaunchAsDeployer = MockAlpacaFairLaunch__factory.connect(alpacaFairLaunch.address, deployer);

    playTokenAsBob = PlayToken__factory.connect(playToken.address, bob);
  });

  context('deposit and withdraw', async() => {
    it('should work', async() => {
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // exceed approval balance
      await expect (vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // exceed approval balance
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect (vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('101'))).to.be.reverted;
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // exceed wallet balance
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('1000'));
      await expect (vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('1001'))).to.be.reverted;
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // exceed withdraw balance
      await expect(vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('1000'))).to.be.reverted;
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // Alice - deposit 1
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - deposit 2
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('800'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('200'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // Alice - withdraw 1
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - deposit 3
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('850'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('150'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - withdraw 2
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('150'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - deposit 4
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('1000'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - withdraw 3
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // PlayToTheMoon - deposit 1
      await alpacaTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      
      // PlayToTheMoon -  withdraw 1
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // SAFU - deposit 1
      await alpacaTokenAsSafu.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      
      // SAFU -  withdraw 1
      await vaultAlpacaStrategyAlpacaAsSafu.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // Operator - deposit 1
      await alpacaTokenAsOperator.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      
      // Operator -  withdraw 1
      await vaultAlpacaStrategyAlpacaAsOperator.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
    });

    it('should work - wbnb', async() => {
      let initBalance = await alice.getBalance();
      // exceed approval balance
      await expect (vaultAlpacaStrategyWbnbAsAlice.deposit(initBalance.add(ethers.utils.parseEther('1')))).to.be.reverted;
      await expect (vaultAlpacaStrategyWbnbAsAlice.deposit(initBalance.add(ethers.utils.parseEther('1')), { value: initBalance })).to.be.reverted;
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // Alice - deposit 1
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.deposit(ethers.utils.parseEther('100'), { value: ethers.utils.parseEther('100') });
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.sub(ethers.utils.parseEther('100')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));

      // Alice - deposit 2
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.deposit(ethers.utils.parseEther('100'), { value: ethers.utils.parseEther('100') });
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.sub(ethers.utils.parseEther('100')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('200'));
      
      // Alice - withdraw 1
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('100'));
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.add(ethers.utils.parseEther('100')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));

      // Alice - deposit 3
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.deposit(ethers.utils.parseEther('50'), { value: ethers.utils.parseEther('50') });
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.sub(ethers.utils.parseEther('50')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('150'));

      // Alice - withdraw 2
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('150'));
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.add(ethers.utils.parseEther('150')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - deposit 4
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.deposit(ethers.utils.parseEther('1000'), { value: ethers.utils.parseEther('1000') });
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.sub(ethers.utils.parseEther('1000')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - withdraw 3
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('1000'));
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.add(ethers.utils.parseEther('1000')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // bnb
      // Bob - deposit 1
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.deposit(ethers.utils.parseEther('100'), { value: ethers.utils.parseEther('100') });
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.sub(ethers.utils.parseEther('100')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));

      // Bob - withdraw 1
      initBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('100'));
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), initBalance.add(ethers.utils.parseEther('100')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
    });
  });

  context('permissions', async() => {
    it ('to be reverted', async() => {
      await expect(strategyAlpacaAlpacaAsAlice.setGovAddress(await alice.getAddress())).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaAlpacaAsLottery.setGovAddress(await lottery.getAddress())).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaAlpacaAsPlayToTheMoon.setGovAddress(await playToTheMoon.getAddress())).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaBusdAsAlice.setGovAddress(await alice.getAddress())).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaBusdAsLottery.setGovAddress(await lottery.getAddress())).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaBusdAsPlayToTheMoon.setGovAddress(await playToTheMoon.getAddress())).to.be.revertedWith("permission denied");

      await expect(strategyAlpacaBusdAsAlice.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaBusdAsLottery.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaBusdAsPlayToTheMoon.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaAlpacaAsAlice.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaAlpacaAsLottery.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaAlpacaAsPlayToTheMoon.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");

      await expect(strategyAlpacaBusdAsDeployer.transferCompenstationToken(busdToken.address, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaBusdAsDeployer.transferCompenstationToken(alpacaToken.address, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaBusdAsDeployer.transferCompenstationToken(alpacaVaultBusd.address, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaAlpacaAsDeployer.transferCompenstationToken(alpacaToken.address, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyAlpacaAlpacaAsDeployer.transferCompenstationToken(alpacaVaultAlpaca.address, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
    })
  });

  context('when adjust params', async() => {
    it('constructor', async() => {
      const Vault = (await ethers.getContractFactory(
        "Vault",
        deployer
      )) as Vault__factory;
  
      await expect(Vault.deploy(
        ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, "pPlayToken", "pPLAY", 18)
        ).to.be.revertedWith('address can not be zero');
      await expect(Vault.deploy(
        ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, "pPlayToken", "pPLAY", 18)
        ).to.be.revertedWith('address can not be zero');  
      await expect(Vault.deploy(
        ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, "pPlayToken", "pPLAY", 18)
        );
      await expect(Vault.deploy(
        ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, "pPlayToken", "pPLAY", 18)
        ).to.be.revertedWith('address can not be zero');  
      await expect(Vault.deploy(
        ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, "pPlayToken", "pPLAY", 18)
        ).to.be.revertedWith('address can not be zero');  
      await expect(Vault.deploy(
        ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, "pPlayToken", "pPLAY", 18)
        ).to.be.revertedWith('address can not be zero');  
      await expect(Vault.deploy(
        ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, "pPlayToken", "pPLAY", 18)
        ).to.be.revertedWith('address can not be zero');  
      await expect(Vault.deploy(
        ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, "pPlayToken", "pPLAY", 18)
        ).to.be.revertedWith('address can not be zero');
      await expect(Vault.deploy(
        ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, "pPlayToken", "pPLAY", 18)
        ).to.be.revertedWith('address can not be zero');

      expect (await vaultAlpacaStrategyAlpaca.isPrizeVault()).to.be.eq(false);
      expect (await vaultAlpacaStrategyBusd.isPrizeVault()).to.be.eq(false);
      expect (await vaultAlpacaStrategyWbnb.isPrizeVault()).to.be.eq(false);
      
      const StrategyAlpaca = (await ethers.getContractFactory(
        "StrategyAlpaca",
        deployer
      )) as StrategyAlpaca__factory;
  
      await expect(StrategyAlpaca.deploy(ADDRESS0, ADDRESS1, 0, [], ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyAlpaca.deploy(ADDRESS1, ADDRESS0, 0, [], ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyAlpaca.deploy(ADDRESS1, ADDRESS1, 0, [], ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyAlpaca.deploy(ADDRESS1, ADDRESS1, 0, [], ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyAlpaca.deploy(ADDRESS1, ADDRESS1, 0, [], ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyAlpaca.deploy(ADDRESS1, ADDRESS1, 0, [], ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0)).to.be.revertedWith('address cant be zero');
    
      await expect(strategyAlpacaAlpacaAsDeployer.setGovAddress(ADDRESS0)).to.be.revertedWith('address cant be zero');
      await expect(strategyAlpacaBusdAsDeployer.setGovAddress(ADDRESS0)).to.be.revertedWith('address cant be zero');
      await expect(strategyAlpacaAlpacaAsDeployer.setGovAddress(await alice.getAddress())).to.emit(strategyAlpacaAlpaca, 'SetGovAddress')
          .withArgs(await alice.getAddress());
      await expect(strategyAlpacaBusdAsDeployer.setGovAddress(await alice.getAddress())).to.emit(strategyAlpacaBusd, 'SetGovAddress')
          .withArgs(await alice.getAddress());
    });
  });

  context('harvest', async() => {
    it('haverst function is only called by lottery', async() => {
      await expect (vaultAlpacaStrategyAlpacaAsAlice.harvest()).to.be.revertedWith('Only Lottery can call function');
      await expect (vaultAlpacaStrategyBusdAsAlice.harvest()).to.be.revertedWith('Only Lottery can call function');
    });

    it('should work - case 1 (alpaca)', async() => {
      await alpacaTokenAsPlayToTheMoon.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));
      await alpacaTokenAsSafu.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));
      await alpacaTokenAsOperator.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));

      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // alice - alpaca deposit
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // harvest - alpaca vault
      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultAlpacaStrategyAlpacaAsLottery.harvest();

      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw alpaca
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsSafu.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsOperator.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      // alice - withdraw alpaca
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      // alice - deposit alpacaToken
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // alice - withdraw alpacaToken
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      await expect(vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('51'))).to.be.reverted;
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      // harvest - alpaca vault
      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultAlpacaStrategyAlpacaAsLottery.harvest();

      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw alpaca
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsSafu.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsOperator.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));
    });

    it('should work - case 2 (busd)', async() => {
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // alice - busd deposit
      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // harvest - busd vault
      expect (await vaultAlpacaStrategyBusdAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultAlpacaStrategyBusdAsLottery.harvest();

      expect (await vaultAlpacaStrategyBusdAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw busd
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsPlayToTheMoon.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsSafu.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsOperator.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));

      // alice - withdraw busd
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      // alice - deposit busd
      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // alice - withdraw busd
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));
      await expect(vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('51'))).to.be.reverted;
      await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));

      // harvest - busd vault
      expect (await vaultAlpacaStrategyBusdAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultAlpacaStrategyBusdAsLottery.harvest();

      expect (await vaultAlpacaStrategyBusdAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw busd
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsPlayToTheMoon.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsSafu.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsOperator.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));
    });

    it('should work - case 3', async() => {
      await alpacaTokenAsPlayToTheMoon.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));
      await alpacaTokenAsSafu.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));
      await alpacaTokenAsOperator.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));

      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // alice - alpaca deposit
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // alice - busd deposit
      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // alice - withdraw alpaca
      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));      
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // alice - withdraw busd
      expect (await vaultAlpacaStrategyBusdAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      expect (await vaultAlpacaStrategyBusdAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // harvest - alpaca vault
      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultAlpacaStrategyAlpacaAsLottery.harvest();

      expect (await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpacaAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // harvest - busd vault
      expect (await vaultAlpacaStrategyBusdAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultAlpacaStrategyBusdAsLottery.harvest();

      expect (await vaultAlpacaStrategyBusdAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusdAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw alpaca
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsSafu.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsOperator.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress()));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await alpacaToken.balanceOf(vaultAlpacaStrategyAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));

      // fund - withdraw busd
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsPlayToTheMoon.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsSafu.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsOperator.withdraw(await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress()));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await busdToken.balanceOf(vaultAlpacaStrategyBusd.address)).to.be.eq(ethers.utils.parseEther('0'));
    });

    it('should work - case 4 (wbnb)', async() => {
      // alice - wbnb deposit
      await vaultAlpacaStrategyWbnbAsAlice.deposit(ethers.utils.parseEther('100'), { value: ethers.utils.parseEther('100') });

      // harvest - wbnb vault
      expect (await vaultAlpacaStrategyWbnbAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnbAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnbAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultAlpacaStrategyWbnbAsLottery.harvest();

      expect (await vaultAlpacaStrategyWbnbAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnbAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnbAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw wbnb
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      let beforeBalance = await playToTheMoon.getBalance();
      let withdrawBalance = await vaultAlpacaStrategyWbnb.balanceOf(await playToTheMoon.getAddress());
      await vaultAlpacaStrategyWbnbAsPlayToTheMoon.withdraw(withdrawBalance);
      AssertHelpers.assertAlmostEqual((await playToTheMoon.getBalance()).toString(), beforeBalance.add(withdrawBalance).toString());
      expect (await wbnbToken.balanceOf(vaultAlpacaStrategyWbnb.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyWbnb.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      beforeBalance = await safu.getBalance();
      withdrawBalance = await vaultAlpacaStrategyWbnb.balanceOf(await safu.getAddress());
      await vaultAlpacaStrategyWbnbAsSafu.withdraw(withdrawBalance);
      AssertHelpers.assertAlmostEqual((await safu.getBalance()).toString(), beforeBalance.add(withdrawBalance).toString());
      expect (await wbnbToken.balanceOf(vaultAlpacaStrategyWbnb.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultAlpacaStrategyWbnb.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      beforeBalance = await operator.getBalance();
      withdrawBalance = await vaultAlpacaStrategyWbnb.balanceOf(await operator.getAddress());
      await vaultAlpacaStrategyWbnbAsOperator.withdraw(withdrawBalance);
      AssertHelpers.assertAlmostEqual((await operator.getBalance()).toString(), beforeBalance.add(withdrawBalance).toString());
      expect (await wbnbToken.balanceOf(vaultAlpacaStrategyWbnb.address)).to.be.eq(ethers.utils.parseEther('0'));

      // alice - withdraw wbnb
      beforeBalance = await alice.getBalance();
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('100'));
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), beforeBalance.add(ethers.utils.parseEther('100.1')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await wbnbToken.balanceOf(vaultAlpacaStrategyWbnb.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      // alice - deposit wbnbToken
      await vaultAlpacaStrategyWbnbAsAlice.deposit(ethers.utils.parseEther('100'), { value: ethers.utils.parseEther('100') });

      // alice - withdraw wbnbToken
      beforeBalance = await alice.getBalance();
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), beforeBalance.add(ethers.utils.parseEther('50')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      await expect(vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('51'))).to.be.reverted;
      
      beforeBalance = await alice.getBalance();
      await vaultAlpacaStrategyWbnbAsAlice.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alice.getBalance()).toString(), beforeBalance.add(ethers.utils.parseEther('50')).toString());
      expect (await vaultAlpacaStrategyWbnbAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await wbnbToken.balanceOf(vaultAlpacaStrategyWbnb.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      // harvest - wbnb vault
      expect (await vaultAlpacaStrategyWbnbAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnbAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnbAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultAlpacaStrategyWbnbAsLottery.harvest();

      expect (await vaultAlpacaStrategyWbnbAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnbAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnbAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw wbnb
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      beforeBalance = await playToTheMoon.getBalance();
      withdrawBalance = await vaultAlpacaStrategyWbnb.balanceOf(await playToTheMoon.getAddress());
      await vaultAlpacaStrategyWbnbAsPlayToTheMoon.withdraw(withdrawBalance);
      AssertHelpers.assertAlmostEqual((await playToTheMoon.getBalance()).toString(), beforeBalance.add(withdrawBalance).toString());
      expect (await wbnbToken.balanceOf(vaultAlpacaStrategyWbnb.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      beforeBalance = await safu.getBalance();
      withdrawBalance = await vaultAlpacaStrategyWbnb.balanceOf(await safu.getAddress());
      await vaultAlpacaStrategyWbnbAsSafu.withdraw(withdrawBalance);
      AssertHelpers.assertAlmostEqual((await safu.getBalance()).toString(), beforeBalance.add(withdrawBalance).toString());
      expect (await wbnbToken.balanceOf(vaultAlpacaStrategyWbnb.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      expect (await vaultAlpacaStrategyWbnb.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      beforeBalance = await operator.getBalance();
      withdrawBalance = await vaultAlpacaStrategyWbnb.balanceOf(await operator.getAddress());
      await vaultAlpacaStrategyWbnbAsOperator.withdraw(withdrawBalance);
      AssertHelpers.assertAlmostEqual((await operator.getBalance()).toString(), beforeBalance.add(withdrawBalance).toString());
      expect (await wbnbToken.balanceOf(vaultAlpacaStrategyWbnb.address)).to.be.eq(ethers.utils.parseEther('0'));

      await expect(vaultAlpacaStrategyWbnbAsPlayToTheMoon.withdraw(withdrawBalance)).to.be.reverted;
      await expect(vaultAlpacaStrategyWbnbAsSafu.withdraw(withdrawBalance)).to.be.reverted;
      await expect(vaultAlpacaStrategyWbnbAsOperator.withdraw(withdrawBalance)).to.be.reverted;
    });
    
    it ('should work - case 5', async() => {
      await alpacaFairLaunchAsDeployer.setPool(0, 0, false);
      await vaultAlpacaStrategyAlpacaAsLottery.harvest();
      const _before = await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address);

      await alpacaTokenAsPlayToTheMoon.transfer(await strategyAlpacaAlpaca.address, ethers.utils.parseEther('1000'));

      expect (await alpacaToken.balanceOf(strategyAlpacaAlpaca.address)).to.be.eq(ethers.utils.parseEther('1000'));

      await expect(vaultAlpacaStrategyAlpacaAsLottery.harvest()).to.emit(vaultAlpacaStrategyAlpaca, 'Harvest').withArgs(ethers.utils.parseEther('1000'));

      expect((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('1000').add(_before[0]));
    });

    it ('should work - case 6', async() => {
      await alpacaFairLaunchAsDeployer.setPool(0, 0, false);
      await vaultAlpacaStrategyAlpacaAsLottery.harvest();
      const _before = await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address);

      await alpacaTokenAsPlayToTheMoon.transfer(await strategyAlpacaAlpaca.address, ethers.utils.parseEther('1000'));

      expect (await alpacaToken.balanceOf(strategyAlpacaAlpaca.address)).to.be.eq(ethers.utils.parseEther('1000'));

      // alice - alpaca deposit
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      await expect(vaultAlpacaStrategyAlpacaAsLottery.harvest()).to.emit(vaultAlpacaStrategyAlpaca, 'Harvest').withArgs(ethers.utils.parseEther('1000'));

      expect((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('1100').add(_before[0]));
    });

    it ('should work - case 7', async() => {
      await alpacaFairLaunchAsDeployer.setPool(1, 0, false);
      await vaultAlpacaStrategyBusdAsLottery.harvest();
      const _before = await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address);

      await busdTokenAsDeployer.transfer(await strategyAlpacaBusd.address, ethers.utils.parseEther('997'));

      expect (await busdToken.balanceOf(strategyAlpacaBusd.address)).to.be.eq(ethers.utils.parseEther('997'));

      await expect(vaultAlpacaStrategyBusdAsLottery.harvest()).to.emit(vaultAlpacaStrategyBusd, 'Harvest').withArgs(ethers.utils.parseEther('997'));

      expect((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('997').add(_before[0]));
    });

    it ('should work - case 8', async() => {
      await alpacaFairLaunchAsDeployer.setPool(1, 0, false);
      await vaultAlpacaStrategyBusdAsLottery.harvest();
      const _before = await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address);

      await busdTokenAsDeployer.transfer(await strategyAlpacaBusd.address, ethers.utils.parseEther('997'));

      expect (await busdToken.balanceOf(strategyAlpacaBusd.address)).to.be.eq(ethers.utils.parseEther('997'));

      // alice - busd deposit
      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      await expect(vaultAlpacaStrategyBusdAsLottery.harvest()).to.emit(vaultAlpacaStrategyBusd, 'Harvest').withArgs(ethers.utils.parseEther('997'));

      expect((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('1097').add(_before[0]));
    });
  });  

  context('emergencyWithdraw', async() => {
    it ('should work - busd', async() => {
      await busdTokenAsDeployer.approve(await playToTheMoon.getAddress(), ethers.utils.parseEther('10'));
      await busdTokenAsPlayToTheMoon.transferFrom(await deployer.getAddress(), await playToTheMoon.getAddress(), ethers.utils.parseEther('10'));

      await busdTokenAsDeployer.approve(await safu.getAddress(), ethers.utils.parseEther('10'));
      await busdTokenAsSafu.transferFrom(await deployer.getAddress(), await safu.getAddress(), ethers.utils.parseEther('10'));

      await busdTokenAsDeployer.approve(await operator.getAddress(), ethers.utils.parseEther('10'));
      await busdTokenAsOperator.transferFrom(await deployer.getAddress(), await operator.getAddress(), ethers.utils.parseEther('10'));

      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      
      // play
      // Bob - deposit 1
      await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyBusdAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // play to the moon - deposit 1
      await busdTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('10'));
      await vaultAlpacaStrategyBusdAsPlayToTheMoon.deposit(ethers.utils.parseEther('10'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('10'));

      // safu - deposit 1
      await busdTokenAsSafu.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('10'));
      await vaultAlpacaStrategyBusdAsSafu.deposit(ethers.utils.parseEther('10'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('10'));

      // operator - deposit 1
      await busdTokenAsOperator.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('10'));
      await vaultAlpacaStrategyBusdAsOperator.deposit(ethers.utils.parseEther('10'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('10'));

      // pause
      await vaultAlpacaStrategyBusdAsDeployer.pause();

      expect (await vaultAlpacaStrategyBusdAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('131'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      await vaultAlpacaStrategyBusdAsDeployer.emergencyWithdraw(await bob.getAddress(), await vaultAlpacaStrategyBusdAsBob.getUserBalance(await bob.getAddress()));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyBusdAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('31'));

      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsDeployer.emergencyWithdraw(await playToTheMoon.getAddress(), await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress()));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await vaultAlpacaStrategyBusdAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('21'));

      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsDeployer.emergencyWithdraw(await safu.getAddress(), await vaultAlpacaStrategyBusd.balanceOf(await safu.getAddress()));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await vaultAlpacaStrategyBusdAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('11'));

      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyBusdAsDeployer.emergencyWithdraw(await operator.getAddress(), await vaultAlpacaStrategyBusd.balanceOf(await operator.getAddress()));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await vaultAlpacaStrategyBusdAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('1'));

      const _before = await busdToken.balanceOf(await deployer.getAddress());
      await vaultAlpacaStrategyBusdAsDeployer.emergencyWithdraw(await deployer.getAddress(), ethers.utils.parseEther('1'));
      expect (await busdToken.balanceOf(await deployer.getAddress())).to.be.eq(ethers.utils.parseEther('1').add(_before));
      expect (await vaultAlpacaStrategyBusdAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('0'));
    });

    it ('should work - alpaca', async() => {
      await alpacaTokenAsDeployer.approve(await playToTheMoon.getAddress(), ethers.utils.parseEther('10'));
      await alpacaTokenAsPlayToTheMoon.transferFrom(await deployer.getAddress(), await playToTheMoon.getAddress(), ethers.utils.parseEther('10'));

      await alpacaTokenAsDeployer.approve(await safu.getAddress(), ethers.utils.parseEther('10'));
      await alpacaTokenAsSafu.transferFrom(await deployer.getAddress(), await safu.getAddress(), ethers.utils.parseEther('10'));

      await alpacaTokenAsDeployer.approve(await operator.getAddress(), ethers.utils.parseEther('10'));
      await alpacaTokenAsOperator.transferFrom(await deployer.getAddress(), await operator.getAddress(), ethers.utils.parseEther('10'));

      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      
      // play
      // Bob - deposit 1
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // play to the moon - deposit 1
      await alpacaTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('1010'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.deposit(ethers.utils.parseEther('1010'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));

      // safu - deposit 1
      await alpacaTokenAsSafu.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('1010'));
      await vaultAlpacaStrategyAlpacaAsSafu.deposit(ethers.utils.parseEther('1010'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));

      // operator - deposit 1
      await alpacaTokenAsOperator.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('1010'));
      await vaultAlpacaStrategyAlpacaAsOperator.deposit(ethers.utils.parseEther('1010'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));

      // pause
      await vaultAlpacaStrategyAlpacaAsDeployer.pause();

      expect (await vaultAlpacaStrategyAlpacaAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('3131'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      await vaultAlpacaStrategyAlpacaAsDeployer.emergencyWithdraw(await bob.getAddress(), await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress()));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultAlpacaStrategyAlpacaAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('3031'));

      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsDeployer.emergencyWithdraw(await playToTheMoon.getAddress(), await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress()));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await vaultAlpacaStrategyAlpacaAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('2021'));

      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsDeployer.emergencyWithdraw(await safu.getAddress(), await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress()));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await vaultAlpacaStrategyAlpacaAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('1011'));

      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsDeployer.emergencyWithdraw(await operator.getAddress(), await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress()));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await vaultAlpacaStrategyAlpacaAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('1'));

      const _before = await alpacaToken.balanceOf(await deployer.getAddress());
      await vaultAlpacaStrategyAlpacaAsDeployer.emergencyWithdraw(await deployer.getAddress(), ethers.utils.parseEther('1'));
      expect (await alpacaToken.balanceOf(await deployer.getAddress())).to.be.eq(ethers.utils.parseEther('1').add(_before));
      expect (await vaultAlpacaStrategyAlpacaAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('0'));
    });
  });

  context('withdrawFee', async() => {
    it('should work', async() => {
      await vaultAlpacaStrategyBusdAsDeployer.setWithdrawFee(ethers.utils.parseEther('1'));

      await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('100'));

      await expect(vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('100'))).to.be.reverted;

      await playTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('1'));
      
      let before = await playToken.balanceOf(await bob.getAddress());
      let beforeOperator = await playToken.balanceOf(await operator.getAddress());
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('100'));
      let after = await playToken.balanceOf(await bob.getAddress());
      let afterOperator = await playToken.balanceOf(await operator.getAddress());

      expect (after).to.be.eq(before.sub(ethers.utils.parseEther('1')));
      expect (afterOperator).to.be.eq(beforeOperator.add(ethers.utils.parseEther('1')));
      
      await vaultAlpacaStrategyBusdAsDeployer.setWithdrawFee(ethers.utils.parseEther('0'));

      await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('100'));

      before = await playToken.balanceOf(await bob.getAddress());
      beforeOperator = await playToken.balanceOf(await operator.getAddress());
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('100'));
      after = await playToken.balanceOf(await bob.getAddress());
      afterOperator = await playToken.balanceOf(await operator.getAddress());

      expect (after).to.be.eq(before);
      expect (afterOperator).to.be.eq(beforeOperator);
    });
  });
});