import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import MainnetConfig from '../.mainnet.json';
import TestnetConfig from '../.testnet.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
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














  const VRF_COORDINATOR_ADDRESS = config.ChainLink.VrfCoordinator;
  const CHAINLINK_ADDRESS = config.ChainLink.LINK;
  const CHAINLINK_HASH = config.ChainLink.ChainLinkHash;
  const CHAINLINK_FEE = config.ChainLink.ChainLinkFee;

  console.log(">> Deploying an lottery contract");

  const lottery = await deploy('Lottery', {
    from: deployer,
    args: [
      ethers.constants.AddressZero
    ],
    contract: 'Lottery',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying an RandomNumberGenerator contract");  
  
  await deploy('RandomNumberGenerator', {
    from: deployer,
    args: [
      VRF_COORDINATOR_ADDRESS,
      CHAINLINK_ADDRESS,
      lottery.address,
      CHAINLINK_HASH,
      CHAINLINK_FEE
    ],
    contract: 'RandomNumberGenerator',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");
};

export default func;
func.tags = ['Lottery'];