import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { LinearRelease__factory } from '../typechain';
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














  
  console.log(">> Deploying a Prize Linear Release contract");
  const prizeLinearRelease = await deploy('PrizeLinearRelease', {
    from: deployer,
    args: [
      config.Tokens.PLAY
    ],
    contract: 'LinearRelease',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  const prizeLinearReleaseAsDeployer = LinearRelease__factory.connect(prizeLinearRelease.address, (await ethers.getSigners())[0]); 
  
  console.log(">> Transferring ownership of PrizeLinearRelease from deployer to PlayDistributor");
  (await prizeLinearReleaseAsDeployer.transferOwnership(config.PlayDistributor)).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['PrizeLinearRelease'];