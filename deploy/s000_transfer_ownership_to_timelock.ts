import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { Vault__factory, Timelock__factory, PriceOracle__factory, Config__factory, Fund__factory, Lottery__factory, PlayDistributor__factory, PrizeVault__factory } from '../typechain';
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














  

  
  const timelock = Timelock__factory.connect(config.Timelock, (await ethers.getSigners())[0]);

  console.log(">> Transferring ownership of PriceOracle from deployer to Timelock");
  const priceOracle = PriceOracle__factory.connect(config.PriceOracle, (await ethers.getSigners())[0]);
  (await priceOracle.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Transferring ownership of Lottery from deployer to Timelock");
  const lottery = Lottery__factory.connect(config.Lottery, (await ethers.getSigners())[0]);
  (await lottery.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Transferring ownership of Config from deployer to Timelock");  
  const configAsDeployer = Config__factory.connect(config.Config, (await ethers.getSigners())[0]);
  (await configAsDeployer.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Transferring ownership of SAFU from deployer to Timelock");  
  const safu = Fund__factory.connect(config.Funds.SAFU, (await ethers.getSigners())[0]);
  (await safu.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Transferring ownership of PlayDistributor from deployer to Timelock");  
  const playDistributor = PlayDistributor__factory.connect(config.PlayDistributor, (await ethers.getSigners())[0]);
  (await playDistributor.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultAlpacaStrategyBtcb from deployer to Timelock");
  const vaultAlpacaStrategyBtcb = Vault__factory.connect(config.Vault.AlpacaBtcb, (await ethers.getSigners())[0]);
  (await vaultAlpacaStrategyBtcb.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultAlpacaStrategyEth from deployer to Timelock");
  const vaultAlpacaStrategyEth = Vault__factory.connect(config.Vault.AlpacaEth, (await ethers.getSigners())[0]);
  (await vaultAlpacaStrategyEth.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultAlpacaStrategyWbnb from deployer to Timelock");
  const vaultAlpacaStrategyWbnb = Vault__factory.connect(config.Vault.AlpacaWbnb, (await ethers.getSigners())[0]);
  (await vaultAlpacaStrategyWbnb.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultAlpacaStrategyBusd from deployer to Timelock");
  const vaultAlpacaStrategyBusd = Vault__factory.connect(config.Vault.AlpacaBusd, (await ethers.getSigners())[0]);
  (await vaultAlpacaStrategyBusd.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultAlpacaStrategyUsdt from deployer to Timelock");
  const vaultAlpacaStrategyUsdt = Vault__factory.connect(config.Vault.AlpacaUsdt, (await ethers.getSigners())[0]);
  (await vaultAlpacaStrategyUsdt.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Transferring ownership of VaultAlpacaStrategyAlpaca from deployer to Timelock");
  const vaultAlpacaStrategyAlpaca = Vault__factory.connect(config.Vault.AlpacaAlpaca, (await ethers.getSigners())[0]);
  (await vaultAlpacaStrategyAlpaca.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultWithoutStrategyPlay from deployer to Timelock");
  const vaultWithoutStrategyPlay = Vault__factory.connect(config.Vault.Play, (await ethers.getSigners())[0]);
  (await vaultWithoutStrategyPlay.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultWithoutStrategyPlayBnb from deployer to Timelock");
  const vaultWithoutStrategyPlayBnb = Vault__factory.connect(config.Vault.PlayBnb, (await ethers.getSigners())[0]);
  (await vaultWithoutStrategyPlayBnb.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultWithoutStrategyBunny from deployer to Timelock");
  const vaultWithoutStrategyBunny = Vault__factory.connect(config.Vault.EventBunny, (await ethers.getSigners())[0]);
  (await vaultWithoutStrategyBunny.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of VaultPancakeStrategyCake from deployer to Timelock");
  const vaultPancakeStrategyCake = Vault__factory.connect(config.Vault.PancakeCake, (await ethers.getSigners())[0]);
  (await vaultPancakeStrategyCake.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Transferring ownership of PrizeVault from deployer to Timelock");  
  const prizeVault = PrizeVault__factory.connect(config.Vault.Prize0, (await ethers.getSigners())[0]);
  (await prizeVault.transferOwnership(timelock.address, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['s000'];