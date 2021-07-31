import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { MockERC20__factory } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  if (network.name !== 'testnet') {
    console.log('This deployment script should be run against testnet only')
    return
  }

  console.log(">> Deploying Tokens");
  const busd = await deploy('BUSD', {
    from: deployer,
    args: [
      'BUSD',
      'BUSD'
    ],
    contract: 'MockERC20',
    log: true,
    deterministicDeployment: false,
  });
  const usdt = await deploy('USDT', {
    from: deployer,
    args: [
      'USDT',
      'USDT'
    ],
    contract: 'MockERC20',
    log: true,
    deterministicDeployment: false,
  });
  const btcb = await deploy('BTCB', {
    from: deployer,
    args: [
      'BTCB',
      'BTCB'
    ],
    contract: 'MockERC20',
    log: true,
    deterministicDeployment: false,
  });
  const eth = await deploy('ETH', {
    from: deployer,
    args: [
      'ETH',
      'ETH'
    ],
    contract: 'MockERC20',
    log: true,
    deterministicDeployment: false,
  });
  const alpaca = await deploy('ALPACA', {
    from: deployer,
    args: [
      'ALPACA',
      'ALPACA'
    ],
    contract: 'MockERC20',
    log: true,
    deterministicDeployment: false,
  });
  const cake = await deploy('CAKE', {
    from: deployer,
    args: [
      'CAKE',
      'CAKE'
    ],
    contract: 'MockERC20',
    log: true,
    deterministicDeployment: false,
  });
  const syrup = await deploy('SYRUP', {
    from: deployer,
    args: [
      'SYRUP',
      'SYRUP'
    ],
    contract: 'MockERC20',
    log: true,
    deterministicDeployment: false,
  });

  const busdAsDeployer = MockERC20__factory.connect(
    busd.address, (await ethers.getSigners())[0]);
  const usdtAsDeployer = MockERC20__factory.connect(
    usdt.address, (await ethers.getSigners())[0]);
  const btcbAsDeployer = MockERC20__factory.connect(
    btcb.address, (await ethers.getSigners())[0]);
  const ethAsDeployer = MockERC20__factory.connect(
    eth.address, (await ethers.getSigners())[0]);
  const alpacaAsDeployer = MockERC20__factory.connect(
    alpaca.address, (await ethers.getSigners())[0]);
  const cakeAsDeployer = MockERC20__factory.connect(
    cake.address, (await ethers.getSigners())[0]);

  console.log(">> Minting 1,000,000,000 BUSDs");
  await busdAsDeployer.mint(deployer, ethers.utils.parseEther('1000000000'), { gasLimit: '210000' });
  console.log("✅ Done")

  console.log(">> Minting 1,000,000,000 USDTs");
  await usdtAsDeployer.mint(deployer, ethers.utils.parseEther('1000000000'), { gasLimit: '210000' });
  console.log("✅ Done")

  console.log(">> Minting 1,000,000,000 BTCBs");
  await btcbAsDeployer.mint(deployer, ethers.utils.parseEther('1000000000'), { gasLimit: '210000' });
  console.log("✅ Done")

  console.log(">> Minting 1,000,000,000 ETHs");
  await ethAsDeployer.mint(deployer, ethers.utils.parseEther('1000000000'), { gasLimit: '210000' });
  console.log("✅ Done")

  console.log(">> Minting 1,000,000,000 ALPACAs");
  await alpacaAsDeployer.mint(deployer, ethers.utils.parseEther('1000000000'), { gasLimit: '210000' });
  console.log("✅ Done")

  console.log(">> Minting 1,000,000,000 CAKEs");
  await cakeAsDeployer.mint(deployer, ethers.utils.parseEther('1000000000'), { gasLimit: '210000' });
  console.log("✅ Done")
};

export default func;
func.tags = ['Testnet', "testnet02"];