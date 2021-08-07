import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { Timelock__factory } from '../typechain';
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

  const timelock = Timelock__factory.connect(config.Timelock, (await ethers.getSigners())[0]);

  const blockNumber = await ethers.provider.getBlockNumber();
  const blockTimestamp = (await ethers.provider.getBlock(blockNumber)).timestamp;

  (await timelock.queueTransaction(
    config.Config, 
    '0',
    'setPriceOracle(address)',
    ethers.utils.defaultAbiCoder.encode(['address'], [config.PriceOracle]),
    blockTimestamp + 24 * 60 * 60 + 10
  )).wait();

  (await timelock.cancelTransaction(
    config.Config, 
    '0',
    'setPriceOracle(address)',
    ethers.utils.defaultAbiCoder.encode(['address'], [config.PriceOracle]),
    blockTimestamp + 24 * 60 * 60 + 10
  )).wait();

  (await timelock.executeTranscation(
    config.Config, 
    '0',
    'setPriceOracle(address)',
    ethers.utils.defaultAbiCoder.encode(['address'], [config.PriceOracle]),
    blockTimestamp + 24 * 60 * 60 + 10
  )).wait();
};

export default func;
func.tags = ["s017"];