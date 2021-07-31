import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { StrategyAlpaca__factory, StrategyPancake__factory } from '../typechain';
import MainnetConfig from '../.mainnet.json';
import TestnetConfig from '../.testnet.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
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














  console.log(">> Deploying Vault contracts");

  console.log(">> Deploying a VaultPancakeStrategyCake contract");
  const vaultPancakeStrategyCake = await deploy('VaultPancakeStrategyCake', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.Tokens.CAKE,
      config.Strategy.StrategyPancakeCake,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayCakeToken",
      "pCAKE",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a VaultAlpacaStrategyBtcb contract");
  const vaultAlpacaStrategyBtcb = await deploy('VaultAlpacaStrategyBtcb', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.Tokens.BTCB,
      config.Strategy.StrategyAlpacaBtcb,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayBtcbToken",
      "pBTCB",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a VaultAlpacaStrategyEth contract");
  const vaultAlpacaStrategyEth = await deploy('VaultAlpacaStrategyEth', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.Tokens.ETH,
      config.Strategy.StrategyAlpacaEth,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayEthToken",
      "pETH",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a VaultAlpacaStrategyWbnb contract");
  const vaultAlpacaStrategyWbnb = await deploy('VaultAlpacaStrategyWbnb', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.Tokens.WBNB,
      config.Strategy.StrategyAlpacaWbnb,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayWbnbToken",
      "pWBNB",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a VaultAlpacaStrategyBusd contract");
  const vaultAlpacaStrategyBusd = await deploy('VaultAlpacaStrategyBusd', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.Tokens.BUSD,
      config.Strategy.StrategyAlpacaBusd,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayBusdToken",
      "pBUSD",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a VaultAlpacaStrategyUsdt contract");
  const vaultAlpacaStrategyUsdt = await deploy('VaultAlpacaStrategyUsdt', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.Tokens.USDT,
      config.Strategy.StrategyAlpacaUsdt,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayUsdtToken",
      "pUSDT",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a VaultAlpacaStrategyAlpaca contract");
  const vaultAlpacaStrategyAlpaca = await deploy('VaultAlpacaStrategyAlpaca', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.Tokens.ALPACA,
      config.Strategy.StrategyAlpacaAlpaca,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayAlpacaToken",
      "pALPACA",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a VaultWithoutStrategyPlay contract");

  await deploy('VaultWithoutStrategyPlay', {
    from: deployer,
    args: [
      config.PlayDistributor,
      config.Tokens.PLAY,
      ethers.constants.AddressZero,
      config.Lottery,
      config.Funds.PlayToTheMoon,
      config.Funds.SAFU,
      config.Funds.Operator,
      config.Config,
      config.Tokens.PLAY,
      "PlayPlayToken",
      "pPLAY",
      18
    ],
    contract: 'Vault',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");
  
  const strategyPancakeCakeAsDeployer = StrategyPancake__factory.connect(config.Strategy.StrategyPancakeCake, (await ethers.getSigners())[0]); 
  const strategyAlpacaBtcbAsDeployer = StrategyAlpaca__factory.connect(config.Strategy.StrategyAlpacaBtcb, (await ethers.getSigners())[0]); 
  const strategyAlpacaEthAsDeployer = StrategyAlpaca__factory.connect(config.Strategy.StrategyAlpacaEth, (await ethers.getSigners())[0]); 
  const strategyAlpacaWbnbAsDeployer = StrategyAlpaca__factory.connect(config.Strategy.StrategyAlpacaWbnb, (await ethers.getSigners())[0]); 
  const strategyAlpacaBusdAsDeployer = StrategyAlpaca__factory.connect(config.Strategy.StrategyAlpacaBusd, (await ethers.getSigners())[0]);
  const strategyAlpacaUsdtAsDeployer = StrategyAlpaca__factory.connect(config.Strategy.StrategyAlpacaUsdt, (await ethers.getSigners())[0]); 
  const strategyAlpacaAlpacaAsDeployer = StrategyAlpaca__factory.connect(config.Strategy.StrategyAlpacaAlpaca, (await ethers.getSigners())[0]);

  console.log(">> Transferring ownership of StrategyPancakeCake from deployer to VaultPancakeStrategyCake");
  (await strategyPancakeCakeAsDeployer.transferOwnership(vaultPancakeStrategyCake.address)).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of StrategyAlpacaBtcb from deployer to VaultAlpacaStrategyBtcb");
  (await strategyAlpacaBtcbAsDeployer.transferOwnership(vaultAlpacaStrategyBtcb.address)).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of StrategyAlpacaEth from deployer to VaultAlpacaStrategyEth");
  (await strategyAlpacaEthAsDeployer.transferOwnership(vaultAlpacaStrategyEth.address)).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of StrategyAlpacaWbnb from deployer to VaultAlpacaStrategyWbnb");
  (await strategyAlpacaWbnbAsDeployer.transferOwnership(vaultAlpacaStrategyWbnb.address)).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of StrategyAlpacaBusd from deployer to VaultAlpacaStrategyBusd");
  (await strategyAlpacaBusdAsDeployer.transferOwnership(vaultAlpacaStrategyBusd.address)).wait();
  console.log("✅ Done");
  
  console.log(">> Transferring ownership of StrategyAlpacaUsdt from deployer to VaultAlpacaStrategyUsdt");
  (await strategyAlpacaUsdtAsDeployer.transferOwnership(vaultAlpacaStrategyUsdt.address)).wait();
  console.log("✅ Done");

  console.log(">> Transferring ownership of StrategyAlpacaAlpaca from deployer to VaultAlpacaStrategyAlpaca");
  (await strategyAlpacaAlpacaAsDeployer.transferOwnership(vaultAlpacaStrategyAlpaca.address)).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['Vault'];