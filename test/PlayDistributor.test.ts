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
import { Overrides, Signer } from "ethers";
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
  Timer,
  Timer__factory,
  PriceOracle,
  PriceOracle__factory,
  MockVault,
  MockVault__factory,
  Config,
  Config__factory,
  PrizeVault,
  PrizeVault__factory
} from "../typechain";
import * as TimeHelpers from "./helpers/time"

chai.use(solidity);
const { expect } = chai;

describe("PlayDistributor", function() {
  this.timeout(0);
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const WBNB_ADDRESS = '0x0000000000000000000000000000000000000002'
  const PANCAKEROUTERV2_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PANCAKEFACTORYV2_ADDRESS = '0x0000000000000000000000000000000000000001'
  const ORACLE_FEEDER_ADDRESS = '0x0000000000000000000000000000000000000001'
  const REFERENCE_PRICE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000001'
  const BASIC_MULTIPLIER = 10000;
  const MAX_FEE = 10;

  let stoken0AsDeployer: MockVault;
  let stoken0AsAlice: MockVault;
  let stoken0AsBob: MockVault;
  let stoken0AsDev: MockVault;

  let stoken1AsDeployer: MockVault;
  let stoken1AsAlice: MockVault;

  let playDistributorAsDeployer: PlayDistributor;
  let playDistributorAsLottery: PlayDistributor;
  let playDistributorAsAlice: PlayDistributor;
  let playDistributorAsBob: PlayDistributor;
  let playDistributorAsDev: PlayDistributor;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let dev: Signer;
  let lottery: Signer;

  let playToken: PlayToken;
  let playDistributor: PlayDistributor;
  let stakingTokens: MockVault[];

  let playToTheMoon: Fund;
  let timer: Timer;
  let priceOracle: PriceOracle;
  let referencePriceToken: MockERC20;

  let config: Config;

  let prizeVault: PrizeVault;

  beforeEach(async() => {
    [deployer, alice, bob, dev, lottery] = await ethers.getSigners();

    const MockERC20 = (await ethers.getContractFactory(
      "MockERC20",
      deployer
    )) as MockERC20__factory;

    const MockVault = (await ethers.getContractFactory(
      "MockVault",
      deployer
    )) as MockVault__factory;

    const Timer = (await ethers.getContractFactory(
      "Timer",
      deployer
    )) as Timer__factory;
    timer = await Timer.deploy();
    await timer.deployed();

    const PriceOracle = (await ethers.getContractFactory(
      "PriceOracle",
      deployer
    )) as PriceOracle__factory;
    priceOracle = await PriceOracle.deploy(ORACLE_FEEDER_ADDRESS);
    await priceOracle.deployed();

    referencePriceToken = await MockERC20.deploy("USDT", "USDT");
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

    // Deploy PlayDistributor
    const PlayDistributor = (await ethers.getContractFactory(
      "PlayDistributor",
      deployer
    )) as PlayDistributor__factory;
    playDistributor = await PlayDistributor.deploy(
      playToken.address, PLAY_REWARD_PER_BLOCK, await lottery.getAddress(), playToTheMoon.address, config.address)
    await playDistributor.deployed();

    await playToken.transferOwnership(playDistributor.address);

    stakingTokens = new Array();
    for(let i = 0; i < 4; i++) {
      let mockERC20: MockERC20;
      let mockVault: MockVault;

      mockERC20 = await MockERC20.deploy(`TOKEN${i}`, `TOKEN${i}`);
      await mockERC20.deployed();

      mockVault = await MockVault.deploy(playDistributor.address, mockERC20.address, `TOKEN${i}`, `TOKEN${i}`);
      await mockVault.deployed();
      stakingTokens.push(mockVault);
    }

    stoken0AsDeployer = MockVault__factory.connect(stakingTokens[0].address, deployer);
    stoken0AsAlice = MockVault__factory.connect(stakingTokens[0].address, alice);
    stoken0AsBob = MockVault__factory.connect(stakingTokens[0].address, bob);
    stoken0AsDev = MockVault__factory.connect(stakingTokens[0].address, dev);

    stoken1AsDeployer = MockVault__factory.connect(stakingTokens[1].address, deployer);
    stoken1AsAlice = MockVault__factory.connect(stakingTokens[1].address, alice);

    playDistributorAsDeployer = PlayDistributor__factory.connect(playDistributor.address, deployer);
    playDistributorAsLottery = PlayDistributor__factory.connect(playDistributor.address, lottery);
    playDistributorAsAlice = PlayDistributor__factory.connect(playDistributor.address, alice);
    playDistributorAsBob = PlayDistributor__factory.connect(playDistributor.address, bob);
    playDistributorAsDev = PlayDistributor__factory.connect(playDistributor.address, dev);

    const PrizeVault = (await ethers.getContractFactory(
      "PrizeVault",
      deployer
    )) as PrizeVault__factory;
    
    prizeVault = await PrizeVault.deploy(await lottery.getAddress(), playToken.address, 0, 0);
    await prizeVault.deployed();
  });

  context('when adjust params', async() => {    
    it('should add new pool', async() => {
      for(let i = 0; i < stakingTokens.length; i++) {
        await playDistributorAsLottery.addPool(1, stakingTokens[i].address, 0, BASIC_MULTIPLIER, 0, false)
        expect(await stakingTokens[i].getPoolId()).to.be.eq(i);
      }
      expect(await playDistributor.poolLength()).to.eq(stakingTokens.length);
    });

    it('should revert when the stakeToken is already added to the pool', async() => {
      for(let i = 0; i < stakingTokens.length; i++) {
        await playDistributorAsLottery.addPool(1, stakingTokens[i].address, 0, BASIC_MULTIPLIER, 0, false)
        expect(await stakingTokens[i].getPoolId()).to.be.eq(i);
      }
      expect(await playDistributor.poolLength()).to.eq(stakingTokens.length);

      await expect(playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false))
        .to.be.revertedWith("PlayDistributor::addPool:: stakeToken dup");
    });

    it('should revert when the stakeToken is prizeVault', async() => {
      await expect(playDistributorAsLottery.addPool(1, prizeVault.address, 0, 0, 0, false))
        .to.be.revertedWith("Prize vault doesnt provide any functionality.");
    });
  });

  context('when use pool', async() => {
    it('should revert when that pool is not existed', async() => {
      await expect(playDistributor.deposit((await deployer.getAddress()), 88, ethers.utils.parseEther('100'),
        { from: (await deployer.getAddress()) } as Overrides)).to.be.reverted;
    });

    it('should revert when withdrawer is not a funder', async () => {
      // 1. Mint STOKEN0 for staking
      await stoken0AsDeployer.mint((await alice.getAddress()), ethers.utils.parseEther('400'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Bob try to withdraw from the pool
      // Bob shuoldn't do that, he can get yield but not the underlaying
      await expect(playDistributorAsBob.withdraw(await bob.getAddress(), 0, ethers.utils.parseEther('100'))).to.be.revertedWith("PlayDistributor::withdraw:: only funder");
    });

    it('should allow deposit when funder withdrew funds and owner want to stake his own token', async () => {
      // 1. Mint STOKEN0 for staking
      await stoken0AsDeployer.mint(await alice.getAddress(), ethers.utils.parseEther('400'));
      await stoken0AsDeployer.mint(await bob.getAddress(), ethers.utils.parseEther('100'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Bob harvest the yield
      let bobPlayBalanceBefore = await playToken.balanceOf(await bob.getAddress());
      await playDistributorAsBob.harvest(0);
      expect(await playToken.balanceOf(await bob.getAddress())).to.be.gt(bobPlayBalanceBefore);

      // 5. Bob try to withdraw from the pool
      // Bob shuoldn't do that, he can get yield but not the underlaying
      await expect(playDistributorAsBob.withdraw(await bob.getAddress(), 0, ethers.utils.parseEther('100'))).to.be.revertedWith("PlayDistributor::withdraw:: only funder");

      // 6. Alice withdraw her STOKEN0 that staked on behalf of BOB
      await playDistributorAsAlice.withdraw((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      // 7. Bob deposit his STOKN0 to PlayDistributor
      await stoken0AsBob.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsBob.deposit(await bob.getAddress(), 0, ethers.utils.parseEther('100'));
    });

    it('should revert when funder partially withdraw the funds, then user try to withdraw funds', async () => {
      // 1. Mint STOKEN0 for staking
      await stoken0AsDeployer.mint((await alice.getAddress()), ethers.utils.parseEther('400'));
      await stoken0AsDeployer.mint((await dev.getAddress()), ethers.utils.parseEther('100'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Alice withdraw some from PD
      await playDistributorAsAlice.withdraw(await bob.getAddress(), 0, ethers.utils.parseEther("50"));

      // 5. Expect to be revert with Bob try to withdraw the funds
      await expect(playDistributorAsBob.withdraw((await bob.getAddress()), 0, ethers.utils.parseEther('1'))).to.be.revertedWith('PlayDistributor::withdraw:: only funder');
    });

    it('should give the correct withdraw amount back to funder if funder withdraw', async() => {
      // 1. Mint STOKEN0 for staking
      await stoken0AsDeployer.mint((await alice.getAddress()), ethers.utils.parseEther('400'));
      await stoken0AsDeployer.mint((await dev.getAddress()), ethers.utils.parseEther('100'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Alice withdraw some from PD
      await playDistributorAsAlice.withdraw(await bob.getAddress(), 0, ethers.utils.parseEther("50"));

      // 5. Expect to Alice STOKEN0 will be 400-100+50=350
      expect(await stoken0AsBob.balanceOf(await alice.getAddress())).to.be.bignumber.eq(ethers.utils.parseEther('350'));
    });

    it('should revert when 2 accounts try to fund the same user', async () => {
      // 1. Mint STOKEN0 for staking
      await stoken0AsDeployer.mint((await alice.getAddress()), ethers.utils.parseEther('400'));
      await stoken0AsDeployer.mint((await dev.getAddress()), ethers.utils.parseEther('100'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Dev try to deposit to the pool on the bahalf of Bob
      // Dev should get revert tx as this will fuck up the tracking
      await stoken0AsDev.approve(playDistributor.address, ethers.utils.parseEther("100"));
      await expect(playDistributorAsDev.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('1'))).to.be.revertedWith('PlayDistributor::deposit:: bad sof');
    });

    it('should harvest yield from the position opened by funder', async () => {
      // 1. Mint STOKEN0 for staking
      await stoken0AsDeployer.mint((await alice.getAddress()), ethers.utils.parseEther('400'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Move 1 Block so there is some pending
      await playDistributorAsDeployer.updatePool(0);
      expect(await playDistributorAsBob.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('5000'));

      // 5. Harvest all yield
      await playDistributorAsBob.harvest(0);
      expect(await playToken.balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('10000'));
    });

    it('should distribute rewards according to the alloc point', async() => {
      // 1. Mint STOKEN0 and STOKEN1 for staking
      await stoken0AsDeployer.mint((await alice.getAddress()), ethers.utils.parseEther('100'));
      await stoken1AsDeployer.mint((await alice.getAddress()), ethers.utils.parseEther('50'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(50, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);
      await playDistributorAsLottery.addPool(50, stakingTokens[1].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[1].getPoolId()).to.be.eq(1);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit(await alice.getAddress(), 0, ethers.utils.parseEther('100'));

      // 4. Deposit STOKEN1 to the STOKEN1 pool
      await stoken1AsAlice.approve(playDistributor.address, ethers.utils.parseEther('50'));
      await playDistributorAsAlice.deposit(await alice.getAddress(), 1, ethers.utils.parseEther('50'));

      // 5. Move 1 Block so there is some pending
      await playDistributorAsDeployer.massUpdatePools([0, 1]);
      
      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('7500'));
      expect(await playDistributor.pendingPlay(1, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('2500'));

      // 6. Harvest all yield of pId 0
      // should get 7,500 + 2,500 = 10,000 PLAYs from pId 0
      await playDistributorAsAlice.harvest(0);
      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('10000'));

      // 7. Harvest all yield of pId 1
      // should get 2,500 + 2,500 + 2,500 = 7,500 PLAYs from pId 1
      await playDistributorAsAlice.harvest(1);
      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('17500'));
    })

    it('should work', async() => {
      // 1. Mint STOKEN0 for staking
      await stoken0AsDeployer.mint((await alice.getAddress()), ethers.utils.parseEther('400'));
      await stoken0AsDeployer.mint((await bob.getAddress()), ethers.utils.parseEther('100'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. Trigger random update pool to make 1 more block mine
      await playDistributor.massUpdatePools([0]);

      // 5. Check pendingPlay for Alice
      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('5000'));

      // 6. Trigger random update pool to make 1 more block mine
      await playDistributorAsAlice.massUpdatePools([0]);

      // 7. Check pendingPlay for Alice
      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('10000'));

      // 8. Alice should get 15,000 PLAYs when she harvest
      await playDistributorAsAlice.harvest(0);

      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('15000'));

      // 9. Bob come in and join the party
      // 2 blocks are mined here, hence Alice should get 10,000 PLAYs more
      await stoken0AsBob.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsBob.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('10000'));

      // 10. Trigger random update pool to make 1 more block mine
      await playDistributor.massUpdatePools([0]);

      // 11. Check pendingPlay
      // Reward per Block must now share amoung Bob and Alice (50-50)
      // Alice should has 12,500 PLAYs (10,000 + 2,500)
      // Bob should has 2,500 PLAYs
      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('12500'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('2500'));

      // 12. Trigger random update pool to make 1 more block mine
      await playDistributorAsAlice.massUpdatePools([0]);

      // 13. Check pendingPlay
      // Reward per Block must now share amoung Bob and Alice (50-50)
      // Alice should has 15,000 PLAYs (12,500 + 2,500)
      // Bob should has 5,000 PLAYs (2,500 + 2,500)
      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('15000'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('5000'));

      // 14. Bob harvest his yield
      // Reward per Block is till (50-50) as Bob is not leaving the pool yet
      // Alice should has 17,500 PLAYs (15,000 + 2,500) in pending
      // Bob should has 7,500 PLAYs (5,000 + 2,500) in his account as he harvest it
      await playDistributorAsBob.harvest(0);

      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('17500'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('7500'));

      // 15. Alice wants more PLAYs so she deposit 300 STOKEN0 more
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('300'));
      await playDistributorAsAlice.deposit((await alice.getAddress()), 0, ethers.utils.parseEther('300'));

      // Alice deposit to the same pool as she already has some STOKEN0 in it
      // Hence, Alice will get auto-harvest
      // Alice should get 22,500 PLAYs (17,500 + 2,500 [B1] + 2,500 [B2]) back to her account
      // Hence, Alice should has 15,000 + 22,500 = 37,500 PLAYs in her account and 0 pending as she harvested
      // Bob should has (2,500 [B1] + 2,500 [B2]) = 5,000 PLAYs in pending
      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('5000'));
      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('37500'));
      expect(await playToken.balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('7500'));

      // 16. Trigger random update pool to make 1 more block mine
      await playDistributorAsAlice.massUpdatePools([0]);

      // 1 more block is mined, now Alice shold get 80% and Bob should get 20% of rewards
      // How many STOKEN0 needed to make Alice get 80%: find n from 100n/(100n+100) = 0.8
      // Hence, Alice should get 0 + 4,000 = 4,000 PLAYs in pending
      // Bob should get 5,000 + 1,000 = 6,000 PLAYs in pending
      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('4000'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('6000'));
      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('37500'));
      expect(await playToken.balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('7500'));

      // 17. Alice harvest her pending PLAYs
      // Alice Total Pending is 4,000 + 4,000 = 8,000 PLAYs
      // Alice should get 37,500 + 4,000 + 4,000 = 45,500 PLAYs
      // 1 Block is mined, hence Bob pending must be increased
      // Bob should get 6,000 + 1,000 = 7,000 PLAYs
      await playDistributorAsAlice.harvest(0);

      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('7000'));
      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('45500'));
      expect(await playToken.balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('7500'));

      // 18. Bob harvest his pending PLAYs
      // Bob Total Pending is 8,000 PLAYs
      // Bob should get 7,500 + 8,000 = 15,500 PLAYs
      // Alice should get 0 + 4,000 = 4,000 PLAYs in pending
      await playDistributorAsBob.harvest(0);

      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('4000'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('45500'));
      expect(await playToken.balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('15500'));

      // 19. Alice is happy. Now she want to leave the pool.
      // Alice pending must be 0 as she harvest and leave the pool.
      // Alice should get 45,500 + 4,000 + 4,000 = 53,500 PLAYs
      // Bob pending should be 1,000 PLAYs
      await playDistributorAsAlice.withdraw((await alice.getAddress()), 0, ethers.utils.parseEther('400'));

      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('1000'));
      expect(await stakingTokens[0].balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('400'));
      expect(await stakingTokens[0].balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('53500'));
      expect(await playToken.balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('15500'));

      // 20. Bob is happy. Now he want to leave the pool.
      // Alice should not move as she left the pool already
      // Bob pending should be 0 PLAYs
      // Bob should has 15,500 + 1,000 + 5,000 = 21,500 PLAYs in his account
      await playDistributorAsBob.withdraw((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      expect(await playDistributor.pendingPlay(0, (await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await playDistributor.pendingPlay(0, (await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('0'));
      expect(await stakingTokens[0].balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('400'));
      expect(await stakingTokens[0].balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('100'));
      expect(await playToken.balanceOf((await alice.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('53500'));
      expect(await playToken.balanceOf((await bob.getAddress()))).to.be.bignumber.eq(ethers.utils.parseEther('21500'));
    });

    it('black list cannot deposit', async () => {
      // 1. Mint STOKEN0 for staking
      await stoken0AsDeployer.mint(await alice.getAddress(), ethers.utils.parseEther('400'));

      // 2. Add STOKEN0 to the playDistributor pool
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      expect(await stakingTokens[0].getPoolId()).to.be.eq(0);

      // 3. Deposit STOKEN0 to the STOKEN0 pool
      await stoken0AsAlice.approve(playDistributor.address, ethers.utils.parseEther('100'));
      await playDistributorAsAlice.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'));

      // 4. add black list
      await playDistributorAsDeployer.addBlackList(await bob.getAddress());

      // 5. black list cannot deposit
      await expect(playDistributorAsAlice.deposit((await bob.getAddress()), 0, ethers.utils.parseEther('100'))).to.be.revertedWith('black list cannot deposit.');
    });
  });
  
  context('permissions', async () => {
    it('when non-owner try to adjust params or excuete functions', async () => {
      // Check all functions that can adjust params in PlayDistributor contract
      await expect(
        playDistributorAsAlice.transferOwnership(await bob.getAddress())
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        playDistributorAsAlice.setMultiplierDenominator(10000)
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        playDistributorAsAlice.setPlayPerBlock(PLAY_REWARD_PER_BLOCK)
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        playDistributorAsAlice.mintWarchest(await alice.getAddress(), ethers.utils.parseEther('10000'))
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        playDistributorAsAlice.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsAlice.setPool(0, 1, BASIC_MULTIPLIER, 0, false)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.setPool(0, 1, BASIC_MULTIPLIER, 0, false)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsAlice.setMaxTransferPrize(0)
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await playDistributorAsLottery.setPrizePoolStatus(2);

      await expect(
        playDistributorAsAlice.clearPrizePools()
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.clearPrizePools()
      ).to.be.revertedWith('Only Lottery can call function');
      
      await playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false);
      await playDistributorAsLottery.setPrizePoolStatus(0);

      await expect(
        playDistributorAsAlice.addPrizePool(0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.addPrizePool(0)
      ).to.be.revertedWith('Only Lottery can call function');
      
      await playDistributorAsLottery.setPrizePoolStatus(1);

      await expect(
        playDistributorAsAlice.findWinner(0, 0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.findWinner(0, 0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsAlice.transferPrize(ADDRESS1, 0, 0, ADDRESS0, 0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.transferPrize(ADDRESS1, 0, 0, ADDRESS0, 0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.setPrizePoolStatus(0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsAlice.addBlackList(ADDRESS1)
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        playDistributorAsAlice.getNumTickets(await stakingTokens[0].getPoolId(), ADDRESS1, 0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.getNumTickets(await stakingTokens[0].getPoolId(), ADDRESS1, 0)
      ).to.be.revertedWith('Only Lottery can call function');

      await playDistributorAsLottery.setUserCountStatus(2);

      await expect(
        playDistributorAsAlice.clearUserCountPoolId()
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.clearUserCountPoolId()
      ).to.be.revertedWith('Only Lottery can call function');
      
      await playDistributorAsLottery.setUserCountStatus(0);

      await expect(
        playDistributorAsAlice.addUserCountPoolId(0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.addUserCountPoolId(0)
      ).to.be.revertedWith('Only Lottery can call function');
      
      await playDistributorAsLottery.setUserCountStatus(1);

      await expect(
        playDistributorAsAlice.getNumUsers()
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.getNumUsers()
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsAlice.setUserCountStatus(0)
      ).to.be.revertedWith('Only Lottery can call function');
      await expect(
        playDistributorAsDeployer.setUserCountStatus(0)
      ).to.be.revertedWith('Only Lottery can call function');
      
      await playDistributorAsLottery.setPrizePoolStatus(0);
      await expect(
        playDistributorAsLottery.cleanupDepositList(0, 0, 0)
      ).to.be.revertedWith('prizePoolStatus is not added');
      await playDistributorAsLottery.setPrizePoolStatus(1);
      await expect(
        playDistributorAsDeployer.cleanupDepositList(0, 0, 0)
      ).to.be.revertedWith('Only Lottery can call function');
    });

    it('when owner try to adjust params', async () => {
      // Check all functions that can adjust params in PlayDistributor contract
      await expect(playDistributorAsDeployer.setMultiplierDenominator(10000));
      await expect(playDistributorAsDeployer.setMultiplierDenominator(0)).to.be.revertedWith('denominator must greater than zero');
      await expect(playDistributorAsDeployer.setPlayPerBlock(PLAY_REWARD_PER_BLOCK));
      await expect(playDistributorAsDeployer.mintWarchest(await alice.getAddress(), ethers.utils.parseEther('10000')));
      await expect(playDistributorAsLottery.addPool(1, stakingTokens[0].address, 0, BASIC_MULTIPLIER, 0, false));
      await expect(playDistributorAsLottery.addPool(1, ADDRESS0, 0, BASIC_MULTIPLIER, 0, false)).to.be.revertedWith('PlayDistributor::addPool:: stakeToken cant be zero');
      await expect(playDistributorAsLottery.setPool(0, 1, BASIC_MULTIPLIER, 0, false));
      await expect(playDistributorAsDeployer.transferOwnership(await bob.getAddress()));
    });
  });
});