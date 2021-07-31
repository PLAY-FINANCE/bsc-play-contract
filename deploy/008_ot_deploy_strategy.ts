import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
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















  console.log(">> Deploying a StrategyPancakeCake contract");
  await deploy('StrategyPancakeCake', {
    from: deployer,
    args: [
      config.Tokens.CAKE,
      config.Pancakeswap.CakePoolId,
      [config.Tokens.CAKE, config.Tokens.CAKE],
      config.Config,
      config.Tokens.CAKE,
      config.Pancakeswap.MasterChef,
      config.Funds.SAFU
    ],
    contract: 'StrategyPancake',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying StrategyAlpaca contracts");

  console.log(">> Deploying a StrategyAlpacaBtcb contract");
  await deploy('StrategyAlpacaBtcb', {
    from: deployer,
    args: [
      config.Alpaca.BTCBVault,
      config.Tokens.BTCB,
      config.Alpaca.PoolIds.BTCBVault,
      [config.Tokens.ALPACA, config.Tokens.WBNB, config.Tokens.BTCB],
      config.Config,
      config.Tokens.ALPACA,
      config.Alpaca.AlpacaFairLaunch,
      config.Funds.SAFU
    ],
    contract: 'StrategyAlpaca',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a StrategyAlpacaEth contract");
  await deploy('StrategyAlpacaEth', {
    from: deployer,
    args: [
      config.Alpaca.ETHVault,
      config.Tokens.ETH,
      config.Alpaca.PoolIds.ETHVault,
      [config.Tokens.ALPACA, config.Tokens.WBNB, config.Tokens.ETH],
      config.Config,
      config.Tokens.ALPACA,
      config.Alpaca.AlpacaFairLaunch,
      config.Funds.SAFU
    ],
    contract: 'StrategyAlpaca',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a StrategyAlpacaWbnb contract");
  await deploy('StrategyAlpacaWbnb', {
    from: deployer,
    args: [
      config.Alpaca.BNBVault,
      config.Tokens.WBNB,
      config.Alpaca.PoolIds.BNBVault,
      [config.Tokens.ALPACA, config.Tokens.WBNB],
      config.Config,
      config.Tokens.ALPACA,
      config.Alpaca.AlpacaFairLaunch,
      config.Funds.SAFU
    ],
    contract: 'StrategyAlpaca',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a StrategyAlpacaBusd contract");
  await deploy('StrategyAlpacaBusd', {
    from: deployer,
    args: [
      config.Alpaca.BUSDVault,
      config.Tokens.BUSD,
      config.Alpaca.PoolIds.BUSDVault,
      [config.Tokens.ALPACA, config.Tokens.BUSD],
      config.Config,
      config.Tokens.ALPACA,
      config.Alpaca.AlpacaFairLaunch,
      config.Funds.SAFU
    ],
    contract: 'StrategyAlpaca',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a StrategyAlpacaUsdt contract");
  await deploy('StrategyAlpacaUsdt', {
    from: deployer,
    args: [
      config.Alpaca.USDTVault,
      config.Tokens.USDT,
      config.Alpaca.PoolIds.USDTVault,
      [config.Tokens.ALPACA, config.Tokens.BUSD, config.Tokens.USDT],
      config.Config,
      config.Tokens.ALPACA,
      config.Alpaca.AlpacaFairLaunch,
      config.Funds.SAFU
    ],
    contract: 'StrategyAlpaca',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");

  console.log(">> Deploying a StrategyAlpacaAlpaca contract");
  await deploy('StrategyAlpacaAlpaca', {
    from: deployer,
    args: [
      config.Alpaca.ALPACAVault,
      config.Tokens.ALPACA,
      config.Alpaca.PoolIds.ALPACAVault,
      [config.Tokens.ALPACA, config.Tokens.ALPACA],
      config.Config,
      config.Tokens.ALPACA,
      config.Alpaca.AlpacaFairLaunch,
      config.Funds.SAFU
    ],
    contract: 'StrategyAlpaca',
    log: true,
    deterministicDeployment: false,
  });
  console.log("✅ Done");
};

export default func;
func.tags = ['Strategy'];