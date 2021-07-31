import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { MockERC20__factory, MockWBNB__factory, PancakeFactory__factory, PancakeRouterV2__factory } from '../typechain';
import TestnetConfig from '../.testnet.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { network } = hre;
  if (network.name !== 'testnet') {
    console.log('This deployment script should be run against testnet only')
    return
  }

  const FOREVER = 20000000000;

  const factory = PancakeFactory__factory.connect(TestnetConfig.Pancakeswap.Factory, (await ethers.getSigners())[0]);
  const router = PancakeRouterV2__factory.connect(TestnetConfig.Pancakeswap.RouterV2, (await ethers.getSigners())[0]);

  const wbnb = MockWBNB__factory.connect(TestnetConfig.Tokens.WBNB, (await ethers.getSigners())[0]);
  const btcb = MockERC20__factory.connect(TestnetConfig.Tokens.BTCB, (await ethers.getSigners())[0]);
  const eth = MockERC20__factory.connect(TestnetConfig.Tokens.ETH, (await ethers.getSigners())[0]);
  const usdt = MockERC20__factory.connect(TestnetConfig.Tokens.USDT, (await ethers.getSigners())[0]);
  const busd = MockERC20__factory.connect(TestnetConfig.Tokens.BUSD, (await ethers.getSigners())[0]);
  const alpaca = MockERC20__factory.connect(TestnetConfig.Tokens.ALPACA, (await ethers.getSigners())[0]);
  
  console.log(">> Creating the BTCB-WBNB Trading Pair");
  await factory.createPair(btcb.address, wbnb.address,
    {
      gasLimit: '10000000',
    }
  );
  console.log(await factory.getPair(btcb.address, wbnb.address))
  console.log("✅ Done");
  console.log(">> Adding liquidity to BTCB-WBNB Pair")
  await btcb.approve(router.address, ethers.utils.parseEther('0.000958566'));
  await router.addLiquidityETH(
    btcb.address,
    ethers.utils.parseEther('0.000958566'),
    '0', '0', (await ethers.getSigners())[0].address, FOREVER, { value: ethers.utils.parseEther('0.1'), gasLimit: 5000000 })
  console.log("✅ Done");

  console.log(">> Creating the ETH-WBNB Trading Pair");
  await factory.createPair(eth.address, wbnb.address,
    {
      gasLimit: '10000000',
    }
  );
  console.log(await factory.getPair(eth.address, wbnb.address))
  console.log("✅ Done");
  console.log(">> Adding liquidity to ETH-WBNB Pair")
  await eth.approve(router.address, ethers.utils.parseEther('0.0143157'));
  await router.addLiquidityETH(
    eth.address,
    ethers.utils.parseEther('0.0143157'),
    '0', '0', (await ethers.getSigners())[0].address, FOREVER, { value: ethers.utils.parseEther('0.1'), gasLimit: 5000000 })
  console.log("✅ Done");

  console.log(">> Creating the USDT-BUSD Trading Pair");
  await factory.createPair(usdt.address, busd.address,
    {
      gasLimit: '10000000',
    }
  );
  console.log(await factory.getPair(busd.address, usdt.address))
  console.log("✅ Done");
  console.log(">> Adding liquidity to USDT-BUSD Pair")
  await usdt.approve(router.address, ethers.utils.parseEther('1000'));
  await busd.approve(router.address, ethers.utils.parseEther('1000'));
  await router.addLiquidity(usdt.address, busd.address,
    ethers.utils.parseEther('1000'),
    ethers.utils.parseEther('1000'),
    '0', '0', (await ethers.getSigners())[0].address, FOREVER, { gasLimit: 5000000 })
  console.log("✅ Done");

  console.log(">> Creating the ALPACA-BUSD Trading Pair");
  await factory.createPair(alpaca.address, busd.address,
    {
      gasLimit: '10000000',
    }
  );
  console.log(await factory.getPair(alpaca.address, busd.address))
  console.log("✅ Done");
  console.log(">> Adding liquidity to ALPACA-BUSD Pair")
  await alpaca.approve(router.address, ethers.utils.parseEther('1000'));
  await busd.approve(router.address, ethers.utils.parseEther('562.078'));
  await router.addLiquidity(alpaca.address, busd.address,
    ethers.utils.parseEther('1000'),
    ethers.utils.parseEther('562.078'),
    '0', '0', (await ethers.getSigners())[0].address, FOREVER, { gasLimit: 5000000 })
  console.log("✅ Done");

  console.log(">> Creating the ALPACA-WBNB Trading Pair");
  await factory.createPair(alpaca.address, wbnb.address,
    {
      gasLimit: '10000000',
    }
  );
  console.log(await factory.getPair(alpaca.address, wbnb.address))
  console.log("✅ Done");
  console.log(">> Adding liquidity to ALPACA-WBNB Pair")
  await alpaca.approve(router.address, ethers.utils.parseEther('100'));
  await router.addLiquidityETH(
    alpaca.address,
    ethers.utils.parseEther('100'),
    '0', '0', (await ethers.getSigners())[0].address, FOREVER, { value: ethers.utils.parseEther('0.174606'), gasLimit: 5000000 })
  console.log("✅ Done");
};

export default func;
func.tags = ['Testnet', "testnet03"];