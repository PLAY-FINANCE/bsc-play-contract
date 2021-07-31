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

describe("Lottery", function() {
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
  });
  
  context("lottery", async() => {
    context('when adjust wrong params', async() => {
      it('reverted', async() => {
        await expect(lottery.initialize(randomNumberGenerator.address, playDistributor.address, config.address)).to.be.reverted;
    
        await expect(lotteryAsDeployer.initialize(ADDRESS0, ADDRESS1, ADDRESS1)).to.be.reverted;
        await expect(lotteryAsDeployer.initialize(ADDRESS1, ADDRESS0, ADDRESS1)).to.be.reverted;
        await expect(lotteryAsDeployer.initialize(ADDRESS1, ADDRESS1, ADDRESS0)).to.be.reverted;
        await expect(lotteryAsDeployer.addVault(ADDRESS0, 0, 0, 0, 0, 0, false)).to.be.reverted;
        await expect(lotteryAsDeployer.updateVault(ADDRESS0, 0, 0, 0, 0, false)).to.be.reverted;
        await expect(lotteryAsDeployer.setLottoConfig(0, true, 0, 1, 0, 0, 0, 0, 1, ADDRESS0, 0)).to.be.reverted;
        await expect(lotteryAsDeployer.setLottoConfig(0, true, 1, 0, 0, 0, 0, 0, 1, ADDRESS0, 0)).to.be.reverted;
        await expect(lotteryAsDeployer.setLottoConfig(0, true, 1, 1, 0, 0, 0, 0, 0, ADDRESS0, 0)).to.be.reverted;
        
        const RandomNumberGenerator = (await ethers.getContractFactory(
          "RandomNumberGenerator",
          deployer
        )) as RandomNumberGenerator__factory;
  
        await expect(RandomNumberGenerator.deploy(ADDRESS0, ADDRESS1, ADDRESS1, CHAINLINK_HASH, CHAINLINK_FEE)).to.be.reverted;
        await expect(RandomNumberGenerator.deploy(ADDRESS1, ADDRESS0, ADDRESS1, CHAINLINK_HASH, CHAINLINK_FEE)).to.be.reverted;
        await expect(RandomNumberGenerator.deploy(ADDRESS1, ADDRESS1, ADDRESS0, CHAINLINK_HASH, CHAINLINK_FEE)).to.be.reverted;
        await expect(RandomNumberGenerator.deploy(ADDRESS1, ADDRESS1, ADDRESS1, BYTE0, CHAINLINK_FEE)).to.be.reverted;
        
        await expect(lotteryAsDeployer.getNumUsers(0)).to.be.revertedWith('lottery is not existed.');
        await expect(lotteryAsAlice.getNumUsers(0)).to.be.revertedWith('lottery is not existed.');
        await expect(lotteryAsDeployer.cleanupDepositList(0, 0, 0)).to.be.revertedWith('lottery is not existed.');
      });
    });

    context("Creating a new lottery tests", function() {
      /**
       * Tests that in the nominal case nothing goes wrong
       */
      it("Nominal case", async function() {
          await lotteryAsDeployer.setLottoConfig(0, true, 1, 1, 0, 0, 0, 0, 1, ADDRESS0, 0);

          // Creating a new lottery
          await expect(lotteryAsDeployer.createNewLotto(0)).to.emit(lottery, 'LotteryOpen')
          // Checking that emitted event contains correct information
          .withArgs(
              0, // lottery type
              1 // lottery id
          );
      });
      /**
       * Tests that creating different types of lottery at the same time
       */
      it("Creating different types of lottery", async function() {
          await lotteryAsDeployer.setLottoConfig(0, true, 1, 1, 0, 0, 0, 0, 1, ADDRESS0, 0);
          await lotteryAsDeployer.setLottoConfig(1, true, 1, 1, 0, 0, 0, 0, 1, ADDRESS0, 0);
          // Creating a new lottery (type 0)
          await expect(lotteryAsDeployer.createNewLotto(0)).to.emit(lottery, 'LotteryOpen')
          // Checking that emitted event contains correct information
          .withArgs(
              0, // lottery type
              1 // lottery id
          );
          // Creating a new lottery (type 1)
          await expect(
            lotteryAsDeployer.createNewLotto(1)).to.emit(lottery, 'LotteryOpen')
          // Checking that emitted event contains correct information
          .withArgs(
              1, // lottery type
              1 // lottery id
          );
      });
      /**
       * Testing that non-admins cannot create a lotto
       */
      it("Invalid admin", async function() {
        await expect(lotteryAsAlice.setLottoConfig(0, true, 1, 1, 0, 0, 0, 0, 1, ADDRESS0, 0)).to.be.reverted;
        await expect(lotteryAsAlice.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false)).to.be.reverted;
        await expect(lotteryAsAlice.updateVault(vaultWithoutStrategyPlay.address, 0, 0, PLAY_MULTIPLIER, 0, false)).to.be.reverted;
        await expect(lotteryAsAlice.numberDrawn(0, BYTE0, 0)).to.be.reverted;
        await expect(lotteryAsDeployer.numberDrawn(0, BYTE0, 0)).to.be.reverted;

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 1, 0, 0, 0, 0, 1, ADDRESS0, 0);
        await expect(lotteryAsAlice.setRefreshPrizeOn(false)).to.be.revertedWith('Ownable: caller is not the owner');
        await expect(lotteryAsAlice.setCleanupDepositListOn(false)).to.be.revertedWith('Ownable: caller is not the owner');
        await expect(lotteryAsAlice.setGetNumUsersOn(false)).to.be.revertedWith('Ownable: caller is not the owner');
      });
      
      /**
       * Testing that if the lottery type already exists, the latest lottery status must be completed.
       */
      it("latest lottery is not completed", async function() {
        await lotteryAsDeployer.setLottoConfig(0, true, 10000, 1, 0, 0, 0, 0, 1, ADDRESS0, 0);
        // Creating a new lottery (type 0)
        await expect(lotteryAsDeployer.createNewLotto(0)).to.emit(lottery, 'LotteryOpen')
        // Checking that emitted event contains correct information
        .withArgs(
          0, // lottery type
          1 // lottery id
        );
        // Creating a new lottery (type 0)
        await expect(lotteryAsDeployer.createNewLotto(0)).to.be.revertedWith('latest lottery is not completed yet');
      });

      /**
       * Testing that non-admins cannot create a lotto
       */
      it("lottery configuration is not set.", async function() {
        await expect(lotteryAsDeployer.createNewLotto(0)).to.be.revertedWith('cant create new lotto');
      });
      
      /**
       * Testing that add/update vault
       */
      it("add/update vault", async function() {
        const Vault = (await ethers.getContractFactory(
          "Vault",
          deployer
        )) as Vault__factory;
    
        let _vault1 = await Vault.deploy(
          playDistributor.address, alpacaToken.address, strategyAlpacaAlpaca.address, lottery.address, await playToTheMoon.getAddress(),
          await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pAlpacaToken", "pALPACA", 18,)
        await _vault1.deployed();

        let _vault2 = await Vault.deploy(
          playDistributor.address, alpacaToken.address, strategyAlpacaAlpaca.address, lottery.address, await playToTheMoon.getAddress(),
          await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pAlpacaToken", "pALPACA", 18,)
        await _vault2.deployed();

        await lotteryAsDeployer.addVault(_vault1.address, 0, 0, 0, 0, 0, false);
        await expect(lotteryAsDeployer.addVault(_vault1.address, 0, 0, 0, 0, 0, false)).to.be.revertedWith('this vault is already added');
        await lotteryAsDeployer.updateVault(_vault1.address, 0, 0, 0, 0, false);

        await expect(lotteryAsDeployer.updateVault(_vault2.address, 0, 0, 0, 0, false)).to.be.revertedWith('this vault is not existed');
        await lotteryAsDeployer.addVault(_vault2.address, 0, 0, 0, 0, 0, false);
        await lotteryAsDeployer.updateVault(_vault2.address, 1, 0, 0, 0, false);

        await lotteryAsDeployer.updateVault(_vault2.address, 0, 0, 0, 0, false);
      });

      it("cant create new lotto (disable this type of lottery)", async function() {
        
        await lotteryAsDeployer.setLottoConfig(0, false, 1, 10000, 0, 0, 0, 0, 1, ADDRESS0, 0);
        // Creating a new lottery (type 0)
        await expect(lotteryAsDeployer.createNewLotto(0)).to.be.revertedWith('cant create new lotto');
      });

      it("cant create new lotto (disable this type of lottery)", async function() {
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 10000, 0, 0, 0, 0, 1, ADDRESS0, 0);
        // Creating a new lottery (type 0)
        await lotteryAsDeployer.createNewLotto(0);
        
        let lotteryId = await lottery.getLotteryIdCounter(0);
        let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        await expect(lotteryAsDeployer.prizeDistribution(0)).to.be.reverted;
        // Drawing the numbers
        let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
        await expect(lotteryAsDeployer.createNewLotto(0)).to.be.reverted;
        await expect(lotteryAsDeployer.drawWinningNumbers(0)).to.be.reverted;
        await expect(lotteryAsDeployer.prizeDistribution(0)).to.be.reverted;
        
        // Getting the request ID out of events
        let requestId = tx.events?.pop()!.args!.requestId.toString();

        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );
        await expect(lotteryAsDeployer.createNewLotto(0)).to.be.reverted;
        await expect(lotteryAsDeployer.drawWinningNumbers(0)).to.be.reverted;
      });
    });

    context("Drawing numbers tests", function() {
      beforeEach(async () => {
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 10000, 0, 0, 0, 0, 1, ADDRESS0, 0);
        // Creating a new lottery (type 0)
        await expect(lotteryAsDeployer.createNewLotto(0)).to.emit(lottery, 'LotteryOpen')
        // Checking that emitted event contains correct information
        .withArgs(
          0, // lottery type
          1 // lottery id
        );
      });
  
      /**
       * Testing that the winning numbers can be set in the nominal case
       */
      it("Setting winning numbers", async function() {
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
          // Getting info after call
          let lotteryInfoAfter = await lottery.getBasicLottoInfo(0, lotteryId);
          // Testing
          expect(lotteryInfoBefore.winningNumber).to.be.bignumber.eq(ethers.utils.parseUnits("115792089237316195423570985008687907853269984665640564039457584007913129639935", 0));
          expect(lotteryInfoAfter.winningNumber).to.be.eq(629);
      });
      
      /**
     * Testing that numbers cannot be updated once chosen
     */
      it("Invalid winning numbers (already chosen)", async function() {
        let lotteryId = await lottery.getLotteryIdCounter(0);
        let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        // Drawing the numbers
        await lotteryAsDeployer.drawWinningNumbers(0);
        await expect(lotteryAsDeployer.drawWinningNumbers(0)).to.be.reverted;
      });
  
      /**
     * Testing that winning numbers cannot be set while lottery still in 
     * progress
     */
      it("Invalid winning numbers (time)", async function() {
        // Drawing the numbers
        await expect(lotteryAsDeployer.drawWinningNumbers(0)).to.be.reverted;
      });
    });

    context('should work', async() => {  
      it("should work - case 1", async function() {
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 10000, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);

        let lotteryId = await lotteryAsDeployer.getLotteryIdCounter(0);
        // Getting the basic info around this lottery
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        
        // Testing they are correct
        expect(lottoInfo.lotteryID).to.be.eq(lotteryId);
        expect(lottoInfo.lotteryType).to.be.eq(0);
        expect(lottoInfo.lotteryStatus).to.be.eq(0);
        expect(lottoInfo.prize).to.be.eq(0);
        expect(lottoInfo.closingTimestamp).to.be.eq(lottoInfo.startingTimestamp.add(1));
        expect(lottoInfo.winningNumber).to.be.bignumber.eq(ethers.utils.parseUnits("115792089237316195423570985008687907853269984665640564039457584007913129639935", 0));
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.maxValidRange).to.be.eq(10000);
        expect(lottoInfo.feeInfo.playToTheMoon).to.be.eq(PLAYTOTHEMOON_FEE);
        expect(lottoInfo.feeInfo.safu).to.be.eq(SAFU_FEE);
        expect(lottoInfo.feeInfo.nextLottery).to.be.eq(NEXT_LOTTERY_FEE);
        expect(lottoInfo.feeInfo.operator).to.be.eq(OPERATOR_FEE);
        expect(lottoInfo.feeInfo.denominator).to.be.eq(DENOMINATOR_FEE);
        expect(lottoInfo.prizeLocker).to.be.eq(ADDRESS0);
        expect(lottoInfo.prizeLockupBlock).to.be.eq(0);

        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lottoInfo.closingTimestamp);
        // Drawing the numbers
        let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();

        // Getting the basic info around this lottery
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        
        // Testing they are correct
        expect(lottoInfo.lotteryID).to.be.eq(lotteryId);
        expect(lottoInfo.lotteryType).to.be.eq(0);
        expect(lottoInfo.lotteryStatus).to.be.eq(1);
        expect(lottoInfo.prize).to.be.eq(0);
        expect(lottoInfo.closingTimestamp).to.be.eq(lottoInfo.startingTimestamp.add(1));
        expect(lottoInfo.winningNumber).to.be.bignumber.eq(ethers.utils.parseUnits("115792089237316195423570985008687907853269984665640564039457584007913129639935", 0));
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.maxValidRange).to.be.eq(10000);
        expect(lottoInfo.feeInfo.playToTheMoon).to.be.eq(PLAYTOTHEMOON_FEE);
        expect(lottoInfo.feeInfo.safu).to.be.eq(SAFU_FEE);
        expect(lottoInfo.feeInfo.nextLottery).to.be.eq(NEXT_LOTTERY_FEE);
        expect(lottoInfo.feeInfo.operator).to.be.eq(OPERATOR_FEE);
        expect(lottoInfo.feeInfo.denominator).to.be.eq(DENOMINATOR_FEE);

        // Getting the request ID out of events
        let requestId = tx.events?.pop()!.args!.requestId.toString();
        
        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        // Getting the basic info around this lottery
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        
        // Testing they are correct
        expect(lottoInfo.lotteryID).to.be.eq(lotteryId);
        expect(lottoInfo.lotteryType).to.be.eq(0);
        expect(lottoInfo.lotteryStatus).to.be.eq(2);
        expect(lottoInfo.prize).to.be.eq(0);
        expect(lottoInfo.closingTimestamp).to.be.eq(lottoInfo.startingTimestamp.add(1));
        expect(lottoInfo.winningNumber).to.be.eq(629);
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.maxValidRange).to.be.eq(10000);
        expect(lottoInfo.feeInfo.playToTheMoon).to.be.eq(PLAYTOTHEMOON_FEE);
        expect(lottoInfo.feeInfo.safu).to.be.eq(SAFU_FEE);
        expect(lottoInfo.feeInfo.nextLottery).to.be.eq(NEXT_LOTTERY_FEE);
        expect(lottoInfo.feeInfo.operator).to.be.eq(OPERATOR_FEE);
        expect(lottoInfo.feeInfo.denominator).to.be.eq(DENOMINATOR_FEE);

        await lotteryAsDeployer.prizeDistribution(0);
        
        // Getting the basic info around this lottery
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        
        // Testing they are correct
        expect(lottoInfo.lotteryID).to.be.eq(lotteryId);
        expect(lottoInfo.lotteryType).to.be.eq(0);
        expect(lottoInfo.lotteryStatus).to.be.eq(3);
        expect(lottoInfo.prize).to.be.eq(0);
        expect(lottoInfo.closingTimestamp).to.be.eq(lottoInfo.startingTimestamp.add(1));
        expect(lottoInfo.winningNumber).to.be.eq(629);
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.maxValidRange).to.be.eq(10000);
        expect(lottoInfo.feeInfo.playToTheMoon).to.be.eq(PLAYTOTHEMOON_FEE);
        expect(lottoInfo.feeInfo.safu).to.be.eq(SAFU_FEE);
        expect(lottoInfo.feeInfo.nextLottery).to.be.eq(NEXT_LOTTERY_FEE);
        expect(lottoInfo.feeInfo.operator).to.be.eq(OPERATOR_FEE);
        expect(lottoInfo.feeInfo.denominator).to.be.eq(DENOMINATOR_FEE);
      });
    
      it("should work - case 2", async function() {
        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);

        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(2)).to.be.eq(0);
        await expect(playDistributorAsAlice.getNumUsersOf(3)).to.be.reverted;
        // no oracle
        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        await expect(lotteryAsDeployer.refreshPrize(0)).to.be.reverted;

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        await expect(lotteryAsDeployer.refreshPrize(0)).to.be.reverted;
      });
    
      it("should work - case 3", async function() {
        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);

        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        // no oracle
        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        await expect(lotteryAsDeployer.refreshPrize(0)).to.be.reverted;
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(0);

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        await expect(lotteryAsDeployer.refreshPrize(0)).to.be.reverted;
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(2)).to.be.eq(0);
        
        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );
        
        await expect(lotteryAsDeployer.refreshPrize(0)).to.be.reverted;
        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
      });

      it ("should work - case 4", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(0);

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

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
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);

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
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);

        await vaultAlpacaStrategyBusdAsDeployer.withdraw(ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.withdraw(ethers.utils.parseEther('100'));

        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(1);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(1);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 1);
        
        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(1);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);

        await lotteryAsDeployer.cleanupDepositList(0, 0, await playDistributor.userLength());
      });

      it ("should work - case 5", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

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
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);

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
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);

        await lotteryAsDeployer.cleanupDepositList(0, 0, await playDistributor.userLength());

        await vaultAlpacaStrategyBusdAsAlice.withdraw(ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.withdraw(ethers.utils.parseEther('100'));

        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(1);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(1);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 1);
        
        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(1);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(1);
      });

      it ("should work - case 6", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);

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

        await lotteryAsDeployer.cleanupDepositList(0, 0, await playDistributor.userLength());

        await lotteryAsAlice.prizeDistribution(0);
        
        await vaultAlpacaStrategyBusdAsDeployer.withdraw(ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.withdraw(ethers.utils.parseEther('100'));
        
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(1);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(1);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 1);

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(1);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);
        
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 1, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);

        lotteryId = await lottery.getLotteryIdCounter(0);
        lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

        tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
        // Getting the request ID out of events
        requestId = tx.events?.pop()!.args!.requestId.toString();
        
        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        await lotteryAsDeployer.prizeDistribution(0);
        
        // Getting the basic info around this lottery
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(0);
        expect(lottoInfo.winnerAddress).to.be.eq(await alice.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(100);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
      });

      it ("should work - case 7", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        
        await lotteryAsDeployer.cleanupDepositList(0, 0, await playDistributor.userLength());

        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);

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
      });

      it ("should work - case 8", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

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
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(100);

        let lotteryId = await lottery.getLotteryIdCounter(0);
        let lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));

        // Drawing the numbers
        let tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
        
        await lotteryAsDeployer.cleanupDepositList(0, 0, await playDistributor.userLength());

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
      });

      it ("should work - case 9", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 1, 0, 0, BASIC_MULTIPLIER, 0, false);

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        await lotteryAsDeployer.setLottoConfig(1, true, 1, 1, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        await lotteryAsDeployer.createNewLotto(1);

        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);
        await expect(lotteryAsAlice.getNumUsers(1)).to.emit(lottery, 'GetNumUsers').withArgs(1, 2);

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

        await lotteryAsDeployer.cleanupDepositList(0, 0, await playDistributor.userLength());

        await lotteryAsAlice.prizeDistribution(0);

        lotteryId = await lottery.getLotteryIdCounter(1);
        lotteryInfoBefore = await lottery.getBasicLottoInfo(1, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        
        // Drawing the numbers
        tx = await (await lotteryAsDeployer.drawWinningNumbers(1)).wait();
        // Getting the request ID out of events
        requestId = tx.events?.pop()!.args!.requestId.toString();

        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        await lotteryAsAlice.prizeDistribution(1);

        await lotteryAsDeployer.cleanupDepositList(1, 0, await playDistributor.userLength());

        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
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
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);
        await expect(lotteryAsAlice.getNumUsers(1)).to.emit(lottery, 'GetNumUsers').withArgs(1, 2);
        
        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(1);
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(1, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(0);
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(1);
        expect (await lotteryAsDeployer.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(1)).to.be.eq(100);
        expect (await lotteryAsAlice.getNumTickets(1)).to.be.eq(100);
      });

      it ("should work - case 10", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 1, 0, 0, BASIC_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('50'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsAlice.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('150'));
        await vaultAlpacaStrategyBusdAsAlice.deposit(ethers.utils.parseEther('150'));

        await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        await lotteryAsDeployer.setLottoConfig(1, true, 1, 1, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        await lotteryAsDeployer.createNewLotto(1);

        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(2)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);
        await expect(lotteryAsAlice.getNumUsers(1)).to.emit(lottery, 'GetNumUsers').withArgs(1, 2);

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

        lotteryId = await lottery.getLotteryIdCounter(1);
        lotteryInfoBefore = await lottery.getBasicLottoInfo(1, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        
        // Drawing the numbers
        tx = await (await lotteryAsDeployer.drawWinningNumbers(1)).wait();
        // Getting the request ID out of events
        requestId = tx.events?.pop()!.args!.requestId.toString();

        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        await lotteryAsAlice.prizeDistribution(1);

        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(1);
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
        
        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(1);
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(1, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(0);
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(1);
        expect (await lotteryAsDeployer.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(1)).to.be.eq(50);
        expect (await lotteryAsAlice.getNumTickets(1)).to.be.eq(150);
      });
      
      it ("should work - case 11", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 1, 0, 0, BASIC_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('50'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        await lotteryAsDeployer.setLottoConfig(1, true, 1, 1, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        await lotteryAsDeployer.createNewLotto(1);

        await lotteryAsDeployer.cleanupDepositList(0, 0, await playDistributor.userLength());
        await lotteryAsDeployer.cleanupDepositList(1, 0, await playDistributor.userLength());

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

        lotteryId = await lottery.getLotteryIdCounter(1);
        lotteryInfoBefore = await lottery.getBasicLottoInfo(1, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        
        // Drawing the numbers
        tx = await (await lotteryAsDeployer.drawWinningNumbers(1)).wait();
        // Getting the request ID out of events
        requestId = tx.events?.pop()!.args!.requestId.toString();

        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        await lotteryAsAlice.prizeDistribution(1);

        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(1);
        expect(lottoInfo.winnerAddress).to.be.eq(await alice.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
        
        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(1);
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(1, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(0);
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(1);
        expect (await lotteryAsDeployer.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(1)).to.be.eq(50);
        expect (await lotteryAsAlice.getNumTickets(1)).to.be.eq(0);
      });

      it ("should work - case 12", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 1, 0, 0, BASIC_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
        await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('50'));

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('50'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        await lotteryAsDeployer.setLottoConfig(1, true, 1, 1, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        await lotteryAsDeployer.createNewLotto(1);

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

        await vaultWithoutStrategyPlayAsAlice.withdraw(ethers.utils.parseEther('100'));
        
        await lotteryAsDeployer.cleanupDepositList(1, 0, await playDistributor.userLength());

        await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));

        await lotteryAsAlice.prizeDistribution(0);

        lotteryId = await lottery.getLotteryIdCounter(1);
        lotteryInfoBefore = await lottery.getBasicLottoInfo(1, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        
        // Drawing the numbers
        tx = await (await lotteryAsDeployer.drawWinningNumbers(1)).wait();
        // Getting the request ID out of events
        requestId = tx.events?.pop()!.args!.requestId.toString();

        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        await lotteryAsAlice.prizeDistribution(1);

        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(1);
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsBob.getNumTickets(0)).to.be.eq(100);
        
        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(1);
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(1, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(0);
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(1);
        expect (await lotteryAsDeployer.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(1)).to.be.eq(50);
        expect (await lotteryAsAlice.getNumTickets(1)).to.be.eq(0);
        expect (await lotteryAsBob.getNumTickets(1)).to.be.eq(50);
      });

      it ("should work - case 13", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 1, 0, 0, BASIC_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
        await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('50'));

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('50'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 200000, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        await lotteryAsDeployer.setLottoConfig(1, true, 1, 100000, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        
        await lotteryAsDeployer.cleanupDepositList(0, 0, await playDistributor.userLength());
        
        await lotteryAsDeployer.createNewLotto(1);

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

        lotteryId = await lottery.getLotteryIdCounter(1);
        lotteryInfoBefore = await lottery.getBasicLottoInfo(1, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        
        // Drawing the numbers
        tx = await (await lotteryAsDeployer.drawWinningNumbers(1)).wait();
        // Getting the request ID out of events
        requestId = tx.events?.pop()!.args!.requestId.toString();

        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        await lotteryAsAlice.prizeDistribution(1);

        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(140629);
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.prize).to.be.eq(ethers.utils.parseUnits('49999999999999900000000', 0));

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(300);
        expect (await lotteryAsBob.getNumTickets(0)).to.be.eq(100);
        
        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(1);
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(1, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(40629);
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.prize).to.be.eq(ethers.utils.parseUnits('999981772945583129', 0));

        await lotteryAsDeployer.refreshPrize(1);
        expect (await lotteryAsDeployer.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(1)).to.be.eq(50);
        expect (await lotteryAsAlice.getNumTickets(1)).to.be.eq(0);
        expect (await lotteryAsBob.getNumTickets(1)).to.be.eq(50);
      });

      it ("should work - case 14", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 200000, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        
        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(3);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 3);

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
        lotteryId = await lottery.getLotteryIdCounter(0);
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(140629);
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.prize).to.be.eq(ethers.utils.parseUnits('34999999999999800000000', 0));

        await vaultAlpacaStrategyAlpacaAsBob.withdraw(ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsDeployer.withdraw(ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));
        
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(0);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);

        await vaultAlpacaStrategyAlpacaAsPlayToTheMoon.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await playToTheMoon.getAddress()));
        await vaultAlpacaStrategyAlpacaAsSafu.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await safu.getAddress()));
        await vaultAlpacaStrategyAlpacaAsOperator.withdraw(await vaultAlpacaStrategyAlpaca.balanceOf(await operator.getAddress()));
        
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(0);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(200);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
        expect (await lotteryAsBob.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsPlayToTheMoon.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsSafu.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsOperator.getNumTickets(0)).to.be.eq(0);

        let firstPrize = await lotteryAsAlice.getPrize(0);
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 1, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        
        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);

        lotteryId = await lottery.getLotteryIdCounter(0);
        lotteryInfoBefore = await lottery.getBasicLottoInfo(0, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        
        // Drawing the numbers
        tx = await (await lotteryAsDeployer.drawWinningNumbers(0)).wait();
        // Getting the request ID out of events
        requestId = tx.events?.pop()!.args!.requestId.toString();

        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        let beforePlayAmount = await playToken.balanceOf(await alice.getAddress());
        await lotteryAsAlice.prizeDistribution(0);
        let AfterPlayAmount = await playToken.balanceOf(await alice.getAddress());
        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(0);
        expect(lottoInfo.winnerAddress).to.be.eq(await alice.getAddress());
        expect(lottoInfo.prize).to.be.gt(firstPrize);

        expect (await lotteryAsDeployer.getPrize(0)).to.be.lt(firstPrize);
        expect(beforePlayAmount).to.be.eq(ethers.utils.parseUnits('900000000000000000000', 0));
        expect(AfterPlayAmount).to.be.eq(ethers.utils.parseUnits('66149000000000000000000', 0));
      });

      it ("should work - case 15", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 1, 0, 0, BASIC_MULTIPLIER, 0, false);

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        await lotteryAsDeployer.setLottoConfig(1, true, 1, 1, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        await lotteryAsDeployer.createNewLotto(1);
        
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(1);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(1);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 1);
        await expect(lotteryAsAlice.getNumUsers(1)).to.emit(lottery, 'GetNumUsers').withArgs(1, 1);

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

        lotteryId = await lottery.getLotteryIdCounter(1);
        lotteryInfoBefore = await lottery.getBasicLottoInfo(1, lotteryId);
        // Setting the time so that we can set winning numbers
        // Setting the time forward 
        await lotteryAsDeployer.setCurrentTime(lotteryInfoBefore.startingTimestamp.add(1));
        
        // Drawing the numbers
        tx = await (await lotteryAsDeployer.drawWinningNumbers(1)).wait();
        // Getting the request ID out of events
        requestId = tx.events?.pop()!.args!.requestId.toString();

        // Mocking the VRF Coordinator contract for random request fulfilment 
        await vrfCoodinatorAsDeployer.callBackWithRandomness(
          requestId,
          CHAINLINK_RANDOM_NUMBER,
          randomNumberGenerator.address
        );

        await lotteryAsAlice.prizeDistribution(1);
        
        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(1);
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.prize).to.be.eq(0);

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.eq(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
        
        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(1);
        lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(1, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(0);
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(1);
        expect (await lotteryAsDeployer.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(1)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(1)).to.be.eq(100);
        expect (await lotteryAsAlice.getNumTickets(1)).to.be.eq(0);
      });

      it ("should work - case 16", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 1, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(prizeVault.address, 0, 0, 0, 0, 0, false);
        await lotteryAsDeployer.updateVault(vaultWithoutStrategyPlay.address, 0, 0, PLAY_MULTIPLIER, 0, false);

        prizeVaultAsDeployer.setPrizePerBlock(ethers.utils.parseEther('1'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);

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
        lotteryId = await lottery.getLotteryIdCounter(0);
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(1);
        expect(lottoInfo.winnerAddress).to.be.eq(await deployer.getAddress());
        expect(lottoInfo.prize).to.be.gt(0);

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(200);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(200);
      });

      it ("should work - case 17", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 1, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(prizeVault.address, 0, 0, 0, 0, 0, false);
        await lotteryAsDeployer.updateVault(vaultWithoutStrategyPlay.address, 0, 0, PLAY_MULTIPLIER, 0, false);

        prizeVaultAsDeployer.setPrizePerBlock(ethers.utils.parseEther('1'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        
        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);

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

        await lotteryAsDeployer.updateVault(prizeVault.address, 1, 0, 0, 0, false);

        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);
        await expect(lotteryAsAlice.getNumUsers(1)).to.be.revertedWith('lottery is not existed.');
        
        await lotteryAsDeployer.setLottoConfig(1, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        await lotteryAsDeployer.createNewLotto(1);

        await expect(lotteryAsAlice.getNumUsers(1)).to.emit(lottery, 'GetNumUsers').withArgs(1, 0);

        await lotteryAsAlice.prizeDistribution(0);

        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
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

      it ("should work - case 18", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 1, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(prizeVault.address, 0, 0, 0, 0, 0, false);
        await lotteryAsDeployer.updateVault(vaultWithoutStrategyPlay.address, 0, 0, PLAY_MULTIPLIER, 0, false);

        prizeVaultAsDeployer.setPrizePerBlock(ethers.utils.parseEther('1'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);

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

        await lotteryAsDeployer.updateVault(vaultWithoutStrategyPlay.address, 1, 0, 0, 0, false);

        await lotteryAsAlice.prizeDistribution(0);

        // Getting the basic info around this lottery
        lotteryId = await lottery.getLotteryIdCounter(0);
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        // Testing they are correct
        expect(lottoInfo.winningNumber).to.be.eq(1);
        expect(lottoInfo.winnerAddress).to.be.eq(ADDRESS0);
        expect(lottoInfo.prize).to.be.eq(ethers.utils.parseUnits('16000000000000000000', 0));

        await lotteryAsDeployer.refreshPrize(0);
        expect (await lotteryAsDeployer.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsAlice.getPrize(0)).to.be.gt(0);
        expect (await lotteryAsDeployer.getNumTickets(0)).to.be.eq(0);
        expect (await lotteryAsAlice.getNumTickets(0)).to.be.eq(0);
      });

      it ("should work - case 19", async function() {
        await lotteryAsDeployer.addVault(vaultWithoutStrategyPlay.address, 0, 0, 0, PLAY_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyBusd.address, 1, 0, 0, BASIC_MULTIPLIER, 0, false);
        await lotteryAsDeployer.addVault(vaultAlpacaStrategyAlpaca.address, 0, 0, 0, BASIC_MULTIPLIER, 0, false);

        await playTokenAsAlice.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsAlice.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsBob.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsBob.deposit(ethers.utils.parseEther('100'));

        await busdTokenAsBob.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
        await vaultAlpacaStrategyBusdAsBob.deposit(ethers.utils.parseEther('50'));

        await busdTokenAsDeployer.approve(vaultAlpacaStrategyBusd.address, ethers.utils.parseEther('50'));
        await vaultAlpacaStrategyBusdAsDeployer.deposit(ethers.utils.parseEther('50'));

        await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
        await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsDeployer.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsDeployer.deposit(ethers.utils.parseEther('100'));

        await alpacaTokenAsAlice.approve(vaultAlpacaStrategyAlpaca.address, ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsAlice.deposit(ethers.utils.parseEther('100'));

        await priceOracleAsDeployer.setPrices(
          [playToken.address, alpacaToken.address, busdToken.address], 
          [busdToken.address, busdToken.address, busdToken.address], 
          [ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]
        );

        await lotteryAsDeployer.setLottoConfig(0, true, 1, 2, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
        await lotteryAsDeployer.setLottoConfig(1, true, 1, 1, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);

        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
        await lotteryAsDeployer.createNewLotto(1);

        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(2)).to.be.eq(3);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 3);
        await expect(lotteryAsAlice.getNumUsers(1)).to.emit(lottery, 'GetNumUsers').withArgs(1, 2);

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

        await vaultWithoutStrategyPlayAsAlice.withdraw(ethers.utils.parseEther('100'));
        await vaultAlpacaStrategyAlpacaAsAlice.withdraw(ethers.utils.parseEther('100'));

        expect (await playDistributorAsAlice.getNumUsersOf(0)).to.be.eq(1);
        expect (await playDistributorAsAlice.getNumUsersOf(1)).to.be.eq(2);
        expect (await playDistributorAsAlice.getNumUsersOf(2)).to.be.eq(2);
        await expect(lotteryAsAlice.getNumUsers(0)).to.emit(lottery, 'GetNumUsers').withArgs(0, 2);
        await expect(lotteryAsAlice.getNumUsers(1)).to.emit(lottery, 'GetNumUsers').withArgs(1, 2);
      });
    });

    context('boolean test', async() => {
      it('should work', async() => {
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 10000, 0, 0, 0, 0, 1, ADDRESS0, 0);
        // Creating a new lottery (type 0)
        await expect(lotteryAsDeployer.createNewLotto(0)).to.emit(lottery, 'LotteryOpen')
        // Checking that emitted event contains correct information
        .withArgs(
          0, // lottery type
          1 // lottery id
        );

        await lotteryAsAlice.refreshPrize(0);
        await lotteryAsDeployer.setRefreshPrizeOn(false);
        await expect(lotteryAsAlice.refreshPrize(0)).to.be.revertedWith('refreshPrize off');
        await lotteryAsDeployer.setRefreshPrizeOn(true);
        await lotteryAsAlice.refreshPrize(0);
  
        await lotteryAsAlice.cleanupDepositList(0, 0, await playDistributor.userLength());
        await lotteryAsDeployer.setCleanupDepositListOn(false);
        await expect(lotteryAsAlice.cleanupDepositList(0, 0, await playDistributor.userLength())).to.be.revertedWith('cleanupDepositList off');
        await lotteryAsDeployer.setCleanupDepositListOn(true);
        await lotteryAsAlice.cleanupDepositList(0, 0, await playDistributor.userLength());
  
        await lotteryAsAlice.getNumUsers(0);
        await lotteryAsDeployer.setGetNumUsersOn(false);
        await expect(lotteryAsAlice.getNumUsers(0)).to.be.revertedWith('getNumUsers off');
        await lotteryAsDeployer.setGetNumUsersOn(true);
        await lotteryAsAlice.getNumUsers(0);
      });
    });
    
    context('prizeLocker params', async() => {
      it('case 1', async() => {
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 10000, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 0);
  
        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
  
        let lotteryId = await lotteryAsDeployer.getLotteryIdCounter(0);
        // Getting the basic info around this lottery
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        
        // Testing they are correct
        expect(lottoInfo.prizeLocker).to.be.eq(ADDRESS0);
        expect(lottoInfo.prizeLockupBlock).to.be.eq(0);
      })
  
      it('case 2', async() => {
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 10000, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS1, 0);
  
        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
  
        let lotteryId = await lotteryAsDeployer.getLotteryIdCounter(0);
        // Getting the basic info around this lottery
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        
        // Testing they are correct
        expect(lottoInfo.prizeLocker).to.be.eq(ADDRESS1);
        expect(lottoInfo.prizeLockupBlock).to.be.eq(0);
      })
      it('case 3', async() => {
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 10000, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS0, 1);
  
        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
  
        let lotteryId = await lotteryAsDeployer.getLotteryIdCounter(0);
        // Getting the basic info around this lottery
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        
        // Testing they are correct
        expect(lottoInfo.prizeLocker).to.be.eq(ADDRESS0);
        expect(lottoInfo.prizeLockupBlock).to.be.eq(1);
      })
  
      it('case 4', async() => {
        await lotteryAsDeployer.setLottoConfig(0, true, 1, 10000, PLAYTOTHEMOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, ADDRESS1, 1);
  
        // Creating a new lottery
        await lotteryAsDeployer.createNewLotto(0);
  
        let lotteryId = await lotteryAsDeployer.getLotteryIdCounter(0);
        // Getting the basic info around this lottery
        let lottoInfo = await lotteryAsDeployer.getBasicLottoInfo(0, lotteryId);
        
        // Testing they are correct
        expect(lottoInfo.prizeLocker).to.be.eq(ADDRESS1);
        expect(lottoInfo.prizeLockupBlock).to.be.eq(1);
      })
    })
  });
});