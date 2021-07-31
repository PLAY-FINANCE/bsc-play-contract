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
import * as AssertHelpers from "./helpers/assert"

chai.use(solidity);
const { expect } = chai;

describe("VaultPancakeStrategyWorstCase", function() {
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

  let masterChefAsDeployer: MockPancakeMasterChef;

  let strategyPancakeCakeAsDeployer: StrategyPancake;

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

    masterChefAsDeployer = MockPancakeMasterChef__factory.connect(masterChef.address, deployer);
    await masterChefAsDeployer.set(0, 0, false);
    await masterChefAsDeployer.add(1, playToken.address, false); // for avoid division by zero caused by totalAllocation is zero

    configAsLottery = Config__factory.connect(config.address, lottery);
    await configAsLottery.setFeeInfo(0, 100, 100, 100, 100, 10000);
    await vaultPancakeStrategyCakeAsLottery.setLotteryType(0);

    strategyPancakeCakeAsDeployer = StrategyPancake__factory.connect(strategyPancakeCake.address, deployer);
  });

  context('transferCompensationToken to SAFU', async() => {
    it ('should work', async() => {
      const MockERC20 = (await ethers.getContractFactory(
        "MockERC20",
        deployer
      )) as MockERC20__factory;

      let compensationToken1 = await MockERC20.deploy("COMPENSATION1", "COMPENSATION1");
      compensationToken1.mint(strategyPancakeCake.address, ethers.utils.parseEther('1000'));

      let compensationToken2 = await MockERC20.deploy("COMPENSATION2", "COMPENSATION2");
      compensationToken2.mint(strategyPancakeCake.address, ethers.utils.parseEther('2000'));

      expect (await compensationToken1.balanceOf(strategyPancakeCake.address)).to.be.eq(ethers.utils.parseEther('1000'));
      await strategyPancakeCakeAsDeployer.transferCompenstationToken(compensationToken1.address, ethers.utils.parseEther('1000'));
      expect (await compensationToken1.balanceOf(strategyPancakeCake.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect (await compensationToken1.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      expect (await compensationToken2.balanceOf(strategyPancakeCake.address)).to.be.eq(ethers.utils.parseEther('2000'));
      await strategyPancakeCakeAsDeployer.transferCompenstationToken(compensationToken2.address, ethers.utils.parseEther('2000'));
      expect (await compensationToken2.balanceOf(strategyPancakeCake.address)).to.be.eq(ethers.utils.parseEther('0'));
      expect (await compensationToken2.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('2000'));
    })
  });

  context('worst case (masterchef)', async() => {
    it ('should work (deposit to be reverted)', async() => {
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      
      // Bob - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await cakeTokenAsBob.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Play to the moon - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await cakeTokenAsPlayToTheMoon.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Safu - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      await cakeTokenAsSafu.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Operator - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      await cakeTokenAsOperator.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      expect (await strategyPancakeCake.getTotalBalance()).to.be.eq(ethers.utils.parseEther('500'));

      // hacked
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      await masterChef.transferToken(strategyPancakeCake.address, 0, ethers.utils.parseEther('250'), await deployer.getAddress());
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('250'));
      
      expect (await strategyPancakeCake.getTotalBalance()).to.be.eq(ethers.utils.parseEther('250'));

      // Alice - deposit 2
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await expect(vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
      
      // Bob - deposit 2
      await cakeTokenAsBob.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await expect(vaultPancakeStrategyCakeAsBob.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Play to the moon - deposit 2
      await cakeTokenAsPlayToTheMoon.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await expect(vaultPancakeStrategyCakeAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Safu - deposit 2
      await cakeTokenAsSafu.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await expect(vaultPancakeStrategyCakeAsSafu.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Operator - deposit 2
      await cakeTokenAsOperator.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await expect(vaultPancakeStrategyCakeAsOperator.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
    });
    
    it ('should work (after all money has been withdrawn, vault operates again normally)', async() => {
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      
      // hacked
      await masterChef.transferToken(strategyPancakeCake.address, 0, ethers.utils.parseEther('50'), await deployer.getAddress());
      
      // Alice - deposit 2
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await expect(vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.reverted;

      // Alice - withdraw 1
      expect(await vaultPancakeStrategyCakeAsAlice.getBalanceSnapshot()).to.be.gt(0);
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect(await vaultPancakeStrategyCakeAsAlice.getBalanceSnapshot()).to.be.eq(0);

      // Alice - deposit 3
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));

      // Alice - withdraw 2
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100'));
    });

    it ('should work (harvest)', async() => {
      await masterChefAsDeployer.set(1, 0, true);
      await masterChefAsDeployer.set(0, 1, true);

      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // Alice - deposit 1
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));

      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await expect(vaultPancakeStrategyCakeAsLottery.harvest()).to.emit(vaultPancakeStrategyCake, 'Harvest');;
      let _before = await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress());
      expect (_before).to.be.gt(ethers.utils.parseEther('0'));

      // hacked
      await masterChef.transferToken(strategyPancakeCake.address, 0, ethers.utils.parseEther('50'), await deployer.getAddress());
      
      await expect(vaultPancakeStrategyCakeAsLottery.harvest()).to.not.emit(vaultPancakeStrategyCake, 'Harvest');

      let _after = await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress());
      expect (_after).to.be.eq(_before);
    });

    it ('should work (cake) - 1', async() => {
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await cakeTokenAsBob.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Play to the moon - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await cakeTokenAsPlayToTheMoon.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsPlayToTheMoon.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Safu - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('300'));
      await cakeTokenAsSafu.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsSafu.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Operator - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('400'));
      await cakeTokenAsOperator.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsOperator.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      expect (await strategyPancakeCake.getTotalBalance()).to.be.eq(ethers.utils.parseEther('500'));

      // hacked
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('500'));
      await masterChef.transferToken(strategyPancakeCake.address, 0, ethers.utils.parseEther('250'), await deployer.getAddress());
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('250'));
      
      expect (await strategyPancakeCake.getTotalBalance()).to.be.eq(ethers.utils.parseEther('250'));
      
      // Alice - withdraw 1
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      
      // Bob - withdraw 1
      await vaultPancakeStrategyCakeAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect (await vaultPancakeStrategyCakeAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('175'));
      
      // Bob - withdraw 2
      await vaultPancakeStrategyCakeAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultPancakeStrategyCakeAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('150'));

      // PlayToTHeMoon - withdraw 1
      await vaultPancakeStrategyCakeAsPlayToTheMoon.withdraw(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultPancakeStrategyCake.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      
      // Safu - withdraw 1
      await vaultPancakeStrategyCakeAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('75'));
      
      // Operator - withdraw 1
      await vaultPancakeStrategyCakeAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('925'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('50'));
      
      // Safu - withdraw 2
      await vaultPancakeStrategyCakeAsSafu.withdraw(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('25'));
      
      // Operator - withdraw 2
      await vaultPancakeStrategyCakeAsOperator.withdraw(ethers.utils.parseEther('50'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
    });
    
    it ('should work (cake) - 2', async() => {
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await cakeToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      
      // Alice - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
      await cakeTokenAsAlice.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsAlice.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // Bob - deposit 1
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('100'));
      await cakeTokenAsBob.approve(vaultPancakeStrategyCake.address, ethers.utils.parseEther('100'));
      await vaultPancakeStrategyCakeAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await cakeToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      
      expect (await strategyPancakeCake.getTotalBalance()).to.be.eq(ethers.utils.parseEther('200'));

      // hacked
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('200'));
      await masterChef.transferToken(strategyPancakeCake.address, 0, ethers.utils.parseEther('33.333'), await deployer.getAddress());
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('166.667'));

      expect (await strategyPancakeCake.getTotalBalance()).to.be.eq(ethers.utils.parseEther('166.667'));
      
      // Alice - withdraw 1
      await vaultPancakeStrategyCakeAsAlice.withdraw(ethers.utils.parseEther('100'));
      AssertHelpers.assertAlmostEqual((await cakeToken.balanceOf(await alice.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultPancakeStrategyCakeAsAlice.getUserBalance(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultPancakeStrategyCake.balanceOf(await alice.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      AssertHelpers.assertAlmostEqual((await masterChef.userInfo(0, strategyPancakeCake.address))[0].toString(), ethers.utils.parseEther('83.3335').toString());
      
      // Bob - withdraw 1
      await vaultPancakeStrategyCakeAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await cakeToken.balanceOf(await bob.getAddress())).toString(), (ethers.utils.parseEther('941.66675')).toString());
      expect (await vaultPancakeStrategyCakeAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await masterChef.userInfo(0, strategyPancakeCake.address))[0].toString(), ethers.utils.parseEther('41.66675').toString());
      
      // Bob - withdraw 2
      await vaultPancakeStrategyCakeAsBob.withdraw(ethers.utils.parseEther('50'));
      AssertHelpers.assertAlmostEqual((await cakeToken.balanceOf(await bob.getAddress())).toString(), ethers.utils.parseEther('983.3335').toString());
      expect (await vaultPancakeStrategyCakeAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect ((await masterChef.userInfo(0, strategyPancakeCake.address))[0]).to.be.eq(ethers.utils.parseEther('0'));
    });
  });  
});