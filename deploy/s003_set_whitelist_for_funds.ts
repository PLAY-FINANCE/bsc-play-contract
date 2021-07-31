import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { Config__factory } from '../typechain';
import MainnetConfig from '../.mainnet.json';
import TestnetConfig from '../.testnet.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { network } = hre;
  const config = network.name === "mainnet" ? MainnetConfig : TestnetConfig;
  /*
  ░██╗░░░░░░░██╗░█████╗░██████╗░███╗░░██╗██╗███╗░░██╗░██████╗░
  ░██║░░██╗░░██║██╔══██╗██╔══██╗████╗░██║██║████╗░██║██╔════╝░
  ░╚██╗████╗██╔╝███████║██████╔╝██╔██╗██║██║██╔██╗██║██║░░██╗░
  ░░████╔═████║░██╔══██║██╔══██╗██║╚████║██║██║╚████║██║░░╚██╗
  ░░╚██╔╝░╚██╔╝░██║░░██║██║░░██║██║░╚███║██║██║░╚███║╚██████╔╝
  ░░░╚═╝░░░╚═╝░░╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝╚═╝╚═╝░░╚══╝░╚═════╝░
  Check all variables below before execute the deployment script
  */










  const configAsDeployer = Config__factory.connect(config.Config, (await ethers.getSigners())[0]);

  console.log(">> Setting swap white lists");
  (await configAsDeployer.setSwapWhiteList(config.Tokens.PLAY, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.Tokens.BTCB, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.Tokens.ETH, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.Tokens.WBNB, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.Tokens.BUSD, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.Tokens.USDT, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.Tokens.ALPACA, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.Tokens.CAKE, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.LPTokens.PLAYBNB, true, { gasLimit: '1000000' })).wait();
  (await configAsDeployer.setSwapWhiteList(config.Tokens.BUNNY, true, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['s003'];