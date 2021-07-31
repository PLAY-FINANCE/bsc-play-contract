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
  RandomNumberGenerator,
  RandomNumberGenerator__factory,
  MockERC20,
  MockERC20__factory
} from "../typechain";

chai.use(solidity);
const { expect } = chai;

describe("RandomNumberGenerator", function() {
  this.timeout(0);
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const VRF_COORDINATOR_ADDRESS = '0x0000000000000000000000000000000000000001'
  const CHAIN_LINK_HASH = '0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186';
  const BYTE0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const BYTE1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
  const CHAIN_LINK_FEE = ethers.utils.parseUnits("0.1", 18);

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let lottery: Signer;
  let playToTheMoon: Signer;

  let chainLinkToken: MockERC20;
  
  let randomNumberGenerator: RandomNumberGenerator;

  let randomNumberGeneratorAsDeployer: RandomNumberGenerator;
  let randomNumberGeneratorAsAlice: RandomNumberGenerator;
  let randomNumberGeneratorAsPlayToTheMoon: RandomNumberGenerator;
  let randomNumberGeneratorAsLottery: RandomNumberGenerator;

  beforeEach(async() => {
    [deployer, alice, lottery, playToTheMoon] = await ethers.getSigners();
    
    // Deploy RandomNumberGenerator
    const MockERC20 = (await ethers.getContractFactory(
        "MockERC20",
        deployer
      )) as MockERC20__factory;
    chainLinkToken = await MockERC20.deploy('LINK', 'LINK');
    await chainLinkToken.deployed();

    // Deploy RandomNumberGenerator
    const RandomNumberGenerator = (await ethers.getContractFactory(
      "RandomNumberGenerator",
      deployer
    )) as RandomNumberGenerator__factory;
    randomNumberGenerator = await RandomNumberGenerator.deploy(VRF_COORDINATOR_ADDRESS, chainLinkToken.address, await lottery.getAddress(), CHAIN_LINK_HASH, CHAIN_LINK_FEE);
    await randomNumberGenerator.deployed();

    randomNumberGeneratorAsDeployer = RandomNumberGenerator__factory.connect(randomNumberGenerator.address, deployer);
    randomNumberGeneratorAsAlice = RandomNumberGenerator__factory.connect(randomNumberGenerator.address, alice);
    randomNumberGeneratorAsLottery = RandomNumberGenerator__factory.connect(randomNumberGenerator.address, lottery);
    randomNumberGeneratorAsPlayToTheMoon = RandomNumberGenerator__factory.connect(randomNumberGenerator.address, playToTheMoon);
  });
  
  context('when adjust params', async() => {
    it('constructor', async() => {
      const RandomNumberGenerator = (await ethers.getContractFactory(
        "RandomNumberGenerator",
        deployer
      )) as RandomNumberGenerator__factory;
  
      await expect(RandomNumberGenerator.deploy(ADDRESS0, ADDRESS1, ADDRESS1, CHAIN_LINK_HASH, CHAIN_LINK_FEE)).to.be.revertedWith('address cannot be zero');
      await expect(RandomNumberGenerator.deploy(ADDRESS1, ADDRESS0, ADDRESS1, CHAIN_LINK_HASH, CHAIN_LINK_FEE)).to.be.revertedWith('address cannot be zero');
      await expect(RandomNumberGenerator.deploy(ADDRESS1, ADDRESS1, ADDRESS0, CHAIN_LINK_HASH, CHAIN_LINK_FEE)).to.be.revertedWith('address cannot be zero');
      await expect(RandomNumberGenerator.deploy(ADDRESS1, ADDRESS1, ADDRESS1, BYTE0, CHAIN_LINK_FEE)).to.be.revertedWith('invalid key hash');
    });
  });

  context('permissions', async() => {
    it('should reverted', async() => {
      await expect(randomNumberGeneratorAsAlice.setFee(CHAIN_LINK_FEE)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(randomNumberGeneratorAsAlice.setKeyHash(CHAIN_LINK_HASH)).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(randomNumberGeneratorAsLottery.setFee(CHAIN_LINK_FEE)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(randomNumberGeneratorAsLottery.setKeyHash(CHAIN_LINK_HASH)).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(randomNumberGeneratorAsPlayToTheMoon.setFee(CHAIN_LINK_FEE)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(randomNumberGeneratorAsPlayToTheMoon.setKeyHash(CHAIN_LINK_HASH)).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(randomNumberGeneratorAsPlayToTheMoon.setFee(CHAIN_LINK_FEE)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(randomNumberGeneratorAsPlayToTheMoon.setKeyHash(CHAIN_LINK_HASH)).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(randomNumberGeneratorAsDeployer.getRandomNumber(0)).to.be.revertedWith('Only Lottery can call function');
      await expect(randomNumberGeneratorAsAlice.getRandomNumber(0)).to.be.revertedWith('Only Lottery can call function');
      await expect(randomNumberGeneratorAsPlayToTheMoon.getRandomNumber(0)).to.be.revertedWith('Only Lottery can call function');
    });
  });

  context('setter/getter', async() => {
    it('should work', async() => {
      await randomNumberGeneratorAsDeployer.setFee(0);
      expect(await randomNumberGeneratorAsDeployer.getFee()).to.be.eq(0);

      await expect(randomNumberGeneratorAsDeployer.setKeyHash(BYTE0)).to.be.revertedWith('invalid key hash');
      
      await randomNumberGeneratorAsDeployer.setKeyHash(BYTE1);
      expect(await randomNumberGeneratorAsDeployer.getKeyHash()).to.be.eq(BYTE1);

      await randomNumberGeneratorAsDeployer.setFee(CHAIN_LINK_FEE);
      expect(await randomNumberGeneratorAsDeployer.getFee()).to.be.eq(CHAIN_LINK_FEE);
        
      await randomNumberGeneratorAsDeployer.setKeyHash(CHAIN_LINK_HASH);
      expect(await randomNumberGeneratorAsDeployer.getKeyHash()).to.be.eq(CHAIN_LINK_HASH);
    });
  });

  context('chain link fee', async() => {
    it('should work', async() => {
      await expect(randomNumberGeneratorAsLottery.getRandomNumber(0)).to.be.revertedWith('Not enough LINK');

      await chainLinkToken.mint(randomNumberGenerator.address, CHAIN_LINK_FEE);

      await randomNumberGeneratorAsLottery.getRandomNumber(0);
    });
  });
});