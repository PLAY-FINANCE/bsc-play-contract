import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { PriceOracle__factory } from '../typechain';
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










  const priceOracle = PriceOracle__factory.connect(config.PriceOracle, (await ethers.getSigners())[0]);

  console.log(">> Setting prices");
  (await priceOracle.setPrices(
    [config.Tokens.BTCB, config.Tokens.ETH, config.Tokens.WBNB, config.Tokens.BUSD, config.Tokens.USDT, config.Tokens.ALPACA, config.Tokens.PLAY, config.Tokens.CAKE, config.LPTokens.PLAYBNB, config.Tokens.BUNNY], 
    [config.Tokens.BUSD, config.Tokens.BUSD, config.Tokens.BUSD, config.Tokens.BUSD, config.Tokens.BUSD, config.Tokens.BUSD, config.Tokens.BUSD, config.Tokens.BUSD, config.Tokens.BUSD, config.Tokens.BUSD], 
    [ethers.utils.parseEther('38828.21'), ethers.utils.parseEther('2339.31'), ethers.utils.parseEther('309.58'), ethers.utils.parseEther('1'), ethers.utils.parseEther('1'), ethers.utils.parseEther('0.859'), ethers.utils.parseEther('2'), ethers.utils.parseEther('14.37'), ethers.utils.parseEther('1'), ethers.utils.parseEther('13.47')],
    { gasLimit: '1000000' })
  ).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['s002'];