import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { Lottery__factory } from '../typechain';
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












  const GAME_TYPE = 0;
  const BASIC_MULTIPLIER = 10000;
  const PLAY_MULTIPLIER = 20000;
  const DEFAULT_MULTIPLIER_DENOMINATOR = 10000;
  const START_BLOCK = 9644850;

  const lottery = Lottery__factory.connect(config.Lottery, (await ethers.getSigners())[0]);

  console.log(">> Add vaults");
  (await lottery.addVault(config.Vault.AlpacaBtcb, GAME_TYPE, 5, START_BLOCK, BASIC_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.AlpacaEth, GAME_TYPE, 5, START_BLOCK, BASIC_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.AlpacaWbnb, GAME_TYPE, 20, START_BLOCK, BASIC_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.AlpacaBusd, GAME_TYPE, 10, START_BLOCK, BASIC_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.AlpacaUsdt, GAME_TYPE, 10, START_BLOCK, BASIC_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.AlpacaAlpaca, GAME_TYPE, 5, START_BLOCK, BASIC_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.PancakeCake, GAME_TYPE, 5, START_BLOCK, BASIC_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.Play, GAME_TYPE, 25, START_BLOCK, PLAY_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.Prize0, GAME_TYPE, 0, 0, 0, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.PlayBnb, GAME_TYPE, 10, START_BLOCK, PLAY_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  (await lottery.addVault(config.Vault.EventBunny, GAME_TYPE, 5, START_BLOCK, PLAY_MULTIPLIER, 0, false, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['s007'];