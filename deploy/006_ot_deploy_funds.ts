import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
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
















  console.log(">> Deploying an fund contracts");

  console.log(">> Deploying an PlayToTheMoon");
  await deploy('PlayToTheMoon', {
    from: deployer,
    args: [
      config.Config,
      true
    ],
    contract: 'Fund',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying an SAFU");
  await deploy('SAFU', {
    from: deployer,
    args: [
      config.Config,
      false
    ],
    contract: 'Fund',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying an Operator");
  await deploy('Operator', {
    from: deployer,
    args: [
      config.Config,
      false
    ],
    contract: 'Fund',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");
};

export default func;
func.tags = ['Fund'];