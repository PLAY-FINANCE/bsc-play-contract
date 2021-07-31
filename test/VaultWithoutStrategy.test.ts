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
  Vault,
  Vault__factory,
  MockWBNB,
  MockWBNB__factory,
  Config,
  Config__factory
} from "../typechain";

chai.use(solidity);
const { expect } = chai;

describe("VaultWithoutStrategy", function() {
  this.timeout(0);
  const FOREVER = '2000000000';
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const PRICE_ORACLE_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('5000');
  const PANCAKEROUTERV2_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PANCAKEFACTORYV2_ADDRESS = '0x0000000000000000000000000000000000000001'
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

  let busdToken: MockERC20;

  let playToken: PlayToken;
  let playDistributor: PlayDistributor;
  let vaultWithoutStrategyPlay: Vault;  

  let playTokenAsDeployer: PlayToken;
  let playTokenAsAlice: PlayToken;
  let playTokenAsBob: PlayToken;
  let playTokenAsPlayToTheMoon: PlayToken;
  let playTokenAsSafu: PlayToken;
  let playTokenAsOperator: PlayToken;
  
  let vaultWithoutStrategyPlayAsDeployer: Vault;
  let vaultWithoutStrategyPlayAsAlice: Vault;
  let vaultWithoutStrategyPlayAsBob: Vault;
  let vaultWithoutStrategyPlayAsLottery: Vault;
  let vaultWithoutStrategyPlayAsPlayToTheMoon: Vault;
  let vaultWithoutStrategyPlayAsSafu: Vault;
  let vaultWithoutStrategyPlayAsOperator: Vault;

  let config: Config;

  beforeEach(async() => {
    [deployer, alice, bob, lottery, playToTheMoon, safu, operator] = await ethers.getSigners();
    
    const WBNB = (await ethers.getContractFactory(
      "MockWBNB",
      deployer
    )) as MockWBNB__factory;
    wbnbToken = await WBNB.deploy();
    await wbnbToken.deployed();
    
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

    busdToken = await MockERC20.deploy("BusdToken", "BUSD");
    await busdToken.deployed();  

    const Config = (await ethers.getContractFactory(
      "Config",
      deployer
    )) as Config__factory;
    config = await Config.deploy(await lottery.getAddress(), PANCAKEROUTERV2_ADDRESS, PANCAKEFACTORYV2_ADDRESS, wbnbToken.address, PRICE_ORACLE_ADDRESS, busdToken.address, MAX_FEE);
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

    const Vault = (await ethers.getContractFactory(
      "Vault",
      deployer
    )) as Vault__factory;
    
    vaultWithoutStrategyPlay = await Vault.deploy(
      playDistributor.address, playToken.address, ADDRESS0, await lottery.getAddress(), await playToTheMoon.getAddress(),
      await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pPlayToken", "pPlay", 18)
    await vaultWithoutStrategyPlay.deployed();

    await playDistributor.addPool(0, vaultWithoutStrategyPlay.address, 0, PLAY_MULTIPLIER, 0, false);
    expect(await vaultWithoutStrategyPlay.getPoolId()).to.be.eq(0);

    vaultWithoutStrategyPlayAsDeployer = Vault__factory.connect(vaultWithoutStrategyPlay.address, deployer);
    vaultWithoutStrategyPlayAsAlice = Vault__factory.connect(vaultWithoutStrategyPlay.address, alice);
    vaultWithoutStrategyPlayAsBob = Vault__factory.connect(vaultWithoutStrategyPlay.address, bob);
    vaultWithoutStrategyPlayAsLottery = Vault__factory.connect(vaultWithoutStrategyPlay.address, lottery);
    vaultWithoutStrategyPlayAsPlayToTheMoon = Vault__factory.connect(vaultWithoutStrategyPlay.address, playToTheMoon);
    vaultWithoutStrategyPlayAsSafu = Vault__factory.connect(vaultWithoutStrategyPlay.address, safu);
    vaultWithoutStrategyPlayAsOperator = Vault__factory.connect(vaultWithoutStrategyPlay.address, operator);

    playTokenAsDeployer = PlayToken__factory.connect(playToken.address, deployer);
    playTokenAsAlice = PlayToken__factory.connect(playToken.address, alice);
    playTokenAsBob = PlayToken__factory.connect(playToken.address, bob);
    playTokenAsPlayToTheMoon = PlayToken__factory.connect(playToken.address, playToTheMoon);
    playTokenAsSafu = PlayToken__factory.connect(playToken.address, safu);
    playTokenAsOperator = PlayToken__factory.connect(playToken.address, operator);

    await playTokenAsDeployer.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('1'));
    await vaultWithoutStrategyPlayAsDeployer.deposit(ethers.utils.parseEther('1'));
  });
  context('deposit and withdraw', async() => {
    it('should work', async() => {
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));

      // play
      // Bob - deposit 1
      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // Bob - withdraw 1
      await vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
    });
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

      expect (await vaultWithoutStrategyPlayAsDeployer.isPrizeVault()).to.be.eq(false);
    });

    it('intialize pool id', async() => {
      const Vault = (await ethers.getContractFactory(
        "Vault",
        deployer
      )) as Vault__factory;
      
      let vault = await Vault.deploy(
        playDistributor.address, playToken.address, ADDRESS0, await lottery.getAddress(), await playToTheMoon.getAddress(),
        await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pPlayToken", "pPlay", 18)
      await vault.deployed();

      let vaultAsDeployer : Vault;
      let vaultAsAlice: Vault;

      vaultAsDeployer = Vault__factory.connect(vault.address, deployer);
      vaultAsAlice = Vault__factory.connect(vault.address, alice);

      await expect(vaultAsDeployer.setPoolId(0)).to.be.revertedWith("only playDistributor");
      await expect(vaultAsAlice.setPoolId(0)).to.be.revertedWith("only playDistributor");
      await expect(vaultAsAlice.setGovAddress(await alice.getAddress())).to.be.revertedWith("permission denied");
      await expect(vaultAsAlice.pause()).to.be.revertedWith("permission denied");
      await expect(vaultAsAlice.unpause()).to.be.revertedWith("permission denied");
      await expect(vaultAsAlice.setMinDepositAmount(0)).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(vaultAsAlice.setWithdrawFee(0)).to.be.revertedWith("Ownable: caller is not the owner");

      await playTokenAsDeployer.approve(vault.address, ethers.utils.parseEther('100'));
      await expect(vaultAsDeployer.deposit(ethers.utils.parseEther('100'))).to.be.revertedWith("pool id must be set");
      await expect(vaultAsDeployer.withdraw(ethers.utils.parseEther('100'))).to.be.revertedWith("pool id must be set");
      await expect(vaultAsDeployer.getUserBalance(await deployer.getAddress())).to.be.revertedWith("pool id must be set");
      await expect(vaultAsDeployer.getPoolId()).to.be.revertedWith("pool id must be set");

      await playTokenAsAlice.approve(vault.address, ethers.utils.parseEther('100'));
      await expect(vaultAsAlice.deposit(ethers.utils.parseEther('100'))).to.be.revertedWith("pool id must be set");
      await expect(vaultAsAlice.withdraw(ethers.utils.parseEther('100'))).to.be.revertedWith("pool id must be set");
      await expect(vaultAsAlice.getUserBalance(await alice.getAddress())).to.be.revertedWith("pool id must be set");
      await expect(vaultAsAlice.getPoolId()).to.be.revertedWith("pool id must be set");

      await expect(vaultAsDeployer.emergencyWithdraw(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith('Pausable: not paused');
      await vaultAsDeployer.pause();
      await expect(vaultAsAlice.emergencyWithdraw(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith('permission denied');
      await vaultAsDeployer.unpause();
      await expect(vaultAsDeployer.emergencyWithdraw(ADDRESS1, ethers.utils.parseEther('1'))).to.be.revertedWith('Pausable: not paused');

      let vault2 = await Vault.deploy(
        await deployer.getAddress(), playToken.address, ADDRESS0, await lottery.getAddress(), await playToTheMoon.getAddress(),
        await safu.getAddress(), await operator.getAddress(), config.address, playToken.address, "pPlayToken", "pPlay", 18)
      await vault2.deployed();

      let vault2AsPlayDistributor : Vault;

      vault2AsPlayDistributor = Vault__factory.connect(vault2.address, deployer);

      await vault2AsPlayDistributor.setPoolId(0);
      await expect(vault2AsPlayDistributor.setPoolId(0)).to.be.revertedWith("set already");

      await expect(vault2AsPlayDistributor.getUserBalance(ADDRESS0)).to.be.revertedWith("address cannt be zero");
      await expect(vault2AsPlayDistributor.setGovAddress(ADDRESS0)).to.be.revertedWith("address cant be zero");
    });
  });

  context('harvest', async() => {
    it('haverst function is only called by lottery', async() => {
      await expect (vaultWithoutStrategyPlayAsPlayToTheMoon.harvest()).to.be.revertedWith('Only Lottery can call function');
    });

    it('should work - case 1', async() => {
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // bob - play deposit
      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
  
      // harvest - play vault
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultWithoutStrategyPlayAsLottery.harvest();

      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // fund - withdraw play
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('101'));

      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('101'));

      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('101'));

      // bob - withdraw play
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));
      
      // bob - deposit play
      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // bob - withdraw play
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('950'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('50'));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('51'));
      await expect(vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('51'))).to.be.reverted;
      await vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('50'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));
      
      // harvest - play vault
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultWithoutStrategyPlayAsLottery.harvest();

      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // fund - withdraw play
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));

      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));

      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));
    });

    it('should work - case 2', async() => {
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // bob - play deposit
      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));

      // bob - withdraw play
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      await expect(vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('100.1'))).to.be.reverted;
      await vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));
      
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      
      // harvest - play vault
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      await vaultWithoutStrategyPlayAsLottery.harvest();

      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsPlayToTheMoon.getUserBalance(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsSafu.getUserBalance(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlayAsOperator.getUserBalance(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // fund - withdraw play
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));

      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));

      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.withdraw(await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress()));
      expect (await playToken.balanceOf(vaultWithoutStrategyPlay.address)).to.be.eq(ethers.utils.parseEther('1'));
    });
  });

  context('pause/unpause', async() => {
    it('should work', async() => {
      await expect(vaultWithoutStrategyPlayAsDeployer.unpause()).to.be.reverted;
      await vaultWithoutStrategyPlayAsDeployer.pause();
      await expect(vaultWithoutStrategyPlayAsDeployer.pause()).to.be.reverted;

      // Bob - deposit
      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await expect(vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'))).to.be.reverted;
      await expect(vaultWithoutStrategyPlayAsLottery.harvest()).to.be.reverted;

      await vaultWithoutStrategyPlayAsDeployer.unpause();

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
    });
  });

  context('minDepositAmount', async() => {
    it('should work', async() => {
      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));

      await vaultWithoutStrategyPlayAsDeployer.setMinDepositAmount(ethers.utils.parseEther('100.1'));
      
      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await expect(vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'))).to.be.revertedWith('invalid input amount');

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100.1'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100.1'));
      
      await vaultWithoutStrategyPlayAsDeployer.setMinDepositAmount(ethers.utils.parseEther('100'));

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));

      await vaultWithoutStrategyPlayAsDeployer.setMinDepositAmount(ethers.utils.parseEther('500'));

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('499.999'));
      await expect(vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('499.999'))).to.be.revertedWith('invalid input amount');

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('500'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('500'));

      await vaultWithoutStrategyPlayAsDeployer.setMinDepositAmount(ethers.utils.parseEther('0'));

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('0.1'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('0.1'));
    });
  });
  
  context('emergencyWithdraw', async() => {
    it ('should work', async() => {
      await playTokenAsDeployer.approve(await playToTheMoon.getAddress(), ethers.utils.parseEther('10'));
      await playTokenAsPlayToTheMoon.transferFrom(await deployer.getAddress(), await playToTheMoon.getAddress(), ethers.utils.parseEther('10'));

      await playTokenAsDeployer.approve(await safu.getAddress(), ethers.utils.parseEther('10'));
      await playTokenAsSafu.transferFrom(await deployer.getAddress(), await safu.getAddress(), ethers.utils.parseEther('10'));

      await playTokenAsDeployer.approve(await operator.getAddress(), ethers.utils.parseEther('10'));
      await playTokenAsOperator.transferFrom(await deployer.getAddress(), await operator.getAddress(), ethers.utils.parseEther('10'));

      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      
      // play
      // Bob - deposit 1
      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      expect (await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('100'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('0'));

      // play to the moon - deposit 1
      await playTokenAsPlayToTheMoon.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('10'));
      await vaultWithoutStrategyPlayAsPlayToTheMoon.deposit(ethers.utils.parseEther('10'));
      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('10'));

      // safu - deposit 1
      await playTokenAsSafu.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('10'));
      await vaultWithoutStrategyPlayAsSafu.deposit(ethers.utils.parseEther('10'));
      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('10'));

      // operator - deposit 1
      await playTokenAsOperator.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('10'));
      await vaultWithoutStrategyPlayAsOperator.deposit(ethers.utils.parseEther('10'));
      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      expect (await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('10'));

      // pause
      await vaultWithoutStrategyPlayAsDeployer.pause();

      expect (await vaultWithoutStrategyPlayAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('131'));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('900'));
      await vaultWithoutStrategyPlayAsDeployer.emergencyWithdraw(await bob.getAddress(), await vaultWithoutStrategyPlayAsBob.getUserBalance(await bob.getAddress()));
      expect (await playToken.balanceOf(await bob.getAddress())).to.be.eq(ethers.utils.parseEther('1000'));
      expect (await vaultWithoutStrategyPlayAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('31'));

      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsDeployer.emergencyWithdraw(await playToTheMoon.getAddress(), await vaultWithoutStrategyPlay.balanceOf(await playToTheMoon.getAddress()));
      expect (await playToken.balanceOf(await playToTheMoon.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await vaultWithoutStrategyPlayAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('21'));

      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsDeployer.emergencyWithdraw(await safu.getAddress(), await vaultWithoutStrategyPlay.balanceOf(await safu.getAddress()));
      expect (await playToken.balanceOf(await safu.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await vaultWithoutStrategyPlayAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('11'));

      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('0'));
      await vaultWithoutStrategyPlayAsDeployer.emergencyWithdraw(await operator.getAddress(), await vaultWithoutStrategyPlay.balanceOf(await operator.getAddress()));
      expect (await playToken.balanceOf(await operator.getAddress())).to.be.eq(ethers.utils.parseEther('10'));
      expect (await vaultWithoutStrategyPlayAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('1'));

      const _before = await playToken.balanceOf(await deployer.getAddress());
      await vaultWithoutStrategyPlayAsDeployer.emergencyWithdraw(await deployer.getAddress(), await vaultWithoutStrategyPlayAsDeployer.getUserBalance(await deployer.getAddress()));
      expect (await playToken.balanceOf(await deployer.getAddress())).to.be.eq(ethers.utils.parseEther('1').add(_before));
      expect (await vaultWithoutStrategyPlayAsDeployer.getBalanceSnapshot()).to.be.eq(ethers.utils.parseEther('0'));
    });
  });

  context('withdrawFee', async() => {
    it('should work', async() => {
      await vaultWithoutStrategyPlayAsDeployer.setWithdrawFee(ethers.utils.parseEther('1'));

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));

      await expect(vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('100'))).to.be.reverted;

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('1'));
      
      let before = await playToken.balanceOf(await bob.getAddress());
      let beforeOperator = await playToken.balanceOf(await operator.getAddress());
      await vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('100'));
      let after = await playToken.balanceOf(await bob.getAddress());
      let afterOperator = await playToken.balanceOf(await operator.getAddress());

      expect (after).to.be.eq(before.add(ethers.utils.parseEther('99')));
      expect (afterOperator).to.be.eq(beforeOperator.add(ethers.utils.parseEther('1')));
      
      await vaultWithoutStrategyPlayAsDeployer.setWithdrawFee(ethers.utils.parseEther('0'));

      await playTokenAsBob.approve(vaultWithoutStrategyPlay.address, ethers.utils.parseEther('100'));
      await vaultWithoutStrategyPlayAsBob.deposit(ethers.utils.parseEther('100'));

      before = await playToken.balanceOf(await bob.getAddress());
      beforeOperator = await playToken.balanceOf(await operator.getAddress());
      await vaultWithoutStrategyPlayAsBob.withdraw(ethers.utils.parseEther('100'));
      after = await playToken.balanceOf(await bob.getAddress());
      afterOperator = await playToken.balanceOf(await operator.getAddress());

      expect (after).to.be.eq(before.add(ethers.utils.parseEther('100')));
      expect (afterOperator).to.be.eq(beforeOperator);
    });
  });
});