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
  LinearRelease,
  LinearRelease__factory,
  Fund,
  Fund__factory,
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

describe("PlayDistributorPrizeDistribution", function() {
  this.timeout(0);
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const WBNB_ADDRESS = '0x0000000000000000000000000000000000000002'
  const PANCAKEROUTERV2_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PANCAKEFACTORYV2_ADDRESS = '0x0000000000000000000000000000000000000001'
  const BASIC_MULTIPLIER = 10000;
  const MAX_FEE = 10;

  let vault0AsVault0: MockVault;
  let vault1AsVault1: MockVault;

  let playDistributorAsDeployer: PlayDistributor;
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

  let playToTheMoon: Fund;
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

    const Fund = (await ethers.getContractFactory(
      "Fund",
      deployer
    )) as Fund__factory;
    playToTheMoon = await Fund.deploy(config.address, true);
    await playToTheMoon.deployed();

    // Setup PlayDistributor contract
    // Deploy PLAYs
    const PlayToken = (await ethers.getContractFactory(
      "PlayToken",
      deployer
    )) as PlayToken__factory;
    playToken = await PlayToken.deploy();
    await playToken.deployed();

    tokens = new Array();
    for(let i = 0; i < 4; i++) {
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
      playToken.address, PLAY_REWARD_PER_BLOCK, await lottery.getAddress(), playToTheMoon.address, config.address)
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

    playDistributorAsDeployer = PlayDistributor__factory.connect(playDistributor.address, deployer);
    playDistributorAsLottery = PlayDistributor__factory.connect(playDistributor.address, lottery);
    playDistributorAsVault0 = PlayDistributor__factory.connect(playDistributor.address, vault0);
    playDistributorAsVault1 = PlayDistributor__factory.connect(playDistributor.address, vault1);

    priceOracleAsDeployer = PriceOracle__factory.connect(priceOracle.address, deployer);
  });
  
  context('findWinnerAndTransferPrize', async () => {
    it('alice deposits 100 vault0, alice become the winner (numberDrawn: 0)', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsDeployer.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(0);
      await playDistributorAsLottery.setUserCountStatus(2);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(playDistributorAsLottery.addPrizePool(1)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('alice deposits 100 vault0 after startingTimestamp, so cant become the winner (numberDrawn: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);

      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 3. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 4. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
            
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.addUserCountPoolId(0);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(1);
      await playDistributorAsLottery.setUserCountStatus(2);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('alice deposits vault0, alice become the winner (numberDrawn: 99)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await expect(playDistributorAsLottery.addPrizePool(1)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(99, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('alice deposits 100 vault0, but cant become the winner (numberDrawn: 100)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(100, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });
    
    it('alice deposits 50 vault0 before startingTimestamp and 50 vault0 after staringTimestamp and withdraw 51 vault0, alice become the winner (numberDrawn:48) LIFO manner', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsVault0.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsVault1.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      
      // 6. Withdraw 51 vault0
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('51'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      
      // 7. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(49);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(playDistributorAsLottery.addPrizePool(1)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(48, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);
      
      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
    
    it('alice deposits 50 vault0 before startingTimestamp and 50 vault0 after staringTimestamp and withdraw 51 vault0, alice cant become the winner (numberDrawn:49) LIFO manner', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));
      
      // 6. Withdraw 51 vault0
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('51'));
      
      // 7. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(49);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(playDistributorAsLottery.addPrizePool(1)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(49, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });
    
    it('alice deposits 50 vault0 before startingTimestamp and 50 vault0 after staringTimestamp and withdraw 50 vault0, alice become the winner (numberDrawn:49) LIFO manner', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));
      
      // 6. Withdraw 50 vault0
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('50'));
      
      // 7. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(50);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await expect(playDistributorAsLottery.addPrizePool(0)).to.be.revertedWith('duplicated pool id');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(49, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('alice deposits 50 vault0 before startingTimestamp and 50 vault0 after staringTimestamp, alice become the winner (numberDrawn:49)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));
      
      // 6. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(50);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(49, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('alice deposits 50 vault0 before startingTimestamp and 50 vault0 after staringTimestamp, alice cant become the winner (numberDrawn:50)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));
      
      // 6. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(50);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(50, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });
    
    it('alice deposits 100 vault0 and withdraw 99 vault0, (numberDrawn: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 and vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 and vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0/vault1 to the vault0/vault1 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      // 4. Withdraw 99 vault0
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('99'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      
      // 5. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 6. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(1);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);
      
      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('withdraw all, anyone cant become the winner (numberDrawn: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('50'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. Withdraw 100 vault0
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      
      // 6. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('alice re-deposits after withdraw all (numberDrawn: 0)', async () => {
    // 0. set the token price
    // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
    for (let i = 0; i < tokens.length; ++i) {
      await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
    }
    // playToken: 1 busd
    await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
    // set PlayPerBlock to zero for prize test
    await playDistributorAsDeployer.setPlayPerBlock(0);
    
    // 1. Add vault0 to the playDistributor pool
    await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
    
    // 2. Mint vault0 for staking
    await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('50'));
    
    // 3. Deposit vault0 to the vault0 pool
    await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
    await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

    expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
    expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

    // 4. Withdraw 50 vault0
    await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('50'));
    
    expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
    expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);

    // 5. Deposit vault0 to the vault0 pool
    await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
    await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));
    
    expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
    expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

    // 6. Start new lotto
    const startingTimestamp = (await TimeHelpers.latest());
    
    // 7. lotto numbers drawn, find winner and give prize
    expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(50);
    
    await playDistributorAsLottery.clearPrizePools();
    await playDistributorAsLottery.setPrizePoolStatus(0);
    await playDistributorAsLottery.addPrizePool(0);
    await playDistributorAsLottery.setPrizePoolStatus(1);
    let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
    await playDistributorAsLottery.setPrizePoolStatus(2);
    expect(winnerAddress).to.be.eq(await alice.getAddress());
    await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

    expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
  });
    
    it('multiplier 1.0 alice become winner (numberDrawn: 49)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('50'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(50);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(49, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('multiplier 0 (numberDrawn: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER * 0, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('99999'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('99999'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('99999'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('multiplier 0.5, alice cant become winner (numberDrawn: 49)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER * 0.5, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('50'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('50'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(25);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(49, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('multiplier 0.5, alice become winner (numberDrawn: 49)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER * 0.5, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(50);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(49, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('multiplier 2, alice become winner (numberDrawn: 49)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER * 2, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('25'));
      
      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('25'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('25'));

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(50);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(49, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
    
    it('prize 0 (numberDrawn: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('0'), ethers.utils.parseEther('0'), ADDRESS0, 0);
      
      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('play to the moon prize 0 (numberDrawn: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('0'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    
    it('alice deposits 100 vault0 and 50 vault1, alice become the winner (numberDrawn: 199)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 and vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 and vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));

      // 3. Deposit vault0/vault1 to the vault0/vault1 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);
      
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.addUserCountPoolId(0);
      await playDistributorAsLottery.addUserCountPoolId(1);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(1);
      await playDistributorAsLottery.setUserCountStatus(2);

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await alice.getAddress()), 1, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);
      
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.addUserCountPoolId(0);
      await playDistributorAsLottery.addUserCountPoolId(1);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(1);
      await playDistributorAsLottery.setUserCountStatus(2);
      
      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
            
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(199, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(199, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(199, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('alice deposits 100 vault0 and 50 vault1, alice cant become the winner (numberDrawn: 200)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 and vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 and vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));

      // 3. Deposit vault0/vault1 to the vault0/vault1 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await alice.getAddress()), 1, ethers.utils.parseEther('50'));
      
      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(200, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
      
      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });
    
    it('alice deposits 100 vault0 and 50 vault1 and withdraw all, (numberDrawn: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 and vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 and vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));

      // 3. Deposit vault0/vault1 to the vault0/vault1 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await alice.getAddress()), 1, ethers.utils.parseEther('50'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);

      // 4. Withdraw all
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);

      await playDistributorAsVault1.withdraw((await alice.getAddress()), 1, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);
      
      // 5. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 6. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
      
      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('alice deposits 100 vault0 and 50 vault1 and withdraw all, re-deposits 100 vault0 and 50 vault1, (numberDrawn: 99)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 and vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 and vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));

      // 3. Deposit vault0/vault1 to the vault0/vault1 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await alice.getAddress()), 1, ethers.utils.parseEther('50'));
      
      // 4. Withdraw all
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.withdraw((await alice.getAddress()), 1, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      // 5. Re-deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);
      
      // 6. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 7. Re-deposit vault1 to the vault1 pool
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await alice.getAddress()), 1, ethers.utils.parseEther('50'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);

      // 8. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await expect(playDistributorAsLottery.addPrizePool(2)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(99, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('alice deposits 100 vault0 and 50 vault1 and withdraw all, re-deposits 100 vault0 and 50 vault1, (numberDrawn: 100)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 and vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);

      // 2. Mint vault0 and vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));

      // 3. Deposit vault0/vault1 to the vault0/vault1 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await alice.getAddress()), 1, ethers.utils.parseEther('50'));
      
      // 4. Withdraw all
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      await playDistributorAsVault1.withdraw((await alice.getAddress()), 1, ethers.utils.parseEther('50'));

      // 5. Re-deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      // 6. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());
      
      // 7. Re-deposit vault1 to the vault1 pool
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await alice.getAddress()), 1, ethers.utils.parseEther('50'));

      // 8. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(100, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('multi user case: alice win (draw number: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0, vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0, vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      // 3. Alice - Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.addUserCountPoolId(0);
      await playDistributorAsLottery.addUserCountPoolId(1);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(1);
      await playDistributorAsLottery.setUserCountStatus(2);

      // 4. Bob - Deposit vault1 to the vault1 pool
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(2);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);
      
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.addUserCountPoolId(0);
      await playDistributorAsLottery.addUserCountPoolId(1);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(2);
      await playDistributorAsLottery.setUserCountStatus(2);
      
      // 5. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 6. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await bob.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
    
    it('multi user case: bob win (draw number: 100)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0, vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0, vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));

      // 3. Alice - Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Bob - Deposit vault1 to the vault1 pool
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('50'));
      
      // 5. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 6. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(playDistributorAsLottery.addPrizePool(2)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(100, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await bob.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await bob.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
    
    it('multi user case: bob win (draw number: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0, vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0, vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      // 3. Alice - Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsLottery.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      // 4. Bob - Deposit vault1 to the vault1 pool
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('50'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(2);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);

      // 5. Alice - Withdraw all
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);

      // 6. Alice - Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsVault0.userLength()).to.be.eq(2);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);
      
      // 5. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 6. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await bob.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await bob.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
    
    it('multi user case: alice win (draw number: 50)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0, vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0, vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('50'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      // 3. Alice - Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      // 4. Bob - Deposit vault1 to the vault1 pool
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(2);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);

      // 5. Alice - Withdraw all
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);

      // 6. Bob - Withdraw all
      await playDistributorAsVault1.withdraw((await bob.getAddress()), 1, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(0);

      // 7. Bob - Deposit vault1 to the vault1 pool
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('50'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);

      // 8. Alice - Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(2);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[1].getPoolId())).to.be.eq(1);
      
      // 9. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 10. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(100, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await bob.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
    
    it('multi user case: alice win (draw number: 0)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0, vault1 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addPool(1, vaults[1].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0, vault1 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('200'));
      await vaults[1].mint(await vault1.getAddress(), ethers.utils.parseEther('100'));

      // 3. Alice - Deposit vault0/vault1 to the vault0/vault1 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await alice.getAddress()), 1, ethers.utils.parseEther('50'));

      // 4. Bob - Deposit vault0/vault1 to the vault0/vault1 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));
      await vault1AsVault1.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsVault1.deposit((await bob.getAddress()), 1, ethers.utils.parseEther('50'));

      // 5. Alice - Withdraw all vault0 
      await playDistributorAsVault0.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      // 6. Bob - Withdraw all vault1
      await playDistributorAsVault1.withdraw((await bob.getAddress()), 1, ethers.utils.parseEther('50'));
      
      // 9. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 10. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(100);
      expect(await playDistributorAsLottery.getNumTickets(await vaults[1].getPoolId(), await bob.getAddress(), startingTimestamp)).to.be.eq(0);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.addPrizePool(1);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await bob.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
    
    it('when no one deposits', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 3. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(0);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
    });

    it('when no one deposits (multiple pool)', async () => {
      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);

      // 1. Add vault0...N to the playDistributor pool
      for (let i = 0; i < vaults.length; ++i)
        await playDistributorAsLottery.addPool(1, vaults[i].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 3. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);
      for (let i = 0; i < vaults.length; ++i)
        expect(await playDistributorAsLottery.getNumUsersOf(await vaults[i].getPoolId())).to.be.eq(0);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
    });
    
    it('The token price is not set in oracle.', async () => {
      // 1. Start new lotto
      let startingTimestamp = (await TimeHelpers.latest());

      // 2. Add VAULT0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 3. lotto numbers drawn, find winner and give prize
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      expect(await playDistributorAsLottery.findWinner(0, startingTimestamp)).to.be.eq(ADDRESS0);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      // 4. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 5. deposit vault0
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      startingTimestamp = (await TimeHelpers.latest());

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await expect(playDistributorAsLottery.findWinner(0, startingTimestamp)).to.be.reverted;
    });

    it('The token price is not set in oracle. (multiple pool)', async () => {
      // 1. Start new lotto
      let startingTimestamp = (await TimeHelpers.latest());

      // 2. Add VAULT0...N to the playDistributor pool
      for (let i = 0; i < vaults.length; ++i)
        await playDistributorAsLottery.addPool(1, vaults[i].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 3. lotto numbers drawn, find winner and give prize
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      expect(await playDistributorAsLottery.findWinner(0, startingTimestamp)).to.be.eq(ADDRESS0);
      await playDistributorAsLottery.setPrizePoolStatus(2);

      // 4. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 5. deposit vault0
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsLottery.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      startingTimestamp = (await TimeHelpers.latest());

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await expect(playDistributorAsLottery.findWinner(0, startingTimestamp)).to.be.reverted;
    });
    
    it('blacklist cant become the winner', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsDeployer.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());

      await playDistributorAsDeployer.addBlackList(await alice.getAddress());
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
    });
  });
  
  context('maxTransferPrize', async() => {
    it('should work', async () => {
      // 0. set the token price - playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      
      await playDistributorAsLottery.transferPrize(await alice.getAddress(), ethers.utils.parseEther('100000'), ethers.utils.parseEther('1'), ADDRESS0, 0);
      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('100000'));
  
      await playDistributorAsDeployer.setMaxTransferPrize(ethers.utils.parseEther('1'));
  
      await playDistributorAsLottery.transferPrize(await bob.getAddress(), ethers.utils.parseEther('100000'), ethers.utils.parseEther('1'), ADDRESS0, 0);
      expect(await playToken.balanceOf(await bob.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
  });

  context('PrizePoolStatus', async () => {
    it('should work', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await playDistributorAsLottery.clearPrizePools();

      await expect(playDistributorAsLottery.addPrizePool(0)).to.be.revertedWith('prizePoolStatus is not clear');
      await expect(playDistributorAsLottery.findWinner(0, 0)).to.be.revertedWith('prizePoolStatus is not added');

      await playDistributorAsLottery.setPrizePoolStatus(0);

      await playDistributorAsLottery.addPrizePool(0);

      await expect(playDistributorAsLottery.clearPrizePools()).to.be.revertedWith('prizePoolStatus is not finished');
      await expect(playDistributorAsLottery.findWinner(0, 0)).to.be.revertedWith('prizePoolStatus is not added');

      await playDistributorAsLottery.setPrizePoolStatus(1);

      await playDistributorAsLottery.findWinner(0, 0);

      await expect(playDistributorAsLottery.clearPrizePools()).to.be.revertedWith('prizePoolStatus is not finished');
      await expect(playDistributorAsLottery.addPrizePool(0)).to.be.revertedWith('prizePoolStatus is not clear');

      await playDistributorAsLottery.setPrizePoolStatus(2);
      
      await playDistributorAsLottery.clearPrizePools();

      await expect(playDistributorAsLottery.addPrizePool(0)).to.be.revertedWith('prizePoolStatus is not clear');
      await expect(playDistributorAsLottery.findWinner(0, 0)).to.be.revertedWith('prizePoolStatus is not added');
    });
  });

  context('UserCountStatus', async () => {
    it('should work - case 1', async () => {
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      await playDistributorAsLottery.clearUserCountPoolId();

      await expect(playDistributorAsLottery.addUserCountPoolId(0)).to.be.revertedWith('userCountStatus is not clear');
      await expect(playDistributorAsLottery.getNumUsers()).to.be.revertedWith('userCountStatus is not added');

      await playDistributorAsLottery.setUserCountStatus(0);

      await playDistributorAsLottery.addUserCountPoolId(0);

      await expect(playDistributorAsLottery.clearUserCountPoolId()).to.be.revertedWith('userCountStatus is not finished');
      await expect(playDistributorAsLottery.getNumUsers()).to.be.revertedWith('userCountStatus is not added');

      await playDistributorAsLottery.setUserCountStatus(1);

      await playDistributorAsLottery.getNumUsers();

      await expect(playDistributorAsLottery.clearUserCountPoolId()).to.be.revertedWith('userCountStatus is not finished');
      await expect(playDistributorAsLottery.addUserCountPoolId(0)).to.be.revertedWith('userCountStatus is not clear');

      await playDistributorAsLottery.setUserCountStatus(2);
      
      await playDistributorAsLottery.clearUserCountPoolId();

      await expect(playDistributorAsLottery.addUserCountPoolId(0)).to.be.revertedWith('userCountStatus is not clear');
      await expect(playDistributorAsLottery.getNumUsers()).to.be.revertedWith('userCountStatus is not added');
    });

    it('should work - case 2', async () => {
      await playDistributorAsLottery.setUserCountStatus(0);
      await expect(playDistributorAsLottery.addUserCountPoolId(0)).to.be.revertedWith('invalid poolInfo index');

      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.addUserCountPoolId(0);
      
      await expect(playDistributorAsLottery.addUserCountPoolId(0)).to.be.revertedWith('duplicated pool id');
    });
  });

  context('fixed price', async () => {
    it('fixed Price (on): 0, alice deposits 100 vault0, no winner (numberDrawn: 0)', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, true);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsDeployer.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(0);
      
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(0);
      await playDistributorAsLottery.setUserCountStatus(2);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(playDistributorAsLottery.addPrizePool(1)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('0'));
    });

    it('fixed Price (on): 1 ether, alice deposits 100 vault0, alice become the winner (numberDrawn: 0)', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, ethers.utils.parseEther('1'), true);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsDeployer.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(0);
      await playDistributorAsLottery.setUserCountStatus(2);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(playDistributorAsLottery.addPrizePool(1)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('fixed Price (off): 0, alice deposits 100 vault0, alice become the winner (numberDrawn: 0)', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsDeployer.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(0);
      await playDistributorAsLottery.setUserCountStatus(2);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(playDistributorAsLottery.addPrizePool(1)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('fixed Price (off): 1 ether, alice deposits 100 vault0, alice become the winner (numberDrawn: 0)', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, ethers.utils.parseEther('1'), false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsDeployer.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      
      await playDistributorAsLottery.clearUserCountPoolId();
      await playDistributorAsLottery.setUserCountStatus(0);
      await playDistributorAsLottery.setUserCountStatus(1);
      await expect(playDistributorAsLottery.getNumUsers()).to.emit(playDistributor, 'GetNumUsers').withArgs(0);
      await playDistributorAsLottery.setUserCountStatus(2);

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');
      
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(playDistributorAsLottery.addPrizePool(1)).to.be.revertedWith('invalid poolInfo index');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(ADDRESS0);
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0)).to.be.revertedWith('wrong winner address');

      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 0);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
  });

  context('prizeLocker', async() => {
    it('prizeLocker: on, alice deposits 100 vault0, alice become the winner (numberDrawn: 0)', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsDeployer.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS1, 1)).to.be.reverted;

      const LinearRelease = (await ethers.getContractFactory(
        "LinearRelease",
        deployer
      )) as LinearRelease__factory;

      let linearRelease = await LinearRelease.deploy(playToken.address);
      await linearRelease.deployed();

      await expect(playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), linearRelease.address, 1)).to.be.revertedWith('Ownable: caller is not the owner');

      const linearReleaseAsDeployer = LinearRelease__factory.connect(linearRelease.address, deployer);
      await linearReleaseAsDeployer.transferOwnership(playDistributor.address);

      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), linearRelease.address, 1);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf(linearRelease.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));

      const linearReleaseAsAlice = LinearRelease__factory.connect(linearRelease.address, alice);
      await linearReleaseAsAlice.claim();
      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });

    it('prizeLocker: off, prizeLockupBlock: 1, alice deposits 100 vault0, alice become the winner (numberDrawn: 0)', async () => {
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(0);

      // 0. set the token price
      // token0: 1 busd, token1: 2 busd, ... tokenN: (N + 1) busd
      for (let i = 0; i < tokens.length; ++i) {
        await priceOracleAsDeployer.setPrices([tokens[i].address], [referencePriceToken.address], [ethers.utils.parseEther(String(i + 1))]);
      }
      // playToken: 1 busd
      await priceOracleAsDeployer.setPrices([playToken.address], [referencePriceToken.address], [ethers.utils.parseEther('1')]);
      // set PlayPerBlock to zero for prize test
      await playDistributorAsDeployer.setPlayPerBlock(0);
      
      // 1. Add vault0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, vaults[0].address, 0, BASIC_MULTIPLIER, 0, false);
      
      // 2. Mint vault0 for staking
      await vaults[0].mint(await vault0.getAddress(), ethers.utils.parseEther('100'));

      // 3. Deposit vault0 to the vault0 pool
      await vault0AsVault0.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsVault0.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));
      
      expect(await playDistributorAsDeployer.userLength()).to.be.eq(1);
      expect(await playDistributorAsDeployer.getNumUsersOf(await vaults[0].getPoolId())).to.be.eq(1);

      // 4. Start new lotto
      const startingTimestamp = (await TimeHelpers.latest());

      // 5. lotto numbers drawn, find winner and give prize
      expect(await playDistributorAsLottery.getNumTickets(await vaults[0].getPoolId(), await alice.getAddress(), startingTimestamp)).to.be.eq(100);
      await playDistributorAsLottery.clearPrizePools();
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await playDistributorAsLottery.addPrizePool(0);
      await playDistributorAsLottery.setPrizePoolStatus(1);
      let winnerAddress = await playDistributorAsLottery.findWinner(0, startingTimestamp);
      await playDistributorAsLottery.setPrizePoolStatus(2);
      expect(winnerAddress).to.be.eq(await alice.getAddress());
      await playDistributorAsLottery.transferPrize(winnerAddress, ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ADDRESS0, 1);

      expect(await playToken.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('1'));
      expect(await playToken.balanceOf(await playToTheMoon.address)).to.be.bignumber.eq(ethers.utils.parseEther('1'));
    });
  })
});