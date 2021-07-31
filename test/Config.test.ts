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
  Config,
  Config__factory
} from "../typechain";

chai.use(solidity);
const { expect } = chai;

describe("Config", function() {
  this.timeout(0);
  const ADDRESS0 = '0x0000000000000000000000000000000000000000'
  const ADDRESS1 = '0x0000000000000000000000000000000000000001'
  const ADDRESS2 = '0x0000000000000000000000000000000000000002'
  const ADDRESS3 = '0x0000000000000000000000000000000000000003'
  const ROUTER_ADDRESS = '0x0000000000000000000000000000000000000001'
  const FACTORY_ADDRESS = '0x0000000000000000000000000000000000000001'
  const WBNB_ADDRESS = '0x0000000000000000000000000000000000000001'
  const PRICE_ORACLE_ADDRESS = '0x0000000000000000000000000000000000000001'
  const REF_PRICE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000001'
  const MAX_FEE = 10

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let lottery: Signer;
  let playToTheMoon: Signer;
  
  let config: Config;
  let configAsDeployer: Config;
  let configAsAlice: Config;
  let configAsLottery: Config;
  let configAsPlayToTheMoon: Config;

  beforeEach(async() => {
    [deployer, alice, lottery, playToTheMoon] = await ethers.getSigners();
        
    // Deploy Config
    const Config = (await ethers.getContractFactory(
      "Config",
      deployer
    )) as Config__factory;
    config = await Config.deploy(await lottery.getAddress(), ROUTER_ADDRESS, FACTORY_ADDRESS, WBNB_ADDRESS, PRICE_ORACLE_ADDRESS, REF_PRICE_TOKEN_ADDRESS, MAX_FEE);
    await config.deployed();

    configAsDeployer = Config__factory.connect(config.address, deployer);
    configAsAlice = Config__factory.connect(config.address, alice);
    configAsLottery = Config__factory.connect(config.address, lottery);
    configAsPlayToTheMoon = Config__factory.connect(config.address, playToTheMoon);
  });
  
  context('when adjust params', async() => {
    it('constructor', async() => {
      const Config = (await ethers.getContractFactory(
        "Config",
        deployer
      )) as Config__factory;
  
      await expect(Config.deploy(ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, MAX_FEE)).to.be.revertedWith('lottery_ cant be zero');
      await expect(Config.deploy(ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, MAX_FEE)).to.be.revertedWith('router_ cant be zero');
      await expect(Config.deploy(ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, ADDRESS1, MAX_FEE)).to.be.revertedWith('factory_ cant be zero');
      await expect(Config.deploy(ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, ADDRESS1, MAX_FEE)).to.be.revertedWith('wbnb_ cant be zero');
      await expect(Config.deploy(ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, ADDRESS1, MAX_FEE)).to.be.revertedWith('priceOracle_ cant be zero');
      await expect(Config.deploy(ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS0, MAX_FEE)).to.be.revertedWith('refPriceToken_ cant be zero');
      await expect(Config.deploy(ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, ADDRESS1, 0)).to.be.revertedWith('maxFee_ cant be zero');
    });
  });

  context('permissions', async() => {
    it('should reverted', async() => {
      await expect(configAsAlice.setRouter(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsAlice.setFactory(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsAlice.setWbnb(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsAlice.setPriceOracle(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsAlice.setRefPriceToken(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsAlice.setSwapWhiteList(ADDRESS1, true)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsAlice.setFeeInfo(0, 0, 0, 0, 0, 1)).to.be.revertedWith('Only Lottery can call function');

      await expect(configAsPlayToTheMoon.setRouter(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsPlayToTheMoon.setFactory(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsPlayToTheMoon.setWbnb(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsPlayToTheMoon.setPriceOracle(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsPlayToTheMoon.setRefPriceToken(ADDRESS1)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsPlayToTheMoon.setSwapWhiteList(ADDRESS1, true)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(configAsPlayToTheMoon.setFeeInfo(0, 0, 0, 0, 0, 1)).to.be.revertedWith('Only Lottery can call function');

      await expect(configAsDeployer.setFeeInfo(0, 0, 0, 0, 0, 1)).to.be.revertedWith('Only Lottery can call function');
    });
  });

  context('setter/getter', async() => {
    it('should work', async() => {
      expect (await configAsAlice.getRouter()).to.be.eq(ROUTER_ADDRESS);
      expect (await configAsAlice.getFactory()).to.be.eq(FACTORY_ADDRESS);
      expect (await configAsAlice.getWbnb()).to.be.eq(WBNB_ADDRESS);
      expect (await configAsAlice.getPriceOracle()).to.be.eq(PRICE_ORACLE_ADDRESS);
      expect (await configAsAlice.getRefPriceToken()).to.be.eq(REF_PRICE_TOKEN_ADDRESS);
      expect (await configAsAlice.getSwapWhiteList(ADDRESS1)).to.be.eq(false);

      expect (await configAsPlayToTheMoon.getRouter()).to.be.eq(ROUTER_ADDRESS);
      expect (await configAsPlayToTheMoon.getFactory()).to.be.eq(FACTORY_ADDRESS);
      expect (await configAsPlayToTheMoon.getWbnb()).to.be.eq(WBNB_ADDRESS);
      expect (await configAsPlayToTheMoon.getPriceOracle()).to.be.eq(PRICE_ORACLE_ADDRESS);
      expect (await configAsPlayToTheMoon.getRefPriceToken()).to.be.eq(REF_PRICE_TOKEN_ADDRESS);
      expect (await configAsPlayToTheMoon.getSwapWhiteList(ADDRESS1)).to.be.eq(false);

      expect (await configAsLottery.getRouter()).to.be.eq(ROUTER_ADDRESS);
      expect (await configAsLottery.getFactory()).to.be.eq(FACTORY_ADDRESS);
      expect (await configAsLottery.getWbnb()).to.be.eq(WBNB_ADDRESS);
      expect (await configAsLottery.getPriceOracle()).to.be.eq(PRICE_ORACLE_ADDRESS);
      expect (await configAsLottery.getRefPriceToken()).to.be.eq(REF_PRICE_TOKEN_ADDRESS);
      expect (await configAsLottery.getSwapWhiteList(ADDRESS1)).to.be.eq(false);

      await configAsDeployer.setRouter(ADDRESS2);
      await configAsDeployer.setFactory(ADDRESS2);
      await configAsDeployer.setWbnb(ADDRESS2);
      await configAsDeployer.setPriceOracle(ADDRESS2);
      await configAsDeployer.setRefPriceToken(ADDRESS2);
      await configAsDeployer.setSwapWhiteList(ADDRESS2, true);

      expect (await configAsAlice.getRouter()).to.be.eq(ADDRESS2);
      expect (await configAsAlice.getFactory()).to.be.eq(ADDRESS2);
      expect (await configAsAlice.getWbnb()).to.be.eq(ADDRESS2);
      expect (await configAsAlice.getPriceOracle()).to.be.eq(ADDRESS2);
      expect (await configAsAlice.getRefPriceToken()).to.be.eq(ADDRESS2);
      expect (await configAsAlice.getSwapWhiteList(ADDRESS2)).to.be.eq(true);

      expect (await configAsPlayToTheMoon.getRouter()).to.be.eq(ADDRESS2);
      expect (await configAsPlayToTheMoon.getFactory()).to.be.eq(ADDRESS2);
      expect (await configAsPlayToTheMoon.getWbnb()).to.be.eq(ADDRESS2);
      expect (await configAsPlayToTheMoon.getPriceOracle()).to.be.eq(ADDRESS2);
      expect (await configAsPlayToTheMoon.getRefPriceToken()).to.be.eq(ADDRESS2);
      expect (await configAsPlayToTheMoon.getSwapWhiteList(ADDRESS2)).to.be.eq(true);

      expect (await configAsLottery.getRouter()).to.be.eq(ADDRESS2);
      expect (await configAsLottery.getFactory()).to.be.eq(ADDRESS2);
      expect (await configAsLottery.getWbnb()).to.be.eq(ADDRESS2);
      expect (await configAsLottery.getPriceOracle()).to.be.eq(ADDRESS2);
      expect (await configAsLottery.getRefPriceToken()).to.be.eq(ADDRESS2);
      expect (await configAsLottery.getSwapWhiteList(ADDRESS2)).to.be.eq(true);
      
      await configAsDeployer.setRouter(ADDRESS3);

      expect (await configAsAlice.getRouter()).to.be.eq(ADDRESS3);
      expect (await configAsPlayToTheMoon.getRouter()).to.be.eq(ADDRESS3);
      expect (await configAsLottery.getRouter()).to.be.eq(ADDRESS3);


      await configAsDeployer.setFactory(ADDRESS3);
      expect (await configAsAlice.getFactory()).to.be.eq(ADDRESS3);
      expect (await configAsPlayToTheMoon.getFactory()).to.be.eq(ADDRESS3);
      expect (await configAsLottery.getFactory()).to.be.eq(ADDRESS3);


      await configAsDeployer.setWbnb(ADDRESS3);
      expect (await configAsAlice.getWbnb()).to.be.eq(ADDRESS3);
      expect (await configAsPlayToTheMoon.getWbnb()).to.be.eq(ADDRESS3);
      expect (await configAsLottery.getWbnb()).to.be.eq(ADDRESS3);

      await configAsDeployer.setPriceOracle(ADDRESS3);
      expect (await configAsAlice.getPriceOracle()).to.be.eq(ADDRESS3);
      expect (await configAsPlayToTheMoon.getPriceOracle()).to.be.eq(ADDRESS3);
      expect (await configAsLottery.getPriceOracle()).to.be.eq(ADDRESS3);

      await configAsDeployer.setRefPriceToken(ADDRESS3);
      expect (await configAsAlice.getRefPriceToken()).to.be.eq(ADDRESS3);
      expect (await configAsPlayToTheMoon.getRefPriceToken()).to.be.eq(ADDRESS3);
      expect (await configAsLottery.getRefPriceToken()).to.be.eq(ADDRESS3);

      await configAsDeployer.setSwapWhiteList(ADDRESS3, true);
      expect (await configAsAlice.getSwapWhiteList(ADDRESS3)).to.be.eq(true);
      expect (await configAsPlayToTheMoon.getSwapWhiteList(ADDRESS3)).to.be.eq(true);
      expect (await configAsLottery.getSwapWhiteList(ADDRESS3)).to.be.eq(true);

      await configAsDeployer.setSwapWhiteList(ADDRESS3, false);
      expect (await configAsPlayToTheMoon.getSwapWhiteList(ADDRESS3)).to.be.eq(false);
      await configAsDeployer.setSwapWhiteList(ADDRESS2, false);
      await configAsDeployer.setSwapWhiteList(ADDRESS3, true);
      expect (await configAsPlayToTheMoon.getSwapWhiteList(ADDRESS2)).to.be.eq(false);
      expect (await configAsPlayToTheMoon.getSwapWhiteList(ADDRESS3)).to.be.eq(true);
      
      let feeInfo = await configAsDeployer.getFeeInfo(0);
      expect (feeInfo.length).to.be.eq(5);
      expect (feeInfo[0]).to.be.eq(0);
      expect (feeInfo[1]).to.be.eq(0);
      expect (feeInfo[2]).to.be.eq(0);
      expect (feeInfo[3]).to.be.eq(0);
      expect (feeInfo[4]).to.be.eq(0);
      
      await configAsLottery.setFeeInfo(0, 1, 2, 3, 4, 100);

      feeInfo = await configAsDeployer.getFeeInfo(0);
      expect (feeInfo.length).to.be.eq(5);
      expect (feeInfo[0]).to.be.eq(1);
      expect (feeInfo[1]).to.be.eq(2);
      expect (feeInfo[2]).to.be.eq(3);
      expect (feeInfo[3]).to.be.eq(4);
      expect (feeInfo[4]).to.be.eq(100);

      feeInfo = await configAsDeployer.getFeeInfo(1);
      expect (feeInfo.length).to.be.eq(5);
      expect (feeInfo[0]).to.be.eq(0);
      expect (feeInfo[1]).to.be.eq(0);
      expect (feeInfo[2]).to.be.eq(0);
      expect (feeInfo[3]).to.be.eq(0);
      expect (feeInfo[4]).to.be.eq(0);

      await configAsLottery.setFeeInfo(1, 40, 30, 20, 10, 1000);

      feeInfo = await configAsDeployer.getFeeInfo(1);
      expect (feeInfo.length).to.be.eq(5);
      expect (feeInfo[0]).to.be.eq(40);
      expect (feeInfo[1]).to.be.eq(30);
      expect (feeInfo[2]).to.be.eq(20);
      expect (feeInfo[3]).to.be.eq(10);
      expect (feeInfo[4]).to.be.eq(1000);
    });
  });

  context('max fee', async() => {
    it('should work', async() => {
      const Config = (await ethers.getContractFactory(
        "Config",
        deployer
      )) as Config__factory;

      let config1 = await Config.deploy(await lottery.getAddress(), ROUTER_ADDRESS, FACTORY_ADDRESS, WBNB_ADDRESS, PRICE_ORACLE_ADDRESS, REF_PRICE_TOKEN_ADDRESS, 1);
      await config1.deployed();
      let config1AsLottery = Config__factory.connect(config1.address, lottery);
      
      await config1AsLottery.setFeeInfo(0, 1, 2, 3, 4, 100);
      await config1AsLottery.setFeeInfo(0, 100, 0, 0, 0, 100);
      await config1AsLottery.setFeeInfo(0, 1000, 0, 0, 0, 1000);
      await config1AsLottery.setFeeInfo(0, 0, 0, 0, 10000, 10000);
      await config1AsLottery.setFeeInfo(0, 0, 1, 0, 0, 1);
      
      await expect(config1AsLottery.setFeeInfo(0, 1, 0, 0, 100, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1AsLottery.setFeeInfo(0, 2, 2, 100, 4, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1AsLottery.setFeeInfo(0, 110, 0, 0, 0, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1AsLottery.setFeeInfo(0, 1010, 0, 0, 0, 1000)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1AsLottery.setFeeInfo(0, 0, 0, 0, 10001, 10000)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1AsLottery.setFeeInfo(0, 100, 0, 1, 0, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1AsLottery.setFeeInfo(0, 1, 1, 0, 0, 1)).to.be.revertedWith('The total fee must be less than maxFee%.');
      
      let config10 = await Config.deploy(await lottery.getAddress(), ROUTER_ADDRESS, FACTORY_ADDRESS, WBNB_ADDRESS, PRICE_ORACLE_ADDRESS, REF_PRICE_TOKEN_ADDRESS, 10);
      await config10.deployed();
      let config10AsLottery = Config__factory.connect(config10.address, lottery);
      
      await config10AsLottery.setFeeInfo(0, 1, 2, 3, 4, 100);
      await config10AsLottery.setFeeInfo(0, 10, 0, 0, 0, 100);
      await config10AsLottery.setFeeInfo(0, 100, 0, 0, 0, 1000);
      await config10AsLottery.setFeeInfo(0, 1000, 0, 0, 0, 10000);
      await config10AsLottery.setFeeInfo(0, 0, 0, 0, 0, 1);
      
      await expect(config10AsLottery.setFeeInfo(0, 1, 2, 3, 5, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config10AsLottery.setFeeInfo(0, 2, 2, 3, 4, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config10AsLottery.setFeeInfo(0, 11, 0, 0, 0, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config10AsLottery.setFeeInfo(0, 101, 0, 0, 0, 1000)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config10AsLottery.setFeeInfo(0, 0, 0, 0, 1001, 10000)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config10AsLottery.setFeeInfo(0, 100, 0, 0, 0, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config10AsLottery.setFeeInfo(0, 1, 0, 0, 0, 1)).to.be.revertedWith('The total fee must be less than maxFee%.');
      
      let config100 = await Config.deploy(await lottery.getAddress(), ROUTER_ADDRESS, FACTORY_ADDRESS, WBNB_ADDRESS, PRICE_ORACLE_ADDRESS, REF_PRICE_TOKEN_ADDRESS, 100);
      await config100.deployed();
      let config100AsLottery = Config__factory.connect(config100.address, lottery);
      
      await config100AsLottery.setFeeInfo(0, 1, 0, 0, 0, 100);
      await config100AsLottery.setFeeInfo(0, 0, 1, 0, 0, 100);
      await config100AsLottery.setFeeInfo(0, 10, 0, 0, 0, 1000);
      await config100AsLottery.setFeeInfo(0, 0, 1, 0, 99, 10000);
      await config100AsLottery.setFeeInfo(0, 0, 0, 0, 0, 1);
      
      await expect(config100AsLottery.setFeeInfo(0, 1, 0, 0, 1, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config100AsLottery.setFeeInfo(0, 2, 0, 0, 0, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config100AsLottery.setFeeInfo(0, 11, 0, 0, 0, 1000)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config100AsLottery.setFeeInfo(0, 0, 0, 0, 101, 10000)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config100AsLottery.setFeeInfo(0, 100, 0, 0, 0, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config100AsLottery.setFeeInfo(0, 1, 0, 0, 0, 1)).to.be.revertedWith('The total fee must be less than maxFee%.');
      
      let config1000 = await Config.deploy(await lottery.getAddress(), ROUTER_ADDRESS, FACTORY_ADDRESS, WBNB_ADDRESS, PRICE_ORACLE_ADDRESS, REF_PRICE_TOKEN_ADDRESS, 1000);
      await config1000.deployed();
      let config1000AsLottery = Config__factory.connect(config1000.address, lottery);
      
      await config1000AsLottery.setFeeInfo(0, 0, 0, 0, 0, 100);
      await config1000AsLottery.setFeeInfo(0, 1, 0, 0, 0, 1000);
      await config1000AsLottery.setFeeInfo(0, 0, 1, 0, 0, 10000);
      await config1000AsLottery.setFeeInfo(0, 0, 0, 0, 0, 1);
      
      await expect(config1000AsLottery.setFeeInfo(0, 1, 0, 0, 0, 100)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1000AsLottery.setFeeInfo(0, 0, 2, 0, 0, 1000)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1000AsLottery.setFeeInfo(0, 0, 0, 0, 11, 10000)).to.be.revertedWith('The total fee must be less than maxFee%.');
      await expect(config1000AsLottery.setFeeInfo(0, 1, 0, 0, 0, 1)).to.be.revertedWith('The total fee must be less than maxFee%.');
    });
  });
});