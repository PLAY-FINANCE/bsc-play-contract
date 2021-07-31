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
import { ethers } from "hardhat";
import { Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import "@openzeppelin/test-helpers";
import {
  PlayToken,
  PlayToken__factory,
  MockPancakeMasterChef,
  MockPancakeMasterChef__factory,
  StrategyPancake,
  StrategyPancake__factory,
  PlayDistributor,
  PlayDistributor__factory,
  MockERC20,
  MockERC20__factory,
  Vault,
  Vault__factory,
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

chai.use(solidity);
const { expect } = chai;

describe("VaultPancakeStrategy", function() {
  this.timeout(0);
  const FOREVER = '2000000000';
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const PRICE_ORACLE_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const CAKE_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const BASIC_MULTIPLIER = 10000;
  const PLAY_MULTIPLIER = 20000;
  const OPERATOR_FEE = 100;
  const SAFU_FEE = 200;
  const DENOMINATOR_FEE = 10000;
  const MAX_FEE = 10;
  const REF_PRICE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000001'

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

  let playToken: PlayToken;
  let cakeToken: MockERC20;
  let syrupToken: MockERC20;

  let masterChef: MockPancakeMasterChef;

  let playDistributor: PlayDistributor;

  let strategyPancakeCake: StrategyPancake;

  let vaultPancakeStrategyCake: Vault;
  
  let cakeTokenAsDeployer: MockERC20;
  let cakeTokenAsAlice: MockERC20;
  let cakeTokenAsBob: MockERC20;
  let cakeTokenAsPlayToTheMoon: MockERC20;
  let cakeTokenAsSafu: MockERC20;
  let cakeTokenAsOperator: MockERC20;

  let vaultPancakeStrategyCakeAsDeployer: Vault;
  let vaultPancakeStrategyCakeAsAlice: Vault;
  let vaultPancakeStrategyCakeAsBob: Vault;
  let vaultPancakeStrategyCakeAsLottery: Vault;
  let vaultPancakeStrategyCakeAsPlayToTheMoon: Vault;
  let vaultPancakeStrategyCakeAsSafu: Vault;
  let vaultPancakeStrategyCakeAsOperator: Vault;

  let config: Config;
  let configAsLottery: Config;

  let strategyPancakeCakeAsAlice: StrategyPancake;
  let strategyPancakeCakeAsDeployer: StrategyPancake;
  let strategyPancakeCakeAsLottery: StrategyPancake;
  let strategyPancakeCakeAsPlayToTheMoon: StrategyPancake;

  let masterChefAsDeployer: MockPancakeMasterChef;

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

    const MockERC20 = (await ethers.getContractFactory(
      "MockERC20",
      deployer
    )) as MockERC20__factory;

    cakeToken = await MockERC20.deploy("CAKE", "CAKE");
    await cakeToken.deployed();
    await cakeToken.mint(await playToTheMoon.getAddress(), ethers.utils.parseEther('1000'));
    await cakeToken.mint(await operator.getAddress(), ethers.utils.parseEther('1000'));
    await cakeToken.mint(await safu.getAddress(), ethers.utils.parseEther('1000'));
    await cakeToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    await cakeToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));
    await cakeToken.mint(await bob.getAddress(), ethers.utils.parseEther('1000'));

    syrupToken = await MockERC20.deploy("SYRUP", "SYRUP");
    await syrupToken.deployed();

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
    
    // Setup FairLaunch contract
    const MockPancakeMasterChef = (await ethers.getContractFactory(
      "MockPancakeMasterChef",
      deployer
    )) as MockPancakeMasterChef__factory;
    masterChef = await MockPancakeMasterChef.deploy(cakeToken.address, syrupToken.address, (await deployer.getAddress()), CAKE_REWARD_PER_BLOCK, 0);
    await masterChef.deployed();

    await cakeToken.transferOwnership(masterChef.address);
    await syrupToken.transferOwnership(masterChef.address);
    
    const Config = (await ethers.getContractFactory(
      "Config",
      deployer
    )) as Config__factory;
    config = await Config.deploy(await lottery.getAddress(), routerV2.address, factoryV2.address, wbnbToken.address, PRICE_ORACLE_ADDRESS, REF_PRICE_TOKEN_ADDRESS, MAX_FEE);
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

    const StrategyPancake = (await ethers.getContractFactory(
      "StrategyPancake",
      deployer
    )) as StrategyPancake__factory;

    strategyPancakeCake = await StrategyPancake.deploy(cakeToken.address, 0, [cakeToken.address, cakeToken.address], config.address, cakeToken.address, masterChef.address, await safu.getAddress())
    await strategyPancakeCake.deployed();

    const Vault = (await ethers.getContractFactory(
      "Vault",
      deployer
    )) as Vault__factory;

    vaultPancakeStrategyCake = await Vault.deploy(
      playDistributor.address, cakeToken.address, strategyPancakeCake.address, await lottery.getAddress(), await playToTheMoon.getAddress(),
      await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pCakeToken", "pCAKE", 18)
    await vaultPancakeStrategyCake.deployed();

    await strategyPancakeCake.transferOwnership(vaultPancakeStrategyCake.address);

    await playDistributor.addPool(0, vaultPancakeStrategyCake.address, 0, BASIC_MULTIPLIER, 0, false);
    expect(await vaultPancakeStrategyCake.getPoolId()).to.be.eq(0);

    vaultPancakeStrategyCakeAsDeployer = Vault__factory.connect(vaultPancakeStrategyCake.address, deployer);
    vaultPancakeStrategyCakeAsAlice = Vault__factory.connect(vaultPancakeStrategyCake.address, alice);
    vaultPancakeStrategyCakeAsBob = Vault__factory.connect(vaultPancakeStrategyCake.address, bob);
    vaultPancakeStrategyCakeAsLottery = Vault__factory.connect(vaultPancakeStrategyCake.address, lottery);
    vaultPancakeStrategyCakeAsPlayToTheMoon = Vault__factory.connect(vaultPancakeStrategyCake.address, playToTheMoon);
    vaultPancakeStrategyCakeAsSafu = Vault__factory.connect(vaultPancakeStrategyCake.address, safu);
    vaultPancakeStrategyCakeAsOperator = Vault__factory.connect(vaultPancakeStrategyCake.address, operator);

    cakeTokenAsDeployer = MockERC20__factory.connect(cakeToken.address, deployer);
    cakeTokenAsAlice = MockERC20__factory.connect(cakeToken.address, alice);
    cakeTokenAsBob = MockERC20__factory.connect(cakeToken.address, bob);
    cakeTokenAsPlayToTheMoon = MockERC20__factory.connect(cakeToken.address, playToTheMoon);
    cakeTokenAsSafu = MockERC20__factory.connect(cakeToken.address, safu);
    cakeTokenAsOperator = MockERC20__factory.connect(cakeToken.address, operator);

    await cakeTokenAsDeployer.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('1'));
    await vaultPancakeStrategyCakeAsDeployer.deposit(ethers.utils.parseEther('1'));

    configAsLottery = Config__factory.connect(config.address, lottery);
    await configAsLottery.setFeeInfo(0, 100, 100, 100, 100, 10000);
    await vaultPancakeStrategyCakeAsLottery.setLotteryType(0);

    strategyPancakeCakeAsAlice = StrategyPancake__factory.connect(strategyPancakeCake.address, alice);
    strategyPancakeCakeAsDeployer = StrategyPancake__factory.connect(strategyPancakeCake.address, deployer);
    strategyPancakeCakeAsLottery = StrategyPancake__factory.connect(strategyPancakeCake.address, lottery);
    strategyPancakeCakeAsPlayToTheMoon = StrategyPancake__factory.connect(strategyPancakeCake.address, playToTheMoon);

    masterChefAsDeployer = MockPancakeMasterChef__factory.connect(masterChef.address, deployer);
  });

  context('deposit and withdraw', async() => { 
    it('should work', async() => {
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // exceed approval balance
      await expect (vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // exceed approval balance
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await expect (vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('101'))).to.be.reverted;
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // exceed wallet balance
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('1000'));
      await expect (vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('1001'))).to.be.reverted;
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // exceed withdraw balance
      await expect(vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('1000'))).to.be.reverted;
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq('0');

      // Alice - deposit 1
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - deposit 2
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('800'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('200'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // Alice - withdraw 1
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - deposit 3
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('50'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('850'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('150'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - withdraw 2
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('150'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - deposit 4
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('1000'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Alice - withdraw 3
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // PlayToTheMoon - deposit 1
      await cakeTokenAsPlayToTheMoon.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      
      // PlayToTheMoon -  withdraw 1
      await vaultPancakeStrategyCakeAsPlayToTheMoon.withdraw(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // SAFU - deposit 1
      await cakeTokenAsSafu.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      
      // SAFU -  withdraw 1
      await vaultPancakeStrategyCakeAsSafu.withdraw(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // Operator - deposit 1
      await cakeTokenAsOperator.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      
      // Operator -  withdraw 1
      await vaultPancakeStrategyCakeAsOperator.withdraw(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
    });
  });

  context('permissions', async() => {
    it ('to be reverted', async() => {
      await expect(strategyPancakeCakeAsAlice.setGovAddress(await alice.getAddress())).to.be.revertedWith("permission denied");
      await expect(strategyPancakeCakeAsLottery.setGovAddress(await lottery.getAddress())).to.be.revertedWith("permission denied");
      await expect(strategyPancakeCakeAsPlayToTheMoon.setGovAddress(await playToTheMoon.getAddress())).to.be.revertedWith("permission denied");

      await expect(strategyPancakeCakeAsAlice.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyPancakeCakeAsLottery.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
      await expect(strategyPancakeCakeAsPlayToTheMoon.transferCompenstationToken(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");

      await expect(strategyPancakeCakeAsDeployer.transferCompenstationToken(cakeToken.address, ethers.utils.parseEther('1'))).to.be.revertedWith("permission denied");
    })
  });

  context('when adjust params', async() => {
    it('should work', async() => {
      expect (await vaultPancakeStrategyCake.isPrizeVault()).to.be.eq(false);

      const StrategyPancake = (await ethers.getContractFactory(
        "StrategyPancake",
        deployer
      )) as StrategyPancake__factory;
  
      await expect(StrategyPancake.deploy(ADDRESS0, 0, [], ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyPancake.deploy(ADDRESS1, 0, [], ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyPancake.deploy(ADDRESS1, 0, [], ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyPancake.deploy(ADDRESS1, 0, [], ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1)).to.be.revertedWith('address cant be zero');
      await expect(StrategyPancake.deploy(ADDRESS1, 0, [], ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0)).to.be.revertedWith('address cant be zero');
    
      await expect(strategyPancakeCakeAsDeployer.setGovAddress(ADDRESS0)).to.be.revertedWith('address cant be zero');
      await expect(strategyPancakeCakeAsDeployer.setGovAddress(await alice.getAddress())).to.emit(strategyPancakeCake, 'SetGovAddress')
          .withArgs(await alice.getAddress());
    });
  });

  context('harvest', async() => {
    it('haverst function is only called by lottery', async() => {
      await expect (vaultPancakeStrategyCakeAsAlice.harvest()).to.be.revertedWith('Only Lottery can call function');
    });

    it('should work - case 1 (cake)', async() => {
      await cakeTokenAsPlayToTheMoon.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));
      await cakeTokenAsSafu.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));
      await cakeTokenAsOperator.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));

      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // alice - cake deposit
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // harvest - cake vault
      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultPancakeStrategyCakeAsLottery.harvest();

      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw cake
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsPlayToTheMoon.withdraw(await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsSafu.withdraw(await vaultPancakeStrategyCake.balanceOf(await safu.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsOperator.withdraw(await vaultPancakeStrategyCake.balanceOf(await operator.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));

      // alice - withdraw cake
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      // alice - deposit cakeToken
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // alice - withdraw cakeToken
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      await expect(vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('51'))).to.be.reverted;
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));
      
      // harvest - cake vault
      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultPancakeStrategyCakeAsLottery.harvest();

      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw cake
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsPlayToTheMoon.withdraw(await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsSafu.withdraw(await vaultPancakeStrategyCake.balanceOf(await safu.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsOperator.withdraw(await vaultPancakeStrategyCake.balanceOf(await operator.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));
    });

    it('should work - case 3', async() => {
      await cakeTokenAsPlayToTheMoon.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));
      await cakeTokenAsSafu.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));
      await cakeTokenAsOperator.transfer(await deployer.getAddress(), ethers.utils.parseEther('1000'));

      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // alice - cake deposit
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // alice - withdraw cake
      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));      
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // harvest - cake vault
      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultPancakeStrategyCakeAsLottery.harvest();

      expect (await vaultPancakeStrategyCakeAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCakeAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));

      // fund - withdraw cake
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsPlayToTheMoon.withdraw(await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsSafu.withdraw(await vaultPancakeStrategyCake.balanceOf(await safu.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));

      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsOperator.withdraw(await vaultPancakeStrategyCake.balanceOf(await operator.getAddress()));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.gt(ethers.utils.parseEther('0'));
      expect (await cakeToken.balanceOf(vaultPancakeStrategyCake.address)).to.be.eq(ethers.utils.parseEther('0'));
    });
    
    it ('should work - case 4', async() => {
      await masterChefAsDeployer.set(0, 0, false);
      await masterChefAsDeployer.add(1, playToken.address, false); // for avoid division by zero caused by totalAllocation is zero
      await vaultPancakeStrategyCakeAsLottery.harvest();
      const _before = await masterChef.userInfo(0, strategyPancakeCake.address);

      await cakeTokenAsPlayToTheMoon.transfer(await strategyPancakeCake.address, ethers.utils.parseEther('1000'));

      expect (await cakeToken.balanceOf(strategyPancakeCake.address)).to.be.eq(ethers.utils.parseEther('1000'));

      await expect(vaultPancakeStrategyCakeAsLottery.harvest()).to.emit(vaultPancakeStrategyCake, 'Harvest').withArgs(ethers.utils.parseEther('1000'));

      expect((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('1000').add(_before[0]));
    });

    it ('should work - case 5', async() => {
      await masterChefAsDeployer.set(0, 0, false);
      await masterChefAsDeployer.add(1, playToken.address, false); // for avoid division by zero caused by totalAllocation is zero
      await vaultPancakeStrategyCakeAsLottery.harvest();
      const _before = await masterChef.userInfo(0, strategyPancakeCake.address);

      await cakeTokenAsPlayToTheMoon.transfer(await strategyPancakeCake.address, ethers.utils.parseEther('1000'));

      expect (await cakeToken.balanceOf(strategyPancakeCake.address)).to.be.eq(ethers.utils.parseEther('1000'));

      // alice - cake deposit
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      await expect(vaultPancakeStrategyCakeAsLottery.harvest()).to.emit(vaultPancakeStrategyCake, 'Harvest').withArgs(ethers.utils.parseEther('1000'));

      expect((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('1100').add(_before[0]));
    });
  });

  context('emergencyWithdraw', async() => {
    it ('should work - cake', async() => {
      await cakeTokenAsDeployer.approve(await playToTheMoon.getAddress(), ethers.utils.parseEther('10'));
      await cakeTokenAsPlayToTheMoon.transferFrom(await deployer.getAddress(), await playToTheMoon.getAddress(), ethers.utils.parseEther('10'));

      await cakeTokenAsDeployer.approve(await safu.getAddress(), ethers.utils.parseEther('10'));
      await cakeTokenAsSafu.transferFrom(await deployer.getAddress(), await safu.getAddress(), ethers.utils.parseEther('10'));

      await cakeTokenAsDeployer.approve(await operator.getAddress(), ethers.utils.parseEther('10'));
      await cakeTokenAsOperator.transferFrom(await deployer.getAddress(), await operator.getAddress(), ethers.utils.parseEther('10'));

      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      
      // play
      // Bob - deposit 1
      await cakeTokenAsBob.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultPancakeStrategyCakeAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultPancakeStrategyCake.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // play to the moon - deposit 1
      await cakeTokenAsPlayToTheMoon.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('1010'));
      await vaultPancakeStrategyCakeAsPlayToTheMoon.deposit(ethers.utils.parseEther('1010'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));

      // safu - deposit 1
      await cakeTokenAsSafu.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('1010'));
      await vaultPancakeStrategyCakeAsSafu.deposit(ethers.utils.parseEther('1010'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));

      // operator - deposit 1
      await cakeTokenAsOperator.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('1010'));
      await vaultPancakeStrategyCakeAsOperator.deposit(ethers.utils.parseEther('1010'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));

      // pause
      await vaultPancakeStrategyCakeAsDeployer.pause();

      expect (await vaultPancakeStrategyCakeAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('3131'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      await vaultPancakeStrategyCakeAsDeployer.emergencyWithdraw(await bob.getAddress(), await vaultPancakeStrategyCakeAsBob.getUserBalance(await bob.getAddress()));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultPancakeStrategyCakeAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('3031'));

      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsDeployer.emergencyWithdraw(await playToTheMoon.getAddress(), await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress()));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await vaultPancakeStrategyCakeAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('2021'));

      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsDeployer.emergencyWithdraw(await safu.getAddress(), await vaultPancakeStrategyCake.balanceOf(await safu.getAddress()));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await vaultPancakeStrategyCakeAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('1011'));

      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultPancakeStrategyCakeAsDeployer.emergencyWithdraw(await operator.getAddress(), await vaultPancakeStrategyCake.balanceOf(await operator.getAddress()));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1010'));
      expect (await vaultPancakeStrategyCakeAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('1'));

      const _before = await cakeToken.balanceOf(await deployer.getAddress());
      await vaultPancakeStrategyCakeAsDeployer.emergencyWithdraw(await deployer.getAddress(), ethers.utils.parseEther('1'));
      expect (await cakeToken.balanceOf(await deployer.getAddress())).to.be.eq(ethers.utils.parseEther('1').add(_before));
      expect (await vaultPancakeStrategyCakeAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('0'));
    });
  });
});