import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { PlayToken__factory, Lottery__factory } from '../typechain';
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














  console.log(">> Deploying an PlayDistributor contract");
  const PLAY_REWARD_PER_BLOCK = ethers.utils.parseEther('2.430555555555555556');
  const playDistributor = await deploy('PlayDistributor', {
    from: deployer,
    args: [
      config.Tokens.PLAY,
      PLAY_REWARD_PER_BLOCK,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Config
    ],
    log: true,
    deterministicDeployment: false,
  })  
  console.log("✅ Done");

  console.log(">> Transferring ownership of PlayToken from deployer to PlayDistributor");
  const playToken = PlayToken__factory.connect(config.Tokens.PLAY, (await ethers.getSigners())[0]);
  (await playToken.transferOwnership(playDistributor.address)).wait();
  console.log("✅ Done");
  
  console.log(">> Initialize lottery");
  const lottery = Lottery__factory.connect(config.Lottery, (await ethers.getSigners())[0]);
  (await lottery.initialize(config.RandomNumberGenerator, playDistributor.address, config.Config)).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['PlayDistributor'];