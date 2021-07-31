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
  const CAKE_REWARD_PER_BLOCK = ethers.utils.parseEther('1');
  const START_BLOCK = '10405600';















  const cake = MockERC20__factory.connect(TestnetConfig.Tokens.CAKE, (await ethers.getSigners())[0]);
  const syrup = MockERC20__factory.connect(TestnetConfig.Tokens.SYRUP, (await ethers.getSigners())[0]);

  const masterChef = await deploy('PancakeMasterChef', {
    from: deployer,
    args: [
      cake.address,
      syrup.address,
      deployer,
      CAKE_REWARD_PER_BLOCK,
      START_BLOCK
    ],
    contract: 'MockPancakeMasterChef',
    log: true,
    deterministicDeployment: false,
  })

  console.log(">> Transferring ownership of CakeToken from deployer to MasterChef");
  await cake.transferOwnership(masterChef.address, { gasLimit: '500000' });
  console.log("✅ Done");

  console.log(">> Transferring ownership of SyrupToken from deployer to MasterChef");
  await syrup.transferOwnership(masterChef.address, { gasLimit: '500000' });
  console.log("✅ Done");
};

export default func;
func.tags = ['Testnet', "testnet07"];