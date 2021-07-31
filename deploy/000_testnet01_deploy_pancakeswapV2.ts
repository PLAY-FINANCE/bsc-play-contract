import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (network.name !== 'testnet') {
    console.log('This deployment script should be run against testnet only')
    return
  }

  const factory = await deploy('PancakeFactory', {
    from: deployer,
    args: [
      deployer,
    ],
    log: true,
    deterministicDeployment: false,
  });

  const wbnb = await deploy('WBNB', {
    from: deployer,
    contract: 'MockWBNB',
    log: true,
    deterministicDeployment: false,
  });

  await deploy('PancakeRouterV2', {
    from: deployer,
    args: [
      factory.address,
      wbnb.address,
    ],
    log: true,
    deterministicDeployment: false,
  })
};

export default func;
func.tags = ['Testnet', "testnet01"];