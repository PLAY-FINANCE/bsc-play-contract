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














  console.log(">> Deploying a VaultWithoutStrategyPlayBnbLP contract");

  await deploy('VaultWithoutStrategyPlayBnbLP', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.LPTokens.PLAYBNB,
      ethers.constants.AddressZero,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayPlayBnbLPToken",
      "pPLAYBNBLP",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");
};

export default func;
func.tags = ['PlayBnbLPVault'];