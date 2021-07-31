import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { Vault__factory } from '../typechain';
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

  const play = Vault__factory.connect(config.Vault.Play, (await ethers.getSigners())[0]);
  const playBnb = Vault__factory.connect(config.Vault.PlayBnb, (await ethers.getSigners())[0]);
  const btcb = Vault__factory.connect(config.Vault.AlpacaBtcb, (await ethers.getSigners())[0]);
  const eth = Vault__factory.connect(config.Vault.AlpacaEth, (await ethers.getSigners())[0]);
  const wbnb = Vault__factory.connect(config.Vault.AlpacaWbnb, (await ethers.getSigners())[0]);
  const busd = Vault__factory.connect(config.Vault.AlpacaBusd, (await ethers.getSigners())[0]);
  const usdt = Vault__factory.connect(config.Vault.AlpacaUsdt, (await ethers.getSigners())[0]);
  const cake = Vault__factory.connect(config.Vault.PancakeCake, (await ethers.getSigners())[0]);
  const alpaca = Vault__factory.connect(config.Vault.AlpacaAlpaca, (await ethers.getSigners())[0]);
  const bunny = Vault__factory.connect(config.Vault.EventBunny, (await ethers.getSigners())[0]);

  console.log(">> Set min deposit amounts");
  (await play.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await playBnb.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await btcb.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await eth.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await wbnb.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await busd.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await usdt.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await cake.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await alpaca.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  (await bunny.setMinDepositAmount(ethers.utils.parseEther('0'), { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ["s014"];