import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { PancakeFactory__factory, PancakeRouterV2__factory, PlayToken__factory } from '../typechain';
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

  const FOREVER = 20000000000;

  const factory = PancakeFactory__factory.connect(config.Pancakeswap.Factory, (await ethers.getSigners())[0]);
  const router = PancakeRouterV2__factory.connect(config.Pancakeswap.RouterV2, (await ethers.getSigners())[0]);

  const play = PlayToken__factory.connect(config.Tokens.PLAY, (await ethers.getSigners())[0]);
  console.log(">> Creating the PLAY-WBNB Trading Pair");
  (await factory.createPair(config.Tokens.PLAY, config.Tokens.WBNB,
    {
      gasLimit: '10000000',
    }
  )).wait();
  console.log(await factory.getPair(config.Tokens.PLAY, config.Tokens.WBNB));
  console.log("✅ Done");
  console.log(">> Adding liquidity to PLAY-WBNB Pair");
  (await play.approve(router.address, ethers.utils.parseEther('1'))).wait();
  (await router.addLiquidityETH(
    play.address,
    ethers.utils.parseEther('1'),
    '0', '0', (await ethers.getSigners())[0].address, FOREVER, { value: ethers.utils.parseEther('0.01'), gasLimit: 10000000 })).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ["s006"];