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
  const alpacaBtcb = Vault__factory.connect(config.Vault.AlpacaBtcb, (await ethers.getSigners())[0]);
  const alpacaEth = Vault__factory.connect(config.Vault.AlpacaEth, (await ethers.getSigners())[0]);
  const alpacaBnb = Vault__factory.connect(config.Vault.AlpacaWbnb, (await ethers.getSigners())[0]);
  const alpacaBusd = Vault__factory.connect(config.Vault.AlpacaBusd, (await ethers.getSigners())[0]);
  const alpacaUsdt = Vault__factory.connect(config.Vault.AlpacaUsdt, (await ethers.getSigners())[0]);
  const alpacaAlpaca = Vault__factory.connect(config.Vault.AlpacaAlpaca, (await ethers.getSigners())[0]);
  const pancakeCake = Vault__factory.connect(config.Vault.PancakeCake, (await ethers.getSigners())[0]);
  const playBnb = Vault__factory.connect(config.Vault.PlayBnb, (await ethers.getSigners())[0]);
  const eventBunny = Vault__factory.connect(config.Vault.EventBunny, (await ethers.getSigners())[0]);

  console.log(">> Setting withdraw fee");
  (await play.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await alpacaBtcb.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await alpacaEth.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await alpacaBnb.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await alpacaBusd.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await alpacaUsdt.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await alpacaAlpaca.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await pancakeCake.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await playBnb.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  (await eventBunny.setWithdrawFee(ethers.utils.parseEther('1'), { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['s004'];