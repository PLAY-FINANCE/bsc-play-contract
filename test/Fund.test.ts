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
  Fund,
  Fund__factory,
  Config,
  Config__factory
} from "../typechain";

chai.use(solidity);
const { expect } = chai;

describe("Fund", function() {
  this.timeout(0);
  const FOREVER = '2000000000';
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const PRICE_ORACLE_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const ALPACA_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const BASIC_MULTIPLIER = 10000;
  const PLAY_MULTIPLIER = 20000;
  const MAX_FEE = 10;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let lottery: Signer;
  
  let wbnbToken: MockWBNB;

  /// Pancakeswap-related instance(s)
  let factoryV2: PancakeFactory;
  let routerV2: PancakeRouterV2;
  let lpAlpacaBusd: PancakePair;
  let lpPlayBusd: PancakePair;
  let lpAlpacaWbnb: PancakePair;

  let alpacaToken: MockERC20;
  let busdToken: MockERC20;

  let alpacaFairLaunch: MockAlpacaFairLaunch;
  let alpacaVaultAlpaca: MockAlpacaVault;
  let alpacaVaultBusd: MockAlpacaVault;
  let alpacaVaultWbnb: MockAlpacaVault;

  let playToken: PlayToken;
  let playDistributor: PlayDistributor;

  let strategyAlpacaAlpaca: StrategyAlpaca;
  let strategyAlpacaBusd: StrategyAlpaca;
  let strategyAlpacaWbnb: StrategyAlpaca;

  let vaultAlpacaStrategyAlpaca: Vault;
  let vaultAlpacaStrategyBusd: Vault;
  let vaultAlpacaStrategyWbnb: Vault;
  let vaultWithoutStrategyPlay: Vault;
  
  let alpacaTokenAsDeployer: MockERC20;
  let busdTokenAsDeployer: MockERC20;

  let vaultAlpacaStrategyAlpacaAsDeployer: Vault;  
  let vaultAlpacaStrategyBusdAsDeployer: Vault;

  let safu: Fund;
  let playToTheMoon: Fund;
  let operator: Fund;

  let safuAsDeployer: Fund;
  let safuAsAlice: Fund;
  let playToTheMoonAsDeployer: Fund;
  let playToTheMoonAsAlice: Fund;
  let operatorAsDeployer: Fund;
  let operatorAsAlice: Fund;

  let config: Config;
  let configAsDeployer: Config;
  
  beforeEach(async() => {
    [deployer, alice, bob, lottery] = await ethers.getSigners();
    
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

    const MockERC20 = (await ethers.getContractFactory(
      "MockERC20",
      deployer
    )) as MockERC20__factory;

    alpacaToken = await MockERC20.deploy("AlpacaToken", "ALPACA");
    await alpacaToken.deployed();

    busdToken = await MockERC20.deploy("BusdToken", "BUSD");
    await busdToken.deployed();

    const Config = (await ethers.getContractFactory(
      "Config",
      deployer
    )) as Config__factory;
    config = await Config.deploy(await lottery.getAddress(), routerV2.address, factoryV2.address, wbnbToken.address, PRICE_ORACLE_ADDRESS, busdToken.address, MAX_FEE);
    await config.deployed();
    
    const Fund = (await ethers.getContractFactory(
      "Fund",
      deployer
    )) as Fund__factory;
    playToTheMoon = await Fund.deploy(config.address, true);
    await playToTheMoon.deployed();
    safu = await Fund.deploy(config.address, false);
    await safu.deployed();
    operator = await Fund.deploy(config.address, false);
    await operator.deployed();

    // Deploy PLAYs
    const PlayToken = (await ethers.getContractFactory(
      "PlayToken",
      deployer
    )) as PlayToken__factory;
    playToken = await PlayToken.deploy();
    await playToken.deployed();
    
    playToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    playToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));
    playToken.mint(playToTheMoon.address, ethers.utils.parseEther('1000'));
    playToken.mint(safu.address, ethers.utils.parseEther('1000'));
    playToken.mint(operator.address, ethers.utils.parseEther('1000'));

    await alpacaToken.mint(playToTheMoon.address, ethers.utils.parseEther('1000'));
    await alpacaToken.mint(operator.address, ethers.utils.parseEther('1000'));
    await alpacaToken.mint(safu.address, ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));

    await busdToken.mint(playToTheMoon.address, ethers.utils.parseEther('1000'));
    await busdToken.mint(operator.address, ethers.utils.parseEther('1000'));
    await busdToken.mint(safu.address, ethers.utils.parseEther('1000'));
    await busdToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    await busdToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));
    
    /// Setup token0 token1 pair on Pancakeswap
    await factoryV2.createPair(alpacaToken.address, busdToken.address);
    lpAlpacaBusd = PancakePair__factory.connect(await factoryV2.getPair(alpacaToken.address, busdToken.address), deployer);
    await lpAlpacaBusd.deployed();
    await factoryV2.createPair(alpacaToken.address, wbnbToken.address);
    lpAlpacaWbnb = PancakePair__factory.connect(await factoryV2.getPair(alpacaToken.address, wbnbToken.address), deployer);
    await lpAlpacaWbnb.deployed();
    await factoryV2.createPair(playToken.address, busdToken.address);
    lpPlayBusd = PancakePair__factory.connect(await factoryV2.getPair(playToken.address, busdToken.address), deployer);
    await lpPlayBusd.deployed();
    
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

    // Deployer adds 1 WBNB + 1 ALPACA
    await alpacaToken.approve(routerV2.address, ethers.utils.parseEther('1'));
    await routerV2.addLiquidityETH(alpacaToken.address, ethers.utils.parseEther('1'), '0', '0', await deployer.getAddress(), FOREVER, {value: ethers.utils.parseEther('1')});

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
    
    // Setup PlayDistributor contract
    // Deploy PlayDistributor
    const PlayDistributor = (await ethers.getContractFactory(
      "PlayDistributor",
      deployer
    )) as PlayDistributor__factory;
    playDistributor = await PlayDistributor.deploy(playToken.address, PLAY_REWARD_PER_BLOCK, await (deployer.getAddress()), playToTheMoon.address, config.address);
    await playDistributor.deployed();

    await playToken.transferOwnership(playDistributor.address);

    const StrategyAlpaca = (await ethers.getContractFactory(
      "StrategyAlpaca",
      deployer
    )) as StrategyAlpaca__factory;

    strategyAlpacaAlpaca = await StrategyAlpaca.deploy(
      alpacaVaultAlpaca.address, alpacaToken.address, 0, [alpacaToken.address, alpacaToken.address], config.address, alpacaToken.address, alpacaFairLaunch.address, safu.address)
    await strategyAlpacaAlpaca.deployed();

    strategyAlpacaBusd = await StrategyAlpaca.deploy(
      alpacaVaultBusd.address, busdToken.address, 1, [alpacaToken.address, busdToken.address], config.address, alpacaToken.address, alpacaFairLaunch.address, safu.address)
    await strategyAlpacaBusd.deployed();

    strategyAlpacaWbnb = await StrategyAlpaca.deploy(
      alpacaVaultWbnb.address, wbnbToken.address, 2, [alpacaToken.address, wbnbToken.address], config.address, alpacaToken.address, alpacaFairLaunch.address, safu.address)
    await strategyAlpacaWbnb.deployed();

    const Vault = (await ethers.getContractFactory(
      "Vault",
      deployer
    )) as Vault__factory;

    vaultAlpacaStrategyAlpaca = await Vault.deploy(
      playDistributor.address, alpacaToken.address, strategyAlpacaAlpaca.address, await lottery.getAddress(), playToTheMoon.address,
      safu.address, operator.address, config.address, playToken.address, "pAlpacaToken", "pALPACA", 18)
    await vaultAlpacaStrategyAlpaca.deployed();

    await strategyAlpacaAlpaca.transferOwnership(vaultAlpacaStrategyAlpaca.address);

    vaultAlpacaStrategyBusd = await Vault.deploy(
      playDistributor.address, busdToken.address, strategyAlpacaBusd.address, await lottery.getAddress(), playToTheMoon.address,
      safu.address, operator.address, config.address, playToken.address, "pBusdToken", "pBUSD", 18)
    await vaultAlpacaStrategyBusd.deployed();

    await strategyAlpacaBusd.transferOwnership(vaultAlpacaStrategyBusd.address);

    vaultAlpacaStrategyWbnb = await Vault.deploy(
      playDistributor.address, wbnbToken.address, strategyAlpacaWbnb.address, await lottery.getAddress(), playToTheMoon.address,
      safu.address, operator.address, config.address, playToken.address, "pWbnbToken", "pWBNB", 18)
    await vaultAlpacaStrategyWbnb.deployed();

    await strategyAlpacaWbnb.transferOwnership(vaultAlpacaStrategyWbnb.address);

    vaultWithoutStrategyPlay = await Vault.deploy(
      playDistributor.address, playToken.address, ADDRESS0, await lottery.getAddress(), playToTheMoon.address,
      safu.address, operator.address,config.address, playToken.address, "pPlayToken", "pPlay", 18)
    await vaultWithoutStrategyPlay.deployed();

    await playDistributor.addPool(0, vaultAlpacaStrategyAlpaca.address, 0, BASIC_MULTIPLIER, 0, false);
    await playDistributor.addPool(0, vaultAlpacaStrategyBusd.address, 0, BASIC_MULTIPLIER, 0, false);
    await playDistributor.addPool(0, vaultAlpacaStrategyWbnb.address, 0, BASIC_MULTIPLIER, 0, false);
    await playDistributor.addPool(0, vaultWithoutStrategyPlay.address, 0, PLAY_MULTIPLIER, 0, false);

    alpacaTokenAsDeployer = MockERC20__factory.connect(alpacaToken.address, deployer);
    busdTokenAsDeployer = MockERC20__factory.connect(busdToken.address, deployer);

    vaultAlpacaStrategyAlpacaAsDeployer = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, deployer);
    vaultAlpacaStrategyBusdAsDeployer = Vault__factory.connect(vaultAlpacaStrategyBusd.address, deployer);

    await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('1'));
    await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('1'));

    await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('1'));
    await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('1'));

    playToTheMoonAsDeployer = Fund__factory.connect(playToTheMoon.address, deployer);
    playToTheMoonAsAlice = Fund__factory.connect(playToTheMoon.address, alice);
    safuAsDeployer = Fund__factory.connect(safu.address, deployer);
    safuAsAlice = Fund__factory.connect(safu.address, alice);
    operatorAsDeployer = Fund__factory.connect(operator.address, deployer);
    operatorAsAlice = Fund__factory.connect(operator.address, alice);

    configAsDeployer = Config__factory.connect(config.address, deployer);
    await configAsDeployer.setSwapWhiteList(playToken.address, true);
    await configAsDeployer.setSwapWhiteList(busdToken.address, true);
    await configAsDeployer.setSwapWhiteList(alpacaToken.address, true);
    await configAsDeployer.setSwapWhiteList(wbnbToken.address, true);
  });

  context('when adjust params', async() => {
    it('constructor', async() => {
      const Fund = (await ethers.getContractFactory(
        "Fund",
        deployer
      )) as Fund__factory;
  
      await expect(Fund.deploy(ADDRESS0, true)).to.be.revertedWith('config_ cant be zero');
    });
  });

  context('permissions', async() => {
    it('only owner can access fund', async() => {
        await expect(playToTheMoonAsAlice.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(playToTheMoonAsAlice.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(playToTheMoonAsAlice.transfer(playToken.address, await alice.getAddress(), ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(playToTheMoonAsAlice.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), FOREVER))
        .to.be.reverted;
        await expect(playToTheMoonAsAlice.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
        .to.be.reverted;
        await expect(playToTheMoonAsAlice.removeLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
        .to.be.reverted;
        await expect(playToTheMoonAsAlice.wrapBNB())
        .to.be.reverted;
        await expect(playToTheMoonAsAlice.unwrapBNB())
        .to.be.reverted;
        await expect(safuAsAlice.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(safuAsAlice.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(safuAsAlice.transfer(playToken.address, await alice.getAddress(), ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(safuAsAlice.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), FOREVER))
        .to.be.reverted;
        await expect(safuAsAlice.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
        .to.be.reverted;
        await expect(safuAsAlice.removeLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
        .to.be.reverted;
        await expect(safuAsAlice.wrapBNB())
        .to.be.reverted;
        await expect(safuAsAlice.unwrapBNB())
        .to.be.reverted;
        await expect(operatorAsAlice.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(operatorAsAlice.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(operatorAsAlice.transfer(playToken.address, await alice.getAddress(), ethers.utils.parseEther('1')))
        .to.be.reverted;
        await expect(operatorAsAlice.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), FOREVER))
        .to.be.reverted;
        await expect(operatorAsAlice.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
        .to.be.reverted;
        await expect(operatorAsAlice.removeLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
        .to.be.reverted;
        await expect(operatorAsAlice.wrapBNB())
        .to.be.reverted;
        await expect(operatorAsAlice.unwrapBNB())
        .to.be.reverted;
    });

    it('playToTheMoon cant transfer anything', async() => {
      await expect(playToTheMoonAsDeployer.transfer(playToken.address, await deployer.getAddress(), ethers.utils.parseEther('1')))
      .to.be.revertedWith('PlayToTheMoonFund cant transfer anything');
    });
  });
  
  context('deposit/withdraw', async() => {
    it('should work - case 1', async() => {
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));

      // play th toe moon - deposit play
      await playToTheMoonAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit play
      await safuAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit play
      await operatorAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play th toe moon - deposit busd
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit busd
      await safuAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit busd
      await operatorAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play to the moon - deposit alpaca
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit alpaca
      await safuAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit alpaca
      await operatorAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play th toe moon - withdraw play
      await expect(playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw play
      await expect(safuAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw play
      await expect(operatorAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));

      // play th toe moon - withdraw busd
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw busd
      await expect(safuAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw busd
      await expect(operatorAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));

      // play to the moon - withdraw alpaca
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw alpaca
      await expect(safuAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw alpaca
      await expect(operatorAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));
    });

    it('should work - case 2', async() => {
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));

      // play th toe moon - deposit play
      await playToTheMoonAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit play
      await safuAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit play
      await operatorAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play th toe moon - deposit busd
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit busd
      await safuAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit busd
      await operatorAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play to the moon - deposit alpaca
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit alpaca
      await safuAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit alpaca
      await operatorAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));
      
      // play th toe moon - withdraw play
      await expect(playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      await playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw play
      await expect(safuAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultWithoutStrategyPlay.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('50'));
      await safuAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw play
      await expect(operatorAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultWithoutStrategyPlay.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('50'));
      await operatorAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));

      // play th toe moon - withdraw busd
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw busd
      await expect(safuAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('50'));
      await safuAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw busd
      await expect(operatorAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('50'));
      await operatorAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));

      // play to the moon - withdraw alpaca
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw alpaca
      await expect(safuAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('50'));
      await safuAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw alpaca
      await expect(operatorAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('50'));
      await operatorAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));
    });

    it('should work - case 3', async() => {
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));

      // play th toe moon - deposit play
      await playToTheMoonAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      await playToTheMoonAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit play
      await safuAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultWithoutStrategyPlay.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('50'));
      await safuAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit play
      await operatorAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultWithoutStrategyPlay.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('50'));
      await operatorAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultWithoutStrategyPlay.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play th toe moon - deposit busd
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit busd
      await safuAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('50'));
      await safuAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit busd
      await operatorAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('50'));
      await operatorAsDeployer.deposit(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play to the moon - deposit alpaca
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // safu - deposit alpaca
      await safuAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('50'));
      await safuAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('100'));

      // operator - deposit alpaca
      await operatorAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('50'));
      await operatorAsDeployer.deposit(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('50'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('900'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play th toe moon - withdraw play
      await expect(playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw play
      await expect(safuAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw play
      await expect(operatorAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));

      // play th toe moon - withdraw busd
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw busd
      await expect(safuAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw busd
      await expect(operatorAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyBusd.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));

      // play to the moon - withdraw alpaca
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));

      // safu - withdraw alpaca
      await expect(safuAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await safuAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));

      // operator - withdraw alpaca
      await expect(operatorAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await operatorAsDeployer.withdraw(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultAlpacaStrategyAlpaca.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('0'));
    });
    
    it('should work - case 4', async() => {
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await alpacaToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));

      // play th toe moon - deposit play
      await playToTheMoonAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('950'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      
      // play th toe moon - withdraw play
      await playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('25'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('975'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('25'));

      // play th toe moon - deposit play
      await playToTheMoonAsDeployer.deposit(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('50'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('925'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('75'));
      
      // play th toe moon - withdraw play
      await playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('75'));
      expect(await playToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect(await vaultWithoutStrategyPlay.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
    });

    it('should work - case 5', async() => {
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: playToTheMoon.address,
        value: ethers.utils.parseEther("100")
      });

      await playToTheMoonAsDeployer.wrapBNB();
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));
      // play th toe moon - deposit wbnb
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('100'));
      expect(await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play th toe moon - withdraw wbnb
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('99'));
      expect(await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1'));

      // play th toe moon - deposit wbnb
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('100'))).to.be.reverted;
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('99'));
      expect(await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));

      // play th toe moon - withdraw wbnb
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('98'));
      expect(await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('2'));
    });

    it('should work - case 6', async() => {
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: playToTheMoon.address,
        value: ethers.utils.parseEther("100")
      });

      // play th toe moon - deposit wbnb
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('100'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));
      
      // play th toe moon - withdraw wbnb
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('50'));
      expect(await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('49'));
      expect(await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1'));
    });

    it('should work - case 7', async() => {
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: playToTheMoon.address,
        value: ethers.utils.parseEther("100")
      });

      // play th toe moon - deposit wbnb
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('50'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('50'));
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('50'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('100'));
      
      // play th toe moon - withdraw wbnb
      await expect(playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('101'))).to.be.reverted;
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('99'));
      expect(await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1'));
    });

    it('should work - case 8', async() => {
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: playToTheMoon.address,
        value: ethers.utils.parseEther("100")
      });

      // play th toe moon - deposit wbnb
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('10'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('10'));
      
      // play th toe moon - withdraw wbnb
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('5'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('5'));

      // play th toe moon - deposit wbnb
      await playToTheMoonAsDeployer.deposit(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('50'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('55'));
      
      // play th toe moon - withdraw wbnb
      await playToTheMoonAsDeployer.withdraw(vaultAlpacaStrategyWbnb.address, ethers.utils.parseEther('49'));
      expect(await vaultAlpacaStrategyWbnb.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('6'));
    });

    it('params', async() => {
      await expect(playToTheMoonAsDeployer.deposit(ADDRESS0, ethers.utils.parseEther('1')))
      .to.be.revertedWith('vault cant be zero');

      await expect(playToTheMoonAsDeployer.withdraw(ADDRESS0, ethers.utils.parseEther('1')))
      .to.be.revertedWith('vault cant be zero');

      await expect(playToTheMoonAsDeployer.withdraw(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('10000000')))
      .to.be.revertedWith('balance not enough');
    });
  });

  context('transfer', async() => {
    it('should work', async() => {
      await expect(playToTheMoonAsDeployer.transfer(playToken.address, await deployer.getAddress(), ethers.utils.parseEther('1')))
      .to.be.revertedWith('PlayToTheMoonFund cant transfer anything');

      // operator transfer play to bob
      expect (await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await operatorAsDeployer.transfer(playToken.address, await bob.getAddress(), ethers.utils.parseEther('1'));
      expect (await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('999'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1'));
      
      // operator transfer alpaca to bob
      expect (await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await operatorAsDeployer.transfer(busdToken.address, await bob.getAddress(), ethers.utils.parseEther('1'));
      expect (await busdToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('999'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1'));

      // safu transfer play to bob
      expect (await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1'));
      await safuAsDeployer.transfer(playToken.address, await bob.getAddress(), ethers.utils.parseEther('1'));
      expect (await playToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('999'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('2'));
      
      // safu transfer alpaca to bob
      expect (await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1'));
      await safuAsDeployer.transfer(busdToken.address, await bob.getAddress(), ethers.utils.parseEther('1'));
      expect (await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('999'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('2'));
      
      // insufficient amount
      expect (await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('999'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('2'));
      await expect (operatorAsDeployer.transfer(playToken.address, await bob.getAddress(), ethers.utils.parseEther('1000')))
      .to.be.revertedWith('balance not enough');
      expect (await playToken.balanceOf(operator.address)).to.be.eq(ethers.utils.parseEther('999'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('2'));

      // insufficient amount
      expect (await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('999'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('2'));
      await expect (safuAsDeployer.transfer(busdToken.address, await bob.getAddress(), ethers.utils.parseEther('1000')))
      .to.be.revertedWith('balance not enough');
      expect (await busdToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('999'));
      expect (await busdToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('2'));
    });

    it ('should work - case 2', async() => {
      expect (await wbnbToken.balanceOf(safu.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: safu.address,
        value: ethers.utils.parseEther("1")
      });

      await safuAsDeployer.wrapBNB();
      expect (await wbnbToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1'));

      // safu transfer play to bob
      expect (await wbnbToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('1'));
      expect (await wbnbToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      const before = await bob.getBalance();
      await safuAsDeployer.transfer(wbnbToken.address, await bob.getAddress(), ethers.utils.parseEther('1'));
      expect (await wbnbToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));
      const after = await bob.getBalance();
      expect (before.add(ethers.utils.parseEther('1'))).to.be.eq(after);
    });

    it ('should work - case 3', async() => {
      expect (await wbnbToken.balanceOf(safu.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: safu.address,
        value: ethers.utils.parseEther("1")
      });

      // safu transfer play to bob
      expect (await wbnbToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));
      const before = await bob.getBalance();
      await safuAsDeployer.transfer(wbnbToken.address, await bob.getAddress(), ethers.utils.parseEther('1'));
      expect (await wbnbToken.balanceOf(safu.address)).to.be.eq(ethers.utils.parseEther('0'));
      const after = await bob.getBalance();
      expect (before.add(ethers.utils.parseEther('1'))).to.be.eq(after);
    });

    it('params', async() => {
      await expect(playToTheMoonAsDeployer.transfer(ADDRESS0, await deployer.getAddress(), ethers.utils.parseEther('1')))
      .to.be.reverted;

      await expect(safuAsDeployer.transfer(playToken.address, ADDRESS0, ethers.utils.parseEther('1')))
      .to.be.reverted;

      await expect(operatorAsDeployer.transfer(playToken.address, await deployer.getAddress(), ethers.utils.parseEther('0')))
      .to.be.revertedWith('amount should be larger than zero');
    });
  });

  context('swap', async() => {
    it('should work', async() => {
      await playToTheMoonAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      
      await playToTheMoonAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);

      await playToTheMoonAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      
      await playToTheMoonAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);

      await expect(playToTheMoonAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('1'), FOREVER))
      .to.be.revertedWith('balance not enough');
      await expect(safuAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('1'), FOREVER))
      .to.be.revertedWith('balance not enough');
      await expect(operatorAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('1'), FOREVER))
      .to.be.revertedWith('balance not enough');
    });

    it('params', async() => {
      await expect(playToTheMoonAsDeployer.swap(ADDRESS0, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), FOREVER))
      .to.be.reverted;
      await expect(playToTheMoonAsDeployer.swap(busdToken.address, ADDRESS0, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), FOREVER))
      .to.be.reverted;

      await expect(playToTheMoonAsDeployer.swap(playToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), FOREVER))
      .to.be.revertedWith('cant swap');

      await expect(playToTheMoonAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('0'), ethers.utils.parseEther('1'), FOREVER))
      .to.be.revertedWith('amountIn should be larger than zero');
    });
    
    it ('whitelist', async() => {
      await configAsDeployer.setSwapWhiteList(playToken.address, false);
      await configAsDeployer.setSwapWhiteList(busdToken.address, false);
      await configAsDeployer.setSwapWhiteList(alpacaToken.address, false);
      
      await expect(playToTheMoonAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      
      await expect(playToTheMoonAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;

      await expect(playToTheMoonAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      
      await expect(playToTheMoonAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;

      await configAsDeployer.setSwapWhiteList(playToken.address, true);

      await expect(playToTheMoonAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      
      await expect(playToTheMoonAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;

      await expect(playToTheMoonAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      
      await expect(playToTheMoonAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;

      await configAsDeployer.setSwapWhiteList(busdToken.address, true);

      await playToTheMoonAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      
      await playToTheMoonAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);

      await expect(playToTheMoonAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      
      await expect(playToTheMoonAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(safuAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;
      await expect(operatorAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER)).to.be.reverted;

      await configAsDeployer.setSwapWhiteList(alpacaToken.address, true);

      await playToTheMoonAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      
      await playToTheMoonAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);

      await playToTheMoonAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      
      await playToTheMoonAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.swap(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER);
    });
  });

  context('add/removeLiquidity', async() => {
    it('should work', async() => {
      expect (await lpPlayBusd.balanceOf(playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpPlayBusd.balanceOf(safu.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(safu.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpPlayBusd.balanceOf(operator.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(operator.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));

      await playToTheMoonAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);

      await playToTheMoonAsDeployer.addLiquidity(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.addLiquidity(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.addLiquidity(busdToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      
      await playToTheMoonAsDeployer.addLiquidity(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.addLiquidity(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.addLiquidity(alpacaToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      
      await playToTheMoonAsDeployer.addLiquidity(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.addLiquidity(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.addLiquidity(busdToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);

      expect (await lpPlayBusd.balanceOf(playToTheMoon.address)).to.be.bignumber.gt(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(playToTheMoon.address)).to.be.bignumber.gt(ethers.utils.parseEther('0'));
      expect (await lpPlayBusd.balanceOf(safu.address)).to.be.bignumber.gt(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(safu.address)).to.be.bignumber.gt(ethers.utils.parseEther('0'));
      expect (await lpPlayBusd.balanceOf(operator.address)).to.be.bignumber.gt(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(operator.address)).to.be.bignumber.gt(ethers.utils.parseEther('0'));

      await playToTheMoonAsDeployer.removeLiquidity(playToken.address, busdToken.address, await lpPlayBusd.balanceOf(playToTheMoon.address), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.removeLiquidity(playToken.address, busdToken.address, await lpPlayBusd.balanceOf(safu.address), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.removeLiquidity(playToken.address, busdToken.address, await lpPlayBusd.balanceOf(operator.address), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);

      await playToTheMoonAsDeployer.removeLiquidity(alpacaToken.address, busdToken.address, await lpAlpacaBusd.balanceOf(playToTheMoon.address), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await safuAsDeployer.removeLiquidity(alpacaToken.address, busdToken.address, await lpAlpacaBusd.balanceOf(safu.address), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      await operatorAsDeployer.removeLiquidity(alpacaToken.address, busdToken.address, await lpAlpacaBusd.balanceOf(operator.address), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      
      expect (await lpPlayBusd.balanceOf(playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpPlayBusd.balanceOf(safu.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(safu.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpPlayBusd.balanceOf(operator.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect (await lpAlpacaBusd.balanceOf(operator.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));

      await expect(playToTheMoonAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');
      await expect(playToTheMoonAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('10000'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');

      await expect(safuAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');
      await expect(safuAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('10000'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');
      
      await expect(operatorAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');
      await expect(operatorAsDeployer.addLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('10000'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');

      await expect(playToTheMoonAsDeployer.removeLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');

      await expect(safuAsDeployer.removeLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');
      
      await expect(operatorAsDeployer.removeLiquidity(playToken.address, busdToken.address, ethers.utils.parseEther('10000'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('balance not enough');
    });
    
    it('should work - case 2', async() => {
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: playToTheMoon.address,
        value: ethers.utils.parseEther("1")
      });

      await playToTheMoonAsDeployer.wrapBNB();
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1'));
      expect (await lpAlpacaWbnb.balanceOf(playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      await playToTheMoonAsDeployer.addLiquidity(wbnbToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      expect (await lpAlpacaWbnb.balanceOf(playToTheMoon.address)).to.be.bignumber.gt(ethers.utils.parseEther('0'));
      await playToTheMoonAsDeployer.removeLiquidity(alpacaToken.address, wbnbToken.address, await lpAlpacaWbnb.balanceOf(playToTheMoon.address), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      expect (await lpAlpacaWbnb.balanceOf(playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('should work - case 3', async() => {
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: playToTheMoon.address,
        value: ethers.utils.parseEther("1")
      });

      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect (await lpAlpacaWbnb.balanceOf(playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      await playToTheMoonAsDeployer.addLiquidity(wbnbToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      expect (await lpAlpacaWbnb.balanceOf(playToTheMoon.address)).to.be.bignumber.gt(ethers.utils.parseEther('0'));
      await playToTheMoonAsDeployer.removeLiquidity(alpacaToken.address, wbnbToken.address, await lpAlpacaWbnb.balanceOf(playToTheMoon.address), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER);
      expect (await lpAlpacaWbnb.balanceOf(playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('params', async() => {
      await expect(playToTheMoonAsDeployer.addLiquidity(ADDRESS0, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.reverted;
      await expect(playToTheMoonAsDeployer.addLiquidity(busdToken.address, ADDRESS0, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.reverted;
      await expect(playToTheMoonAsDeployer.removeLiquidity(ADDRESS0, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.reverted;
      await expect(playToTheMoonAsDeployer.removeLiquidity(busdToken.address, ADDRESS0, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.reverted;

      await expect(playToTheMoonAsDeployer.addLiquidity(playToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('cant add liquidity');
      await expect(playToTheMoonAsDeployer.removeLiquidity(playToken.address, playToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('cant remove liquidity');

      await expect(playToTheMoonAsDeployer.addLiquidity(playToken.address, alpacaToken.address, ethers.utils.parseEther('0'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('amountADesired should be larger than zero');
      await expect(playToTheMoonAsDeployer.addLiquidity(playToken.address, alpacaToken.address, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('amountBDesired should be larger than zero');
      await expect(playToTheMoonAsDeployer.removeLiquidity(playToken.address, alpacaToken.address, ethers.utils.parseEther('0'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), FOREVER))
      .to.be.revertedWith('liquidity should be larger than zero');
    });
  });

  context('wrap/unwrapBNB', async() => {
    it('should work', async() => {
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(0);

      // Send 1 ether to an ens name.
      const tx = await deployer.sendTransaction({
        to: playToTheMoon.address,
        value: ethers.utils.parseEther("1")
      });

      await playToTheMoonAsDeployer.wrapBNB();
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(ethers.utils.parseEther('1'));

      await playToTheMoonAsDeployer.unwrapBNB();
      expect (await wbnbToken.balanceOf(playToTheMoon.address)).to.be.eq(0);
    });
  });
});