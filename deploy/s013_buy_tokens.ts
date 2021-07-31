import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { MockERC20__factory, PancakeFactory__factory, PancakeRouterV2__factory } from '../typechain';
import MainnetConfig from '../.mainnet.json';
import TestnetConfig from '../.testnet.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { network } = hre;
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


  const factory = PancakeFactory__factory.connect(config.Pancakeswap.Factory, (await ethers.getSigners())[0]);
  const router = PancakeRouterV2__factory.connect(config.Pancakeswap.RouterV2, (await ethers.getSigners())[0]);

  const btcb = MockERC20__factory.connect(config.Tokens.BTCB, (await ethers.getSigners())[0]);
  const eth = MockERC20__factory.connect(config.Tokens.ETH, (await ethers.getSigners())[0]);
  const wbnb = MockERC20__factory.connect(config.Tokens.WBNB, (await ethers.getSigners())[0]);
  const busd = MockERC20__factory.connect(config.Tokens.BUSD, (await ethers.getSigners())[0]);
  const usdt = MockERC20__factory.connect(config.Tokens.USDT, (await ethers.getSigners())[0]);
  const cake = MockERC20__factory.connect(config.Tokens.CAKE, (await ethers.getSigners())[0]);
  const alpaca = MockERC20__factory.connect(config.Tokens.ALPACA, (await ethers.getSigners())[0]);

  const wbnbBtcbLp = MockERC20__factory.connect(await factory.getPair(wbnb.address, btcb.address), (await ethers.getSigners())[0]);
  const wbnbEthbLp = MockERC20__factory.connect(await factory.getPair(wbnb.address, eth.address), (await ethers.getSigners())[0]);
  const wbnbBusdLp = MockERC20__factory.connect(await factory.getPair(wbnb.address, busd.address), (await ethers.getSigners())[0]);
  const wbnbUsdtLp = MockERC20__factory.connect(await factory.getPair(wbnb.address, usdt.address), (await ethers.getSigners())[0]);
  const wbnbCakeLp = MockERC20__factory.connect(await factory.getPair(wbnb.address, cake.address), (await ethers.getSigners())[0]);
  const wbnbAlpacaLp = MockERC20__factory.connect(await factory.getPair(wbnb.address, alpaca.address), (await ethers.getSigners())[0]);
  
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  const timestamp = block.timestamp;
  
  console.log(">> Buying tokens");
  (await router.swapExactETHForTokens(0, [wbnb.address, btcb.address], (await ethers.getSigners())[0].address, timestamp + 300, { value: ethers.utils.parseEther("0.001"), gasLimit: '1000000' })).wait();
  (await router.swapExactETHForTokens(0, [wbnb.address, eth.address], (await ethers.getSigners())[0].address, timestamp + 300, { value: ethers.utils.parseEther("0.001"), gasLimit: '1000000' })).wait();
  (await router.swapExactETHForTokens(0, [wbnb.address, busd.address], (await ethers.getSigners())[0].address, timestamp + 300, { value: ethers.utils.parseEther("0.001"), gasLimit: '1000000' })).wait();
  (await router.swapExactETHForTokens(0, [wbnb.address, usdt.address], (await ethers.getSigners())[0].address, timestamp + 300, { value: ethers.utils.parseEther("0.001"), gasLimit: '1000000' })).wait();
  (await router.swapExactETHForTokens(0, [wbnb.address, cake.address], (await ethers.getSigners())[0].address, timestamp + 300, { value: ethers.utils.parseEther("0.001"), gasLimit: '1000000' })).wait();
  (await router.swapExactETHForTokens(0, [wbnb.address, alpaca.address], (await ethers.getSigners())[0].address, timestamp + 300, { value: ethers.utils.parseEther("0.001"), gasLimit: '1000000' })).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ["s013"];