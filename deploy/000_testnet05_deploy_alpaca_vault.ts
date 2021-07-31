import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { MockWBNB__factory, MockERC20__factory, MockAlpacaVault__factory, MockAlpacaFairLaunch__factory } from '../typechain';
import { ethers, upgrades } from 'hardhat';
import TestnetConfig from '../.testnet.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    /*
  ░██╗░░░░░░░██╗░█████╗░██████╗░███╗░░██╗██╗███╗░░██╗░██████╗░
  ░██║░░██╗░░██║██╔══██╗██╔══██╗████╗░██║██║████╗░██║██╔════╝░
  ░╚██╗████╗██╔╝███████║██████╔╝██╔██╗██║██║██╔██╗██║██║░░██╗░
  ░░████╔═████║░██╔══██║██╔══██╗██║╚████║██║██║╚████║██║░░╚██╗
  ░░╚██╔╝░╚██╔╝░██║░░██║██║░░██║██║░╚███║██║██║░╚███║╚██████╔╝
  ░░░╚═╝░░░╚═╝░░╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝╚═╝╚═╝░░╚══╝░╚═════╝░
  Check all variables below before execute the deployment script
  */

  
  console.log(">> Deploying upgradable AlpacaVault contract");  
  const btcb = MockERC20__factory.connect(TestnetConfig.Tokens.BTCB, (await ethers.getSigners())[0]);
  const eth = MockERC20__factory.connect(TestnetConfig.Tokens.ETH, (await ethers.getSigners())[0]);
  const wbnb = MockWBNB__factory.connect(TestnetConfig.Tokens.WBNB, (await ethers.getSigners())[0]);
  const busd = MockERC20__factory.connect(TestnetConfig.Tokens.BUSD, (await ethers.getSigners())[0]);
  const usdt = MockERC20__factory.connect(TestnetConfig.Tokens.USDT, (await ethers.getSigners())[0]);
  const alpaca = MockERC20__factory.connect(TestnetConfig.Tokens.ALPACA, (await ethers.getSigners())[0]);

  const AlpacaVault = (await ethers.getContractFactory(
    'MockAlpacaVault',
    (await ethers.getSigners())[0]
  )) as MockAlpacaVault__factory;

  const btcbVault = await upgrades.deployProxy(
    AlpacaVault, [btcb.address, 'Interest Bearing BTCB TOKEN', 'ibBtcbTOKEN', 18, wbnb.address]
  );
  await btcbVault.deployed();
  console.log(`>> Deployed at ${btcbVault.address}`);

  const ethVault = await upgrades.deployProxy(
    AlpacaVault, [eth.address, 'Interest Bearing ETH TOKEN', 'ibEthTOKEN', 18, wbnb.address]
  );
  await ethVault.deployed();
  console.log(`>> Deployed at ${ethVault.address}`);

  const wbnbVault = await upgrades.deployProxy(
    AlpacaVault, [wbnb.address, 'Interest Bearing Wbnb TOKEN', 'ibWbnbTOKEN', 18, wbnb.address]
  );
  await wbnbVault.deployed();
  console.log(`>> Deployed at ${wbnbVault.address}`);

  const busdVault = await upgrades.deployProxy(
    AlpacaVault, [busd.address, 'Interest Bearing Busd TOKEN', 'ibBusdTOKEN', 18, wbnb.address]
  );
  await busdVault.deployed();
  console.log(`>> Deployed at ${busdVault.address}`);

  const usdtVault = await upgrades.deployProxy(
    AlpacaVault, [usdt.address, 'Interest Bearing Usdt TOKEN', 'ibUsdtTOKEN', 18, wbnb.address]
  );
  await usdtVault.deployed();
  console.log(`>> Deployed at ${usdtVault.address}`);

  const alpacaVault = await upgrades.deployProxy(
    AlpacaVault, [alpaca.address, 'Interest Bearing Alpaca TOKEN', 'ibAlpacaTOKEN', 18, wbnb.address]
  );
  await alpacaVault.deployed();
  console.log(`>> Deployed at ${alpacaVault.address}`);

  console.log("✅ Done");

  console.log(">> Adding new pool to fair launch");
  const fairLaunch = MockAlpacaFairLaunch__factory.connect(TestnetConfig.Alpaca.AlpacaFairLaunch, (await ethers.getSigners())[0]);

  await fairLaunch.addPool(1, TestnetConfig.Alpaca.BTCBVault, false);
  await fairLaunch.addPool(1, TestnetConfig.Alpaca.ETHVault, false);
  await fairLaunch.addPool(1, TestnetConfig.Alpaca.BNBVault, false);
  await fairLaunch.addPool(1, TestnetConfig.Alpaca.BUSDVault, false);
  await fairLaunch.addPool(1, TestnetConfig.Alpaca.USDTVault, false);
  await fairLaunch.addPool(1, TestnetConfig.Alpaca.ALPACAVault, false);
  console.log("✅ Done");
};

export default func;
func.tags = ['Testnet', "testnet05"];