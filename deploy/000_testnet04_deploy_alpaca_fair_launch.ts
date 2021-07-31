import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { MockERC20__factory } from '../typechain';
import TestnetConfig from '../.testnet.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  /*
  ░██╗░░░░░░░██╗░█████╗░██████╗░███╗░░██╗██╗███╗░░██╗░██████╗░
  ░██║░░██╗░░██║██╔══██╗██╔══██╗████╗░██║██║████╗░██║██╔════╝░
  ░╚██╗████╗██╔╝███████║██████╔╝██╔██╗██║██║██╔██╗██║██║░░██╗░
  ░░████╔═████║░██╔══██║██╔══██╗██║╚████║██║██║╚████║██║░░╚██╗
  ░░╚██╔╝░╚██╔╝░██║░░██║██║░░██║██║░╚███║██║██║░╚███║╚██████╔╝
  ░░░╚═╝░░░╚═╝░░╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝╚═╝╚═╝░░╚══╝░╚═════╝░
  Check all variables below before execute the deployment script
  */
  const ALPACA_REWARD_PER_BLOCK = ethers.utils.parseEther('1');
  const START_BLOCK = '10405600';















  const alpaca = MockERC20__factory.connect(TestnetConfig.Tokens.ALPACA, (await ethers.getSigners())[0]);

  const fairLaunch = await deploy('AlpacaFairLaunch', {
    from: deployer,
    args: [
      alpaca.address,
      deployer,
      ALPACA_REWARD_PER_BLOCK,
      START_BLOCK
    ],
    contract: 'MockAlpacaFairLaunch',
    log: true,
    deterministicDeployment: false,
  })

  console.log(">> Transferring ownership of AlpacaToken from deployer to FairLaunch");
  await alpaca.transferOwnership(fairLaunch.address, { gasLimit: '500000' });
  console.log("✅ Done");
};

export default func;
func.tags = ['Testnet', "testnet04"];