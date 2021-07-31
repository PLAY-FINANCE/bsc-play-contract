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

describe("VaultAlpacaStrategyWorstCase", function() {
  this.timeout(0);
  const FOREVER = '2000000000';
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const PRICE_ORACLE_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const ALPACA_REWARD_PER_BLOCK = ethers.utils.parseEther('1');
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
  let alpacaVaultDummy: MockAlpacaVault;

  let playToken: PlayToken;
  let playDistributor: PlayDistributor;

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
  let strategyAlpacaBusdAsDeployer: StrategyAlpaca;

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
    await busdToken.mint(await playToTheMoon.getAddress(), ethers.utils.parseEther('1000'));
    await busdToken.mint(await operator.getAddress(), ethers.utils.parseEther('1000'));
    await busdToken.mint(await safu.getAddress(), ethers.utils.parseEther('1000'));
    
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
    alpacaVaultDummy = await upgrades.deployProxy(MockAlpacaVault, [wbnbToken.address, 'Interest Bearing Wbnb TOKEN', 'ibWbnbTOKEN', 18, wbnbToken.address
    ]) as MockAlpacaVault;
    await alpacaVaultWbnb.deployed();

    await alpacaFairLaunch.addPool(0, alpacaVaultAlpaca.address, false);
    await alpacaFairLaunch.addPool(0, alpacaVaultBusd.address, false);
    await alpacaFairLaunch.addPool(0, alpacaVaultWbnb.address, false);
    await alpacaFairLaunch.addPool(1, alpacaVaultDummy.address, false); // for avoid division by zero

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

    configAsLottery = Config__factory.connect(config.address, lottery);
    await configAsLottery.setFeeInfo(0, 100, 100, 100, 100, 10000);
    await vaultAlpacaStrategyAlpacaAsLottery.setLotteryType(0);
    await vaultAlpacaStrategyBusdAsLottery.setLotteryType(0);
    await vaultAlpacaStrategyWbnbAsLottery.setLotteryType(0);

    strategyAlpacaAlpacaAsDeployer = StrategyAlpaca__factory.connect(strategyAlpacaAlpaca.address, deployer);
    strategyAlpacaBusdAsDeployer = StrategyAlpaca__factory.connect(strategyAlpacaBusd.address, deployer);
  });

  context('transferCompensationToken to SAFU', async() => {
    it ('should work', async() => {
      const MockERC20 = (await ethers.getContractFactory(
        "MockERC20",
        deployer
      )) as MockERC20__factory;

      let compensationToken1 = await MockERC20.deploy("COMPENSATION1", "COMPENSATION1");
      compensationToken1.mint(strategyAlpacaBusd.address, ethers.utils.parseEther('1000'));
      compensationToken1.mint(strategyAlpacaAlpaca.address, ethers.utils.parseEther('1000'));

      let compensationToken2 = await MockERC20.deploy("COMPENSATION2", "COMPENSATION2");
      compensationToken2.mint(strategyAlpacaBusd.address, ethers.utils.parseEther('2000'));
      compensationToken2.mint(strategyAlpacaAlpaca.address, ethers.utils.parseEther('2000'));

      expect (await compensationToken1.balanceOf(strategyAlpacaBusd.address)).to.be.eq(ethers.utils.parseEther('1000'));
      await strategyAlpacaBusdAsDeployer.transferCompenstationToken(compensationToken1.address, ethers.utils.parseEther('1000'));
      expect (await compensationToken1.balanceOf(strategyAlpacaBusd.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect (await compensationToken1.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      expect (await compensationToken2.balanceOf(strategyAlpacaBusd.address)).to.be.eq(ethers.utils.parseEther('2000'));
      await strategyAlpacaBusdAsDeployer.transferCompenstationToken(compensationToken2.address, ethers.utils.parseEther('2000'));
      expect (await compensationToken2.balanceOf(strategyAlpacaBusd.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect (await compensationToken2.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('2000'));

      expect (await compensationToken1.balanceOf(strategyAlpacaAlpaca.address)).to.be.eq(ethers.utils.parseEther('1000'));
      await strategyAlpacaAlpacaAsDeployer.transferCompenstationToken(compensationToken1.address, ethers.utils.parseEther('500'));
      expect (await compensationToken1.balanceOf(strategyAlpacaAlpaca.address)).to.be.eq(ethers.utils.parseEther('500'));
      expect (await compensationToken1.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1500'));
      await strategyAlpacaAlpacaAsDeployer.transferCompenstationToken(compensationToken1.address, ethers.utils.parseEther('500'));
      expect (await compensationToken1.balanceOf(strategyAlpacaAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect (await compensationToken1.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('2000'));

      expect (await compensationToken2.balanceOf(strategyAlpacaAlpaca.address)).to.be.eq(ethers.utils.parseEther('2000'));
      await expect(strategyAlpacaAlpacaAsDeployer.transferCompenstationToken(compensationToken2.address, ethers.utils.parseEther('2001'))).to.be.reverted;
      await strategyAlpacaAlpacaAsDeployer.transferCompenstationToken(compensationToken2.address, ethers.utils.parseEther('2000'));
      expect (await compensationToken2.balanceOf(strategyAlpacaAlpaca.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect (await compensationToken2.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('4000'));
    })
  });

  context('worst case (vault)', async() => {
    it ('should work (deposit to be reverted)', async() => {
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      
      // Bob - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Play to the moon - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await alpacaTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Safu - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('300'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      await alpacaTokenAsSafu.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Operator - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('400'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      await alpacaTokenAsOperator.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      // hacked
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('500'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      await alpacaVaultAlpaca.transferToken(await deployer.getAddress(), ethers.utils.parseEther('250'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('250'));

      // Alice - deposit 2
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
      
      // Bob - deposit 2
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Play to the moon - deposit 2
      await alpacaTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Safu - deposit 2
      await alpacaTokenAsSafu.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsSafu.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Operator - deposit 2
      await alpacaTokenAsOperator.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsOperator.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
    });
    
    it ('should work (after all money has been withdrawn, vault operates again normally)', async() => {
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      
      // hacked
      await alpacaVaultAlpaca.transferToken(await deployer.getAddress(), ethers.utils.parseEther('50'));
      
      // Alice - deposit 2
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Alice - withdraw 1
      expect(await vaultAlpacaStrategyAlpacaAsAlice.getBalanceSnapshot()).to.be.gt(0);
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect(await vaultAlpacaStrategyAlpacaAsAlice.getBalanceSnapshot()).to.be.eq(0);

      // Alice - deposit 3
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

      // Alice - withdraw 2
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
    });

    it ('should work (harvest)', async() => {
      await alpacaFairLaunch.setPool(0, 1, false);

      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsLottery.harvest();
      let _before = await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress());
      expect (_before).to.be.gt(ethers.utils.parseEther('0'));

      // hacked
      await alpacaFairLaunch.transferToken(strategyAlpacaAlpaca.address, 0, ethers.utils.parseEther('50'), await deployer.getAddress());
      
      await expect(vaultAlpacaStrategyAlpacaAsLottery.harvest()).to.not.emit(vaultAlpacaStrategyAlpaca, 'Harvest');

      let _after = await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress());
      expect (_after).to.be.eq(_before);
    });

    it ('should work (alpaca) - 1', async() => {
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Play to the moon - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await alpacaTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Safu - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('300'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      await alpacaTokenAsSafu.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Operator - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('400'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      await alpacaTokenAsOperator.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      // hacked
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('500'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      await alpacaVaultAlpaca.transferToken(await deployer.getAddress(), ethers.utils.parseEther('250'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('250'));
      
      // Alice - withdraw 1
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      
      // Bob - withdraw 1
      await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('350'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('175'));
      
      // Bob - withdraw 2
      await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('150'));

      // PlayToTHeMoon - withdraw 1
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      
      // Safu - withdraw 1
      await vaultAlpacaStrategyAlpacaAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('150'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('75'));
      
      // Operator - withdraw 1
      await vaultAlpacaStrategyAlpacaAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('50'));
      
      // Safu - withdraw 2
      await vaultAlpacaStrategyAlpacaAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('50'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('25'));
      
      // Operator - withdraw 2
      await vaultAlpacaStrategyAlpacaAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
    });
    
    it ('should work (alpaca) - 2', async() => {
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      // hacked
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await alpacaVaultAlpaca.transferToken(await deployer.getAddress(), ethers.utils.parseEther('33.333'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('166.667'));
      
      // Alice - withdraw 1
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      AssertHelpers.assertAlmostEqual((await alpacaToken.balanceOf(await alice.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      AssertHelpers.assertAlmostEqual((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0].toString(), ethers.utils.parseEther('100').toString());
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('83.3335'));
      
      // Bob - withdraw 1
      await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alpacaToken.balanceOf(await bob.getAddress())).toString(), (ethers.utils.parseEther('941.66675')).toString());
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0].toString(), ethers.utils.parseEther('50').toString());
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('41.66675'));
      
      // Bob - withdraw 2
      await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alpacaToken.balanceOf(await bob.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
    });

    it ('should work (busd) - 1', async() => {
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Play to the moon - deposit 1
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await busdTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Safu - deposit 1
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('300'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      await busdTokenAsSafu.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Operator - deposit 1
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('400'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      await busdTokenAsOperator.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      // hacked
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('500'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      await alpacaVaultBusd.transferToken(await deployer.getAddress(), ethers.utils.parseEther('250'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('250'));
      
      // Alice - withdraw 1
      await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      
      // Bob - withdraw 1
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect (await vaultAlpacaStrategyBusdAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('350'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('175'));
      
      // Bob - withdraw 2
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyBusdAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('150'));

      // PlayToTHeMoon - withdraw 1
      await vaultAlpacaStrategyBusdAsPlayToTheMoon.withdraw(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      
      // Safu - withdraw 1
      await vaultAlpacaStrategyBusdAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('150'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('75'));
      
      // Operator - withdraw 1
      await vaultAlpacaStrategyBusdAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('50'));
      
      // Safu - withdraw 2
      await vaultAlpacaStrategyBusdAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('50'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('25'));
      
      // Operator - withdraw 2
      await vaultAlpacaStrategyBusdAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
    });
    
    it ('should work (busd) - 2', async() => {
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      // hacked
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await alpacaVaultBusd.transferToken(await deployer.getAddress(), ethers.utils.parseEther('33.333'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('166.667'));
      
      // Alice - withdraw 1
      await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100'));
      AssertHelpers.assertAlmostEqual((await busdToken.balanceOf(await alice.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      AssertHelpers.assertAlmostEqual((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0].toString(), ethers.utils.parseEther('100').toString());
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('83.3335'));
      
      // Bob - withdraw 1
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await busdToken.balanceOf(await bob.getAddress())).toString(), (ethers.utils.parseEther('941.66675')).toString());
      expect (await vaultAlpacaStrategyBusdAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0].toString(), ethers.utils.parseEther('50').toString());
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('41.66675'));
      
      // Bob - withdraw 2
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await busdToken.balanceOf(await bob.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultAlpacaStrategyBusdAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaVaultBusd.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
    });
  });

  context('worst case (fairlaunch)', async() => {
    it ('should work (deposit to be reverted)', async() => {
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      
      // Bob - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Play to the moon - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await alpacaTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Safu - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('300'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      await alpacaTokenAsSafu.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Operator - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('400'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      await alpacaTokenAsOperator.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      expect (await strategyAlpacaAlpaca.getTotalBalance()).to.be.eq(ethers.utils.parseEther('500'));

      // hacked
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('500'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      await alpacaFairLaunch.transferToken(strategyAlpacaAlpaca.address, 0, ethers.utils.parseEther('250'), await deployer.getAddress());
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('250'));
      
      expect (await strategyAlpacaAlpaca.getTotalBalance()).to.be.eq(ethers.utils.parseEther('250'));

      // Alice - deposit 2
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
      
      // Bob - deposit 2
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Play to the moon - deposit 2
      await alpacaTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Safu - deposit 2
      await alpacaTokenAsSafu.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsSafu.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Operator - deposit 2
      await alpacaTokenAsOperator.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsOperator.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
    });
    
    it ('should work (should work (after all money has been withdrawn, vault operates again normally)', async() => {
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      
      // hacked
      await alpacaFairLaunch.transferToken(strategyAlpacaAlpaca.address, 0, ethers.utils.parseEther('50'), await deployer.getAddress());
      
      // Alice - deposit 2
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await expect(vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Alice - withdraw 1
      expect(await vaultAlpacaStrategyAlpacaAsAlice.getBalanceSnapshot()).to.be.gt(0);
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect(await vaultAlpacaStrategyAlpacaAsAlice.getBalanceSnapshot()).to.be.eq(0);

      // Alice - deposit 3
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

      // Alice - withdraw 2
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
    });

    it ('should work (harvest)', async() => {
      await alpacaFairLaunch.setPool(0, 1, false);

      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultAlpacaStrategyAlpacaAsLottery.harvest();
      let _before = await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress());
      expect (_before).to.be.gt(ethers.utils.parseEther('0'));

      // hacked
      await alpacaFairLaunch.transferToken(strategyAlpacaAlpaca.address, 0, ethers.utils.parseEther('50'), await deployer.getAddress());
      
      await expect(vaultAlpacaStrategyAlpacaAsLottery.harvest()).to.not.emit(vaultAlpacaStrategyAlpaca, 'Harvest');

      let _after = await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress());
      expect (_after).to.be.eq(_before);
    });

    it ('should work (alpaca) - 1', async() => {
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('100'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Play to the moon - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('200'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await alpacaTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Safu - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('300'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      await alpacaTokenAsSafu.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Operator - deposit 1
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('400'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      await alpacaTokenAsOperator.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      expect (await strategyAlpacaAlpaca.getTotalBalance()).to.be.eq(ethers.utils.parseEther('500'));

      // hacked
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('500'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      await alpacaFairLaunch.transferToken(strategyAlpacaAlpaca.address, 0, ethers.utils.parseEther('250'), await deployer.getAddress());
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('250'));
      
      expect (await strategyAlpacaAlpaca.getTotalBalance()).to.be.eq(ethers.utils.parseEther('250'));

      // Alice - withdraw 1
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('450'));
      
      // Bob - withdraw 1
      await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('175'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('425'));
      
      // Bob - withdraw 2
      await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('150'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('400'));

      // PlayToTHeMoon - withdraw 1
      await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.withdraw(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('350'));
      
      // Safu - withdraw 1
      await vaultAlpacaStrategyAlpacaAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('75'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('325'));
      
      // Operator - withdraw 1
      await vaultAlpacaStrategyAlpacaAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('50'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('300'));
      
      // Safu - withdraw 2
      await vaultAlpacaStrategyAlpacaAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('25'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('275'));
      
      // Operator - withdraw 2
      await vaultAlpacaStrategyAlpacaAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      expect (await alpacaVaultAlpaca.totalToken()).to.be.eq(ethers.utils.parseEther('250'));
    });
    
    it ('should work (alpaca) - 2', async() => {
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await alpacaToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await alpacaToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      expect (await strategyAlpacaAlpaca.getTotalBalance()).to.be.eq(ethers.utils.parseEther('200'));

      // hacked
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await alpacaFairLaunch.transferToken(strategyAlpacaAlpaca.address, 0, ethers.utils.parseEther('33.333'), await deployer.getAddress());
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('166.667'));
      
      expect (await strategyAlpacaAlpaca.getTotalBalance()).to.be.eq(ethers.utils.parseEther('166.667'));

      // Alice - withdraw 1
      await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
      AssertHelpers.assertAlmostEqual((await alpacaToken.balanceOf(await alice.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultAlpacaStrategyAlpacaAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyAlpaca.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      AssertHelpers.assertAlmostEqual((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0].toString(), ethers.utils.parseEther('83.3335').toString());
      
      // Bob - withdraw 1
      await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alpacaToken.balanceOf(await bob.getAddress())).toString(), (ethers.utils.parseEther('941.66675')).toString());
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0].toString(), ethers.utils.parseEther('41.66675').toString());
      
      // Bob - withdraw 2
      await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alpacaToken.balanceOf(await bob.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultAlpacaStrategyAlpacaAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(0, strategyAlpacaAlpaca.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
    });

    it ('should work (busd) - 1', async() => {
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Play to the moon - deposit 1
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await busdTokenAsPlayToTheMoon.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Safu - deposit 1
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      await busdTokenAsSafu.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Operator - deposit 1
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      await busdTokenAsOperator.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      expect (await strategyAlpacaBusd.getTotalBalance()).to.be.eq(ethers.utils.parseEther('500'));

      // hacked
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      await alpacaFairLaunch.transferToken(strategyAlpacaBusd.address, 1, ethers.utils.parseEther('250'), await deployer.getAddress());
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('250'));
      
      expect (await strategyAlpacaBusd.getTotalBalance()).to.be.eq(ethers.utils.parseEther('250'));

      // Alice - withdraw 1
      await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      
      // Bob - withdraw 1
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('175'));
      
      // Bob - withdraw 2
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('150'));

      // PlayToTHeMoon - withdraw 1
      await vaultAlpacaStrategyBusdAsPlayToTheMoon.withdraw(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      
      // Safu - withdraw 1
      await vaultAlpacaStrategyBusdAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('75'));
      
      // Operator - withdraw 1
      await vaultAlpacaStrategyBusdAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('50'));
      
      // Safu - withdraw 2
      await vaultAlpacaStrategyBusdAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('25'));
      
      // Operator - withdraw 2
      await vaultAlpacaStrategyBusdAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
    });
    
    it ('should work (busd) - 2', async() => {
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      expect (await strategyAlpacaBusd.getTotalBalance()).to.be.eq(ethers.utils.parseEther('200'));

      // hacked
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await alpacaFairLaunch.transferToken(strategyAlpacaBusd.address, 1, ethers.utils.parseEther('33.333'), await deployer.getAddress());
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('166.667'));
      
      expect (await strategyAlpacaBusd.getTotalBalance()).to.be.eq(ethers.utils.parseEther('166.667'));

      // Alice - withdraw 1
      await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100'));
      AssertHelpers.assertAlmostEqual((await busdToken.balanceOf(await alice.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultAlpacaStrategyBusdAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultAlpacaStrategyBusd.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      AssertHelpers.assertAlmostEqual((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0].toString(), ethers.utils.parseEther('83.3335').toString());
      
      // Bob - withdraw 1
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await busdToken.balanceOf(await bob.getAddress())).toString(), (ethers.utils.parseEther('941.66675')).toString());
      expect (await vaultAlpacaStrategyBusdAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0].toString(), ethers.utils.parseEther('41.66675').toString());
      
      // Bob - withdraw 2
      await vaultAlpacaStrategyBusdAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await busdToken.balanceOf(await bob.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultAlpacaStrategyBusdAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await alpacaFairLaunch.userInfo(1, strategyAlpacaBusd.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
    });
  });
});