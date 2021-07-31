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
import { ethers, upgrades, waffle } from "hardhat";
import { Overrides, Signer, BigNumberish, utils, Wallet, BigNumber } from "ethers";
import chai, { Assertion } from "chai";
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
  Lottery,
  Lottery__factory,
  RandomNumberGenerator,
  RandomNumberGenerator__factory,
  Timer,
  Timer__factory,
  MockVRFCoordinator,
  MockVRFCoordinator__factory,
  PriceOracle,
  PriceOracle__factory,
  PrizeVault,
  PrizeVault__factory,
  Config,
  Config__factory
} from "../typechain";

chai.use(solidity);
const { expect } = chai;

describe("LotteryWorstCase", function() {
  this.timeout(0);
  const FOREVER = '2000000000';
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const ADDRESS2 = '0x0000000000000000000000000000000000000002'
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const ALPACA_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const BASIC_MULTIPLIER = 10000;
  const PLAY_MULTIPLIER = 20000;
  const CHAINLINK_HASH = "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186";
  const BYTE0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const CHAINLINK_FEE = ethers.utils.parseEther('0.1');
  const PLAYTOTHEMOON_FEE = 100;
  const OPERATOR_FEE = 100;
  const SAFU_FEE = 200;
  const NEXT_LOTTERY_FEE = 600;
  const DENOMINATOR_FEE = 10000;
  const CHAINLINK_RANDOM_NUMBER = ethers.utils.parseUnits("71812290232383789158325313353218754072886144180308695307717334628590412940629", 0);
  const MAX_FEE = 10;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let playToTheMoon: Signer;
  let safu: Signer;
  let operator: Signer;
  
  let wbnbToken: MockWBNB;

  /// Pancakeswap-related instance(s)
  let factoryV2: PancakeFactory;
  let routerV2: PancakeRouterV2;

  let alpacaToken: MockERC20;
  let busdToken: MockERC20;
  let chainLinkToken: MockERC20;

  let priceOracle: PriceOracle;

  let lottery: Lottery;
  let vrfCoodinator: MockVRFCoordinator;
  let timer: Timer;
  let randomNumberGenerator: RandomNumberGenerator;

  let alpacaFairLaunch: MockAlpacaFairLaunch;
  let alpacaVaultAlpaca: MockAlpacaVault;
  let alpacaVaultBusd: MockAlpacaVault;

  let playToken: PlayToken;
  let playDistributor: PlayDistributor;

  let strategyAlpacaAlpaca: StrategyAlpaca;
  let strategyAlpacaBusd: StrategyAlpaca;

  let vaultAlpacaStrategyAlpaca: Vault;
  let vaultAlpacaStrategyBusd: Vault;

  let vaultWithoutStrategyPlay: Vault;

  let lotteryAsDeployer: Lottery;
  let lotteryAsAlice: Lottery;
  let lotteryAsBob: Lottery;
  let lotteryAsPlayToTheMoon: Lottery;
  let lotteryAsSafu: Lottery;
  let lotteryAsOperator: Lottery;
  
  let vaultWithoutStrategyPlayAsDeployer: Vault;
  let vaultAlpacaStrategyAlpacaAsDeployer: Vault;
  let vaultAlpacaStrategyBusdAsDeployer: Vault;
  let vaultWithoutStrategyPlayAsAlice: Vault;
  let vaultAlpacaStrategyAlpacaAsAlice: Vault;
  let vaultAlpacaStrategyBusdAsAlice: Vault;
  let vaultWithoutStrategyPlayAsBob: Vault;
  let vaultAlpacaStrategyAlpacaAsBob: Vault;
  let vaultAlpacaStrategyBusdAsBob: Vault;
  
  let vaultAlpacaStrategyAlpacaAsPlayToTheMoon: Vault;
  let vaultAlpacaStrategyAlpacaAsSafu: Vault;
  let vaultAlpacaStrategyAlpacaAsOperator: Vault;
  
  let vaultAlpacaStrategyBusdAsPlayToTheMoon: Vault;
  let vaultAlpacaStrategyBusdAsSafu: Vault;
  let vaultAlpacaStrategyBusdAsOperator: Vault;
  
  let alpacaTokenAsDeployer: MockERC20;
  let busdTokenAsDeployer: MockERC20;
  let alpacaTokenAsAlice: MockERC20;
  let busdTokenAsAlice: MockERC20;
  let playTokenAsDeployer: PlayToken;
  let playTokenAsAlice: PlayToken;

  let alpacaTokenAsBob: MockERC20;
  let busdTokenAsBob: MockERC20;
  let playTokenAsBob: PlayToken;

  let vrfCoodinatorAsDeployer: MockVRFCoordinator;
  
  let priceOracleAsDeployer: PriceOracle;

  let prizeVault: PrizeVault;

  let prizeVaultAsDeployer: PrizeVault;

  let config: Config;

  let playDistributorAsAlice: PlayDistributor;

  let alpacaFairLaunchAsDeployer: MockAlpacaFairLaunch;

  beforeEach(async() => {
    [deployer, alice, bob, playToTheMoon, safu, operator] = await ethers.getSigners();
    
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
    await alpacaToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));
    await alpacaToken.mint(await bob.getAddress(), ethers.utils.parseEther('1000'));

    busdToken = await MockERC20.deploy("BusdToken", "BUSD");
    await busdToken.deployed();
    await busdToken.mint(await deployer.getAddress(), ethers.utils.parseEther('1000'));
    await busdToken.mint(await alice.getAddress(), ethers.utils.parseEther('1000'));
    await busdToken.mint(await bob.getAddress(), ethers.utils.parseEther('1000'));
    
    chainLinkToken = await MockERC20.deploy("ChainLinkToken", "LINK");

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

    // Deployer adds 1 ALPACA + 1 NATIVE
    await alpacaToken.approve(routerV2.address, ethers.utils.parseEther('1'));
    await routerV2.addLiquidityETH(
      alpacaToken.address, ethers.utils.parseEther('1'),
      '0', '0', await deployer.getAddress(), FOREVER, { value: ethers.utils.parseEther('1') });

    // Deployer adds 1 PLAY + 1 BUSD
    await playToken.approve(routerV2.address, ethers.utils.parseEther('1'));
    await busdToken.approve(routerV2.address, ethers.utils.parseEther('1'));
    await routerV2.addLiquidity(
      playToken.address, busdToken.address,
      ethers.utils.parseEther('1'), ethers.utils.parseEther('1'),
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

    await alpacaFairLaunch.addPool(1, alpacaVaultAlpaca.address, false);
    await alpacaFairLaunch.addPool(1, alpacaVaultBusd.address, false);

    const PriceOracle = (await ethers.getContractFactory(
      "PriceOracle",
      deployer
    )) as PriceOracle__factory;
    priceOracle = await PriceOracle.deploy(await deployer.getAddress());
    await priceOracle.deployed();

    const Timer = (await ethers.getContractFactory(
      "Timer",
      deployer
    )) as Timer__factory;
    timer = await Timer.deploy();
    await timer.deployed();

    const MockVRFCoordinator = (await ethers.getContractFactory(
      "MockVRFCoordinator",
      deployer
    )) as MockVRFCoordinator__factory;
    vrfCoodinator = await MockVRFCoordinator.deploy(chainLinkToken.address);
    await vrfCoodinator.deployed();
    
    const Lottery = (await ethers.getContractFactory(
      "Lottery",
      deployer
    )) as Lottery__factory;
    lottery = await Lottery.deploy(timer.address);
    await lottery.deployed();
    
    const Config = (await ethers.getContractFactory(
      "Config",
      deployer
    )) as Config__factory;
    config = await Config.deploy(lottery.address, routerV2.address, factoryV2.address, wbnbToken.address, priceOracle.address, busdToken.address, MAX_FEE);
    await config.deployed();

    const RandomNumberGenerator = (await ethers.getContractFactory(
      "RandomNumberGenerator",
      deployer
    )) as RandomNumberGenerator__factory;
    randomNumberGenerator = await RandomNumberGenerator.deploy(vrfCoodinator.address, chainLinkToken.address, lottery.address, CHAINLINK_HASH, CHAINLINK_FEE);
    await randomNumberGenerator.deployed();
    
    await chainLinkToken.mint(randomNumberGenerator.address, ethers.utils.parseEther('1000'));

    // Setup PlayDistributor contract
    // Deploy PlayDistributor
    const PlayDistributor = (await ethers.getContractFactory(
      "PlayDistributor",
      deployer
    )) as PlayDistributor__factory;
    playDistributor = await PlayDistributor.deploy(
      playToken.address, PLAY_REWARD_PER_BLOCK, lottery.address, await playToTheMoon.getAddress(), config.address
    )
    await playDistributor.deployed();

    await playToken.transferOwnership(playDistributor.address);

    await lottery.initialize(randomNumberGenerator.address, playDistributor.address, config.address);

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

    const Vault = (await ethers.getContractFactory(
      "Vault",
      deployer
    )) as Vault__factory;

    vaultAlpacaStrategyAlpaca = await Vault.deploy(
      playDistributor.address, alpacaToken.address, strategyAlpacaAlpaca.address, lottery.address, await playToTheMoon.getAddress(),
      await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pAlpacaToken", "pALPACA", 18,)
    await vaultAlpacaStrategyAlpaca.deployed();

    await strategyAlpacaAlpaca.transferOwnership(vaultAlpacaStrategyAlpaca.address);

    vaultAlpacaStrategyBusd = await Vault.deploy(
      playDistributor.address, busdToken.address, strategyAlpacaBusd.address, lottery.address, await playToTheMoon.getAddress(),
      await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pBusdToken", "pBUSD", 18)
    await vaultAlpacaStrategyBusd.deployed();

    await strategyAlpacaBusd.transferOwnership(vaultAlpacaStrategyBusd.address);

    vaultWithoutStrategyPlay = await Vault.deploy(
      playDistributor.address, playToken.address, ADDRESS0, lottery.address, await playToTheMoon.getAddress(),
      await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pPlayToken", "pPlay", 18)
    await vaultWithoutStrategyPlay.deployed();
    
    const PrizeVault = (await ethers.getContractFactory(
      "PrizeVault",
      deployer
    )) as PrizeVault__factory;
    prizeVault = await PrizeVault.deploy(lottery.address, playToken.address, 0, 0);

    vaultAlpacaStrategyAlpacaAsDeployer = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, deployer);
    vaultAlpacaStrategyBusdAsDeployer = Vault__factory.connect(vaultAlpacaStrategyBusd.address, deployer);
    vaultWithoutStrategyPlayAsDeployer = Vault__factory.connect(vaultWithoutStrategyPlay.address, deployer);

    vaultAlpacaStrategyAlpacaAsAlice = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, alice);
    vaultAlpacaStrategyBusdAsAlice = Vault__factory.connect(vaultAlpacaStrategyBusd.address, alice);
    vaultWithoutStrategyPlayAsAlice = Vault__factory.connect(vaultWithoutStrategyPlay.address, alice);

    vaultAlpacaStrategyAlpacaAsBob = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, bob);
    vaultAlpacaStrategyBusdAsBob = Vault__factory.connect(vaultAlpacaStrategyBusd.address, bob);
    vaultWithoutStrategyPlayAsBob = Vault__factory.connect(vaultWithoutStrategyPlay.address, bob);

    alpacaTokenAsDeployer = MockERC20__factory.connect(alpacaToken.address, deployer);    
    busdTokenAsDeployer = MockERC20__factory.connect(busdToken.address, deployer);
    playTokenAsDeployer = PlayToken__factory.connect(playToken.address, deployer);

    alpacaTokenAsAlice = MockERC20__factory.connect(alpacaToken.address, alice);    
    busdTokenAsAlice = MockERC20__factory.connect(busdToken.address, alice);
    playTokenAsAlice = PlayToken__factory.connect(playToken.address, alice);

    alpacaTokenAsBob = MockERC20__factory.connect(alpacaToken.address, bob);    
    busdTokenAsBob = MockERC20__factory.connect(busdToken.address, bob);
    playTokenAsBob = PlayToken__factory.connect(playToken.address, bob);

    vrfCoodinatorAsDeployer = MockVRFCoordinator__factory.connect(vrfCoodinator.address, deployer);

    priceOracleAsDeployer = PriceOracle__factory.connect(priceOracle.address, deployer);

    lotteryAsDeployer = Lottery__factory.connect(lottery.address, deployer);
    lotteryAsAlice = Lottery__factory.connect(lottery.address, alice);
    lotteryAsBob = Lottery__factory.connect(lottery.address, bob);
    lotteryAsPlayToTheMoon = Lottery__factory.connect(lottery.address, playToTheMoon);
    lotteryAsSafu = Lottery__factory.connect(lottery.address, safu);
    lotteryAsOperator = Lottery__factory.connect(lottery.address, operator);

    vaultAlpacaStrategyBusdAsPlayToTheMoon = Vault__factory.connect(vaultAlpacaStrategyBusd.address, playToTheMoon);
    vaultAlpacaStrategyBusdAsSafu = Vault__factory.connect(vaultAlpacaStrategyBusd.address, safu);
    vaultAlpacaStrategyBusdAsOperator = Vault__factory.connect(vaultAlpacaStrategyBusd.address, operator);

    vaultAlpacaStrategyAlpacaAsPlayToTheMoon = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, playToTheMoon);
    vaultAlpacaStrategyAlpacaAsSafu = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, safu);
    vaultAlpacaStrategyAlpacaAsOperator = Vault__factory.connect(vaultAlpacaStrategyAlpaca.address, operator)

    prizeVaultAsDeployer = PrizeVault__factory.connect(prizeVault.address, deployer);

    playDistributorAsAlice = PlayDistributor__factory.connect(playDistributor.address, alice);
    alpacaFairLaunchAsDeployer = MockAlpacaFairLaunch__factory.connect(alpacaFairLaunch.address, deployer);
  });

  context("worst case", async() => {
    it ("should work - case 1", async() => {
      await alpacaFairLaunchAsDeployer.setAlpacaPerBlock(ethers.utils.parseEther('1'));
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

      await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

      await priceOracleAsDeployer.setPrices(
        [playToken.address, alpacaToken.address, busdToken.address], 
        [busdToken.address, busdToken.address, busdToken.address], 
        [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
      );

      await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

      // hakced
      await alpacaFairLaunch.transferToken(strategyAlpacaBusd.address, 1, ethers.utils.parseEther('100'), await deployer.getAddress());

      // Creating a new lottery
      await lotteryAsDeployer.createNewLotto(0);

      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);
      expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);

      let lotteryId = await lottery.getLotteryIdCounter(0);
      let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
      // Setting the time so that we can set winning numbers
      // Setting the time forward 
      await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

      // Drawing the numbers
      let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
      // Getting the request ID out of events
      let requestId = tx.events?.pop()!.args!.requestId.toString();

      // Mocking the VRF Coordinator contract for random request fulfilment 
      await vrfCoodinatorAsDeployer.callBackWithRandomness(
        requestId,
        CHAINLINK_RANDOM_NUMBER,
        randomNumberGenerator.address
      );

      await lotteryAsAlice.prizeDistribution(0);
      
      // Getting the basic info around this lottery
      let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
      // Testing they are correct
      expect(lottoInfo.winningNumber).to.be.eq(1);
      expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
      expect(lottoInfo.prize).to.be.eq(0);

      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);
    });
    
    it ("should work - case 2", async() => {
      await alpacaFairLaunchAsDeployer.setAlpacaPerBlock(ethers.utils.parseEther('1'));
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

      await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

      await priceOracleAsDeployer.setPrices(
        [playToken.address, alpacaToken.address, busdToken.address], 
        [busdToken.address, busdToken.address, busdToken.address], 
        [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
      );

      await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

      // Creating a new lottery
      await lotteryAsDeployer.createNewLotto(0);

      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);
      expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);

      // hakced
      await alpacaFairLaunch.transferToken(strategyAlpacaBusd.address, 1, ethers.utils.parseEther('100'), await deployer.getAddress());

      let lotteryId = await lottery.getLotteryIdCounter(0);
      let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
      // Setting the time so that we can set winning numbers
      // Setting the time forward 
      await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

      // Drawing the numbers
      let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
      // Getting the request ID out of events
      let requestId = tx.events?.pop()!.args!.requestId.toString();

      // Mocking the VRF Coordinator contract for random request fulfilment 
      await vrfCoodinatorAsDeployer.callBackWithRandomness(
        requestId,
        CHAINLINK_RANDOM_NUMBER,
        randomNumberGenerator.address
      );

      await lotteryAsAlice.prizeDistribution(0);
      
      // Getting the basic info around this lottery
      let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
      // Testing they are correct
      expect(lottoInfo.winningNumber).to.be.eq(1);
      expect(lottoInfo.winnerAddress).to.be.eq(await alice.getAddress());
      expect(lottoInfo.prize).to.be.gt(0);

      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);
    });
    
    it ("should work - case 3", async() => {
      await alpacaFairLaunchAsDeployer.setAlpacaPerBlock(ethers.utils.parseEther('1'));
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

      await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

      await priceOracleAsDeployer.setPrices(
        [playToken.address, alpacaToken.address, busdToken.address], 
        [busdToken.address, busdToken.address, busdToken.address], 
        [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
      );

      await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

      // Creating a new lottery
      await lotteryAsDeployer.createNewLotto(0);

      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);
      expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);

      let lotteryId = await lottery.getLotteryIdCounter(0);
      let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
      // Setting the time so that we can set winning numbers
      // Setting the time forward 
      await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

      // Drawing the numbers
      let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
      // Getting the request ID out of events
      let requestId = tx.events?.pop()!.args!.requestId.toString();

      // hakced
      await alpacaFairLaunch.transferToken(strategyAlpacaBusd.address, 1, ethers.utils.parseEther('100'), await deployer.getAddress());

      // Mocking the VRF Coordinator contract for random request fulfilment 
      await vrfCoodinatorAsDeployer.callBackWithRandomness(
        requestId,
        CHAINLINK_RANDOM_NUMBER,
        randomNumberGenerator.address
      );

      await lotteryAsAlice.prizeDistribution(0);
      
      // Getting the basic info around this lottery
      let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
      // Testing they are correct
      expect(lottoInfo.winningNumber).to.be.eq(1);
      expect(lottoInfo.winnerAddress).to.be.eq(await alice.getAddress());
      expect(lottoInfo.prize).to.be.gt(0);

      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);
    });
    
    it ("should work - case 4", async() => {
      await alpacaFairLaunchAsDeployer.setAlpacaPerBlock(ethers.utils.parseEther('1'));
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

      await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

      await priceOracleAsDeployer.setPrices(
        [playToken.address, alpacaToken.address, busdToken.address], 
        [busdToken.address, busdToken.address, busdToken.address], 
        [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
      );

      await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

      // Creating a new lottery
      await lotteryAsDeployer.createNewLotto(0);

      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);
      expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);

      let lotteryId = await lottery.getLotteryIdCounter(0);
      let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
      // Setting the time so that we can set winning numbers
      // Setting the time forward 
      await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

      // Drawing the numbers
      let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
      // Getting the request ID out of events
      let requestId = tx.events?.pop()!.args!.requestId.toString();

      // Mocking the VRF Coordinator contract for random request fulfilment 
      await vrfCoodinatorAsDeployer.callBackWithRandomness(
        requestId,
        CHAINLINK_RANDOM_NUMBER,
        randomNumberGenerator.address
      );

      await lotteryAsAlice.prizeDistribution(0);

      // hakced
      await alpacaFairLaunch.transferToken(strategyAlpacaBusd.address, 1, ethers.utils.parseEther('100'), await deployer.getAddress());
      
      // Getting the basic info around this lottery
      let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
      // Testing they are correct
      expect(lottoInfo.winningNumber).to.be.eq(1);
      expect(lottoInfo.winnerAddress).to.be.eq(await alice.getAddress());
      expect(lottoInfo.prize).to.be.gt(0);

      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);
    });
    
    it ("should work - case 5", async() => {
      await alpacaFairLaunchAsDeployer.setAlpacaPerBlock(ethers.utils.parseEther('1'));
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

      await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

      await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

      await priceOracleAsDeployer.setPrices(
        [playToken.address, alpacaToken.address, busdToken.address], 
        [busdToken.address, busdToken.address, busdToken.address], 
        [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
      );

      await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

      // hakced
      await alpacaFairLaunch.transferToken(strategyAlpacaAlpaca.address, 0, ethers.utils.parseEther('100'), await deployer.getAddress());

      // Creating a new lottery
      await lotteryAsDeployer.createNewLotto(0);

      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(200);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
      expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);

      let lotteryId = await lottery.getLotteryIdCounter(0);
      let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
      // Setting the time so that we can set winning numbers
      // Setting the time forward 
      await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

      // Drawing the numbers
      let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
      // Getting the request ID out of events
      let requestId = tx.events?.pop()!.args!.requestId.toString();

      // Mocking the VRF Coordinator contract for random request fulfilment 
      await vrfCoodinatorAsDeployer.callBackWithRandomness(
        requestId,
        CHAINLINK_RANDOM_NUMBER,
        randomNumberGenerator.address
      );

      await lotteryAsAlice.prizeDistribution(0);
      
      // Getting the basic info around this lottery
      let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
      // Testing they are correct
      expect(lottoInfo.winningNumber).to.be.eq(1);
      expect(lottoInfo.winnerAddress).to.be.eq(await alice.getAddress());
      expect(lottoInfo.prize).to.be.gt(0);

      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(200);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
    });
    
    it ("should work - case 6", async() => {
      await alpacaFairLaunchAsDeployer.setAlpacaPerBlock(ethers.utils.parseEther('1'));
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

      await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

      await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

      await priceOracleAsDeployer.setPrices(
        [playToken.address, alpacaToken.address, busdToken.address], 
        [busdToken.address, busdToken.address, busdToken.address], 
        [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
      );

      await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

      // hakced
      await alpacaFairLaunch.transferToken(strategyAlpacaBusd.address, 1, ethers.utils.parseEther('100'), await deployer.getAddress());

      // Creating a new lottery
      await lotteryAsDeployer.createNewLotto(0);

      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(200);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
      expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);

      let lotteryId = await lottery.getLotteryIdCounter(0);
      let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
      // Setting the time so that we can set winning numbers
      // Setting the time forward 
      await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

      // Drawing the numbers
      let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
      // Getting the request ID out of events
      let requestId = tx.events?.pop()!.args!.requestId.toString();

      // Mocking the VRF Coordinator contract for random request fulfilment 
      await vrfCoodinatorAsDeployer.callBackWithRandomness(
        requestId,
        CHAINLINK_RANDOM_NUMBER,
        randomNumberGenerator.address
      );

      await lotteryAsAlice.prizeDistribution(0);
      
      // Getting the basic info around this lottery
      let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
      // Testing they are correct
      expect(lottoInfo.winningNumber).to.be.eq(1);
      expect(lottoInfo.winnerAddress).to.be.eq(await alice.getAddress());
      expect(lottoInfo.prize).to.be.gt(0);

      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(200);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
    });
    
    it ("should work - case 7", async() => {
      await alpacaFairLaunchAsDeployer.setAlpacaPerBlock(ethers.utils.parseEther('1'));
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);
      await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

      await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

      await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

      await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

      await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
      await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

      await priceOracleAsDeployer.setPrices(
        [playToken.address, alpacaToken.address, busdToken.address], 
        [busdToken.address, busdToken.address, busdToken.address], 
        [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
      );

      await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

      // hakced
      await alpacaFairLaunch.transferToken(strategyAlpacaAlpaca.address, 0, ethers.utils.parseEther('100'), await deployer.getAddress());
      await alpacaFairLaunch.transferToken(strategyAlpacaBusd.address, 1, ethers.utils.parseEther('100'), await deployer.getAddress());

      // Creating a new lottery
      await lotteryAsDeployer.createNewLotto(0);

      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(200);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
      expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);

      let lotteryId = await lottery.getLotteryIdCounter(0);
      let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
      // Setting the time so that we can set winning numbers
      // Setting the time forward 
      await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

      // Drawing the numbers
      let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
      // Getting the request ID out of events
      let requestId = tx.events?.pop()!.args!.requestId.toString();

      // Mocking the VRF Coordinator contract for random request fulfilment 
      await vrfCoodinatorAsDeployer.callBackWithRandomness(
        requestId,
        CHAINLINK_RANDOM_NUMBER,
        randomNumberGenerator.address
      );

      await lotteryAsAlice.prizeDistribution(0);
      
      // Getting the basic info around this lottery
      let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
      // Testing they are correct
      expect(lottoInfo.winningNumber).to.be.eq(1);
      expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
      expect(lottoInfo.prize).to.be.eq(0);

      await lotteryAsDeployer.refreshPrize(0);
      expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
      expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(200);
      expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
    });
  });
});