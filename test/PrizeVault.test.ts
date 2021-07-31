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
  PrizeVault,
  PrizeVault__factory,
} from "../typechain";
import * as TimeHelpers from "./helpers/time"

chai.use(solidity);
const { expect } = chai;

describe("PrizeVault", function() {
  this.timeout(0);
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const PRIZE_PER_BLOCK = ethers.utils.parseEther('10')

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let lottery: Signer;
  let playToTheMoon: Signer;
  
  let playToken: PlayToken;
  
  let prizeVault: PrizeVault;

  let prizeVaultAsDeployer: PrizeVault;
  let prizeVaultAsAlice: PrizeVault;
  let prizeVaultAsLottery: PrizeVault;
  let prizeVaultAsPlayToTheMoon: PrizeVault;

  beforeEach(async() => {
    [deployer, alice, lottery, playToTheMoon] = await ethers.getSigners();
        
    // Deploy PLAYs
    const PlayToken = (await ethers.getContractFactory(
      "PlayToken",
      deployer
    )) as PlayToken__factory;
    playToken = await PlayToken.deploy();
    await playToken.deployed();

    const PrizeVault = (await ethers.getContractFactory(
      "PrizeVault",
      deployer
    )) as PrizeVault__factory;
    
    prizeVault = await PrizeVault.deploy(await lottery.getAddress(), playToken.address, 0, 0);
    await prizeVault.deployed();

    prizeVaultAsDeployer = PrizeVault__factory.connect(prizeVault.address, deployer);
    prizeVaultAsAlice = PrizeVault__factory.connect(prizeVault.address, alice);
    prizeVaultAsLottery = PrizeVault__factory.connect(prizeVault.address, lottery);
    prizeVaultAsPlayToTheMoon = PrizeVault__factory.connect(prizeVault.address, playToTheMoon);
  });
  
  context('when adjust params', async() => {
    it('constructor', async() => {
        const PrizeVault = (await ethers.getContractFactory(
            "PrizeVault",
            deployer
            )) as PrizeVault__factory;
  
        await expect(PrizeVault.deploy(ADDRESS0, playToken.address, 0, PRIZE_PER_BLOCK)).to.be.revertedWith('address can not be zero');
        await expect(PrizeVault.deploy(await lottery.getAddress(), ADDRESS0, 0, PRIZE_PER_BLOCK)).to.be.revertedWith('address can not be zero');

        expect (await prizeVaultAsDeployer.isPrizeVault()).to.be.eq(true);
    });
  });

  context('permissions', async() => {
    it('should reverted', async() => {
        await expect(prizeVaultAsDeployer.harvest()).to.be.revertedWith('Only Lottery can call function');
        await expect(prizeVaultAsAlice.harvest()).to.be.revertedWith('Only Lottery can call function');
        await expect(prizeVaultAsPlayToTheMoon.harvest()).to.be.revertedWith('Only Lottery can call function');
        
        await expect(prizeVaultAsLottery.setPrizePerBlock(0)).to.be.revertedWith('Ownable: caller is not the owner');
        await expect(prizeVaultAsAlice.setPrizePerBlock(0)).to.be.revertedWith('Ownable: caller is not the owner');
        await expect(prizeVaultAsPlayToTheMoon.setPrizePerBlock(0)).to.be.revertedWith('Ownable: caller is not the owner');

        await expect(prizeVaultAsLottery.setLastRewardBlock(0)).to.be.revertedWith('Ownable: caller is not the owner');
        await expect(prizeVaultAsAlice.setLastRewardBlock(0)).to.be.revertedWith('Ownable: caller is not the owner');
        await expect(prizeVaultAsPlayToTheMoon.setLastRewardBlock(0)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  context('non-functionality', async() => {
    it('should reverted', async() => {
        await expect(prizeVaultAsDeployer.deposit(0)).to.be.revertedWith('Prize vault doesnt provide any functionality.');
        await expect(prizeVaultAsDeployer.withdraw(0)).to.be.revertedWith('Prize vault doesnt provide any functionality.');
        await expect(prizeVaultAsDeployer.setPoolId(0)).to.be.revertedWith('Prize vault doesnt provide any functionality.');
        await expect(prizeVaultAsDeployer.getPoolId()).to.be.revertedWith('Prize vault doesnt provide any functionality.');
        await expect(prizeVaultAsDeployer.getUserBalance(await deployer.getAddress())).to.be.revertedWith('Prize vault doesnt provide any functionality.');
    });
  });

  context('setPrizePerBlock and harvest', async() => {
    it ('should work', async() => {
        expect(await prizeVaultAsLottery.getToken()).to.be.eq(playToken.address);

        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(ethers.utils.parseEther('0'));

        await prizeVaultAsDeployer.setPrizePerBlock(PRIZE_PER_BLOCK);
        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(PRIZE_PER_BLOCK.mul(2));

        await prizeVaultAsDeployer.setPrizePerBlock(0);
        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(ethers.utils.parseEther('0'));
        
        await prizeVaultAsDeployer.setPrizePerBlock(PRIZE_PER_BLOCK);
        await prizeVaultAsDeployer.setPrizePerBlock(PRIZE_PER_BLOCK);
        await prizeVaultAsDeployer.setPrizePerBlock(PRIZE_PER_BLOCK);
        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(PRIZE_PER_BLOCK.mul(4));

        const latestBlockNumber = (await TimeHelpers.latestBlockNumber());
        await prizeVaultAsDeployer.setLastRewardBlock(latestBlockNumber.add(5));
        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(0);
        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(0);
        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(0);
        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(0);
        await expect(prizeVaultAsLottery.harvest()).to.emit(prizeVault, 'Harvest').withArgs(PRIZE_PER_BLOCK);
    });
  });
});