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
  PlayDistributor,
  PlayDistributor__factory,
  MockERC20,
  MockERC20__factory,
  PriceOracle,
  PriceOracle__factory,
  MockVault,
  MockVault__factory,
  Config,
  Config__factory
} from "../typechain";
import * as TimeHelpers from "./helpers/time"

chai.use(solidity);
const { expect } = chai;

describe("CleanupDepositList", function() {
  this.timeout(0);
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const WBNB_ADDRESS = '0x0000000000000000000000000000000000000002'
  const PANCAKEROUTERV2_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PANCAKEFACTORYV2_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PLAYTOTHEMOON_ADDRESS = '0x0000000000000000000000000000000000000001'
  const BASIC_MULTIPLIER = 10000;
  const MAX_FEE = 10;

  let vault0AsVault0: MockVault;
  let vault1AsVault1: MockVault;

  let playDistributorAsVault0: PlayDistributor;
  let playDistributorAsVault1: PlayDistributor;
  let playDistributorAsLottery: PlayDistributor;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let lottery: Signer;
  let vault0: Signer;
  let vault1: Signer;

  let playToken: PlayToken;
  let playDistributor: PlayDistributor;
  let tokens: MockERC20[];

  let priceOracle: PriceOracle;
  let referencePriceToken: MockERC20;
  
  let priceOracleAsDeployer: PriceOracle;

  let vaults: MockVault[];

  let config: Config;

  beforeEach(async() => {
    [deployer, alice, bob, lottery, vault0, vault1] = await ethers.getSigners();

    const MockERC20 = (await ethers.getContractFactory(
      "MockERC20",
      deployer
    )) as MockERC20__factory;

    const PriceOracle = (await ethers.getContractFactory(
      "PriceOracle",
      deployer
    )) as PriceOracle__factory;
    priceOracle = await PriceOracle.deploy(await deployer.getAddress());
    await priceOracle.deployed();

    referencePriceToken = await MockERC20.deploy("BUSDToken", "BUSD");
    await referencePriceToken.deployed();

    const Config = (await ethers.getContractFactory(
      "Config",
      deployer
    )) as Config__factory;
    config = await Config.deploy(await lottery.getAddress(), PANCAKEROUTERV2_ADDRESS, PANCAKEFACTORYV2_ADDRESS, WBNB_ADDRESS, priceOracle.address, referencePriceToken.address, MAX_FEE);
    await config.deployed();

    // Setup PlayDistributor contract
    // Deploy PLAYs
    const PlayToken = (await ethers.getContractFactory(
      "PlayToken",
      deployer
    )) as PlayToken__factory;
    playToken = await PlayToken.deploy();
    await playToken.deployed();

    tokens = new Array();
    for(let i = 0; i < 2; i++) {
      let mockERC20: MockERC20;
      mockERC20 = await MockERC20.deploy(`TOKEN${i}`, `TOKEN${i}`);
      await mockERC20.deployed();
      tokens.push(mockERC20);
    }

    // Deploy PlayDistributor
    const PlayDistributor = (await ethers.getContractFactory(
      "PlayDistributor",
      deployer
    )) as PlayDistributor__factory;
    playDistributor = await PlayDistributor.deploy(
      playToken.address, PLAY_REWARD_PER_BLOCK, await lottery.getAddress(), PLAYTOTHEMOON_ADDRESS, config.address)
    await playDistributor.deployed();

    await playToken.transferOwnership(playDistributor.address);

    const MockVault = (await ethers.getContractFactory(
      "MockVault",
      deployer
    )) as MockVault__factory;

    vaults = new Array();
    for(let i = 0; i < 2; i++) {
      let vault: MockVault;
      vault = await MockVault.deploy(playDistributor.address, tokens[i].address, `VAULT${i}`, `VAULT${i}`);
      await vault.deployed();
      vaults.push(vault);
    }

    vault0AsVault0 = MockVault__factory.connect(vaults[0].address, vault0);
    vault1AsVault1 = MockVault__factory.connect(vaults[1].address, vault1);

    playDistributorAsLottery = PlayDistributor__factory.connect(playDistributor.address, lottery);
    playDistributorAsVault0 = PlayDistributor__factory.connect(playDistributor.address, vault0);
    playDistributorAsVault1 = PlayDistributor__factory.connect(playDistributor.address, vault1);

    priceOracleAsDeployer = PriceOracle__factory.connect(priceOracle.address, deployer);

    for(let i = 0; i < 2; i++) {
      await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
    }
  });
  
  context('2 pool, 2 user, variable start, deposit/withdraw, variable end', async () => {
    it('should work - end: 0', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('200'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, 0);
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
    });

    it('should work - end: (last - 1)', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('200'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, (await playDistributor.userLength()).sub(1));
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
    });

    it('should work - end: (last + 1)', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('200'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, (await playDistributor.userLength()).add(1));
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
    });
  });

  context('2 pool, 2 user, variable start, deposit/withdraw', async () => {
    it('should work - case 1', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('200'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
    });
    
    it('should work - case 2', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('200'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
    });

    it('should work - case 3', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('200'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
    });

    it('should work - case 4', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('200'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsVault1.withdraw((await bob.getAddress()), 1, ethers.utils.parseEther('10'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('20'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(80);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(90);
    });
  });

  context('1 pool, 2 user, 0 start, deposit/withdraw', async () => {
    it('should work - case 1', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);
    });

    it('should work - case 2', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('400'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('20'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await bob.getAddress()), 0, ethers.utils.parseEther('120'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), depositTime)).to.be.eq(80);
    });
  });

  context('1 pool, 1 user, 0 start, deposit/withdraw', async () => {
    it('should work - case 1', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });

    it('should work - case 2', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });

    it('should work - case 3', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });

    it('should work - case 4', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });
    
    it('should work - case 5', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      const depositTime = (await TimeHelpers.latest());
      
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(1);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(1);
    });
    
    it('should work - case 6', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      const depositTime = (await TimeHelpers.latest());
      
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(1);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(1);
    });
    
    it('should work - case 7', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      const depositTime = (await TimeHelpers.latest());
      
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(1);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('3'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });
    
    it('should work - case 8', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      const depositTime = (await TimeHelpers.latest());
      
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(1);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('3'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });
    
    it('should work - case 9', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(2);
    });
    
    it('should work - case 10', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('1'));
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(2);
    });
    
    it('should work - case 11', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('3'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });
    
    it('should work - case 12', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('3'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });
    
    it('should work - case 13', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('4'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);
    });
    
    it('should work - case 14', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);
    });
    
    it('should work - case 15', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('6'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(2);
    });
    
    it('should work - case 16', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('4'));
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);
    });
    
    it('should work - case 17', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('5'));
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);
    });
    
    it('should work - case 18', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('6'));
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(2);
    });
    
    it('should work - case 19', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('8'));
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });
  });

  context('1 pool, 1 user, variable start, deposit', async () => {
    it('should work - case 1', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 1, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
    });
  });

  context('1 pool, 1 user, 0 start, deposit', async () => {
    it('should work - case 1', async () => {
      const depositTime = (await TimeHelpers.latest());

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
    });

    it('should work - case 2', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });

    it('should work - case 3', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
    });

    it('should work - case 4', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(100);
    });

    it('should work - case 5', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      const depositTime = (await TimeHelpers.latest());
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(0);
    });
    
    it('should work - case 6', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      const depositTime = (await TimeHelpers.latest());
      
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(1);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(1);
    });
    
    it('should work - case 7', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);
    });
    
    it('should work - case 8', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);
    });
    
    it('should work - case 9', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('7'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('7'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(3);
    });
    
    it('should work - case 10', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('3'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('3'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('7'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('7'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(6);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(6);
    });
    
    it('should work - case 11', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('1000'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('1'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('1'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('2'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('2'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('3'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('3'));

      const depositTime = (await TimeHelpers.latest());

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('5'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('5'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('7'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('7'));

      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('8'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('8'));

      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(6);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await playDistributorAsLottery.cleanupDepositList(depositTime, 0, await playDistributor.userLength());
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), depositTime)).to.be.eq(6);
    });
  });
});