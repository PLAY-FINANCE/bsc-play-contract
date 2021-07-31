import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';
import { MockERC20__factory, MockAlpacaVault__factory, MockAlpacaFairLaunch__factory } from '../typechain';
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

  const btcb = MockERC20__factory.connect(config.Tokens.BTCB, (await ethers.getSigners())[0]);
  const eth = MockERC20__factory.connect(config.Tokens.ETH, (await ethers.getSigners())[0]);
  const wbnb = MockERC20__factory.connect(config.Tokens.WBNB, (await ethers.getSigners())[0]);
  const busd = MockERC20__factory.connect(config.Tokens.BUSD, (await ethers.getSigners())[0]);
  const usdt = MockERC20__factory.connect(config.Tokens.USDT, (await ethers.getSigners())[0]);
  const alpaca = MockERC20__factory.connect(config.Tokens.ALPACA, (await ethers.getSigners())[0]);

  const btcbVault = MockAlpacaVault__factory.connect(config.Alpaca.BTCBVault, (await ethers.getSigners())[0]);
  const ethVault = MockAlpacaVault__factory.connect(config.Alpaca.ETHVault, (await ethers.getSigners())[0]);
  const bnbVault = MockAlpacaVault__factory.connect(config.Alpaca.BNBVault, (await ethers.getSigners())[0]);
  const busdVault = MockAlpacaVault__factory.connect(config.Alpaca.BUSDVault, (await ethers.getSigners())[0]);
  const usdtVault = MockAlpacaVault__factory.connect(config.Alpaca.USDTVault, (await ethers.getSigners())[0]);
  const alpacaVault = MockAlpacaVault__factory.connect(config.Alpaca.ALPACAVault, (await ethers.getSigners())[0]);

  const ibBtcb = MockERC20__factory.connect(config.Alpaca.BTCBVault, (await ethers.getSigners())[0]);
  const ibEth = MockERC20__factory.connect(config.Alpaca.ETHVault, (await ethers.getSigners())[0]);
  const ibWbnb = MockERC20__factory.connect(config.Alpaca.BNBVault, (await ethers.getSigners())[0]);
  const ibBusd = MockERC20__factory.connect(config.Alpaca.BUSDVault, (await ethers.getSigners())[0]);
  const ibUsdt = MockERC20__factory.connect(config.Alpaca.USDTVault, (await ethers.getSigners())[0]);
  const ibAlpaca = MockERC20__factory.connect(config.Alpaca.ALPACAVault, (await ethers.getSigners())[0]);
  
  const fairLaunch = MockAlpacaFairLaunch__factory.connect(config.Alpaca.AlpacaFairLaunch, (await ethers.getSigners())[0]);

  console.log(">> Deposit/Withdraw BTCB");
  const btcbBalance = await btcb.balanceOf((await ethers.getSigners())[0].address);
  (await btcb.approve(config.Alpaca.BTCBVault, btcbBalance)).wait();
  (await btcbVault.deposit(btcbBalance, { gasLimit: '1000000' })).wait();
  const ibBtcbBalance = await ibBtcb.balanceOf((await ethers.getSigners())[0].address);
  (await ibBtcb.approve(config.Alpaca.AlpacaFairLaunch, ibBtcbBalance)).wait();
  (await fairLaunch.deposit((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.BTCBVault, ibBtcbBalance, { gasLimit: '1000000' })).wait();
  const ibBtcbDeposited = (await fairLaunch.userInfo(config.Alpaca.PoolIds.BTCBVault, (await ethers.getSigners())[0].address)).amount;
  (await fairLaunch.withdraw((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.BTCBVault, ibBtcbDeposited, { gasLimit: '1000000' })).wait();
  const ibBtcbBalance2 = await ibBtcb.balanceOf((await ethers.getSigners())[0].address);
  (await btcbVault.withdraw(ibBtcbBalance2, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
  
  console.log(">> Deposit/Withdraw ETH");
  const ethBalance = await eth.balanceOf((await ethers.getSigners())[0].address);
  (await eth.approve(config.Alpaca.ETHVault, ethBalance)).wait();
  (await ethVault.deposit(ethBalance, { gasLimit: '1000000' })).wait();
  const ibEthBalance = await ibEth.balanceOf((await ethers.getSigners())[0].address);
  (await ibEth.approve(config.Alpaca.AlpacaFairLaunch, ibEthBalance)).wait();
  (await fairLaunch.deposit((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.ETHVault, ibEthBalance, { gasLimit: '1000000' })).wait();
  const ibEthbDeposited = (await fairLaunch.userInfo(config.Alpaca.PoolIds.ETHVault, (await ethers.getSigners())[0].address)).amount;
  (await fairLaunch.withdraw((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.ETHVault, ibEthbDeposited, { gasLimit: '1000000' })).wait();
  const ibEthBalance2 = await ibEth.balanceOf((await ethers.getSigners())[0].address);
  (await ethVault.withdraw(ibEthBalance2, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Deposit/Withdraw BNB");
  (await bnbVault.deposit(ethers.utils.parseEther("0.001"), { value: ethers.utils.parseEther("0.001"), gasLimit: '1000000' })).wait();
  const ibWbnbBalance = await ibWbnb.balanceOf((await ethers.getSigners())[0].address);
  (await ibWbnb.approve(config.Alpaca.AlpacaFairLaunch, ibWbnbBalance)).wait();
  (await fairLaunch.deposit((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.BNBVault, ibWbnbBalance, { gasLimit: '1000000' })).wait();
  const ibWbnbDeposited = (await fairLaunch.userInfo(config.Alpaca.PoolIds.BNBVault, (await ethers.getSigners())[0].address)).amount;
  (await fairLaunch.withdraw((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.BNBVault, ibWbnbDeposited, { gasLimit: '1000000' })).wait();
  const ibWbnbBalance2 = await ibWbnb.balanceOf((await ethers.getSigners())[0].address);
  (await bnbVault.withdraw(ibWbnbBalance2, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Deposit/Withdraw BUSD");
  const busdBalance = await busd.balanceOf((await ethers.getSigners())[0].address);
  (await busd.approve(config.Alpaca.BUSDVault, busdBalance)).wait();
  (await busdVault.deposit(busdBalance, { gasLimit: '1000000' })).wait();
  const ibBusdBalance = await ibBusd.balanceOf((await ethers.getSigners())[0].address);
  (await ibBusd.approve(config.Alpaca.AlpacaFairLaunch, ibBusdBalance)).wait();
  (await fairLaunch.deposit((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.BUSDVault, ibBusdBalance, { gasLimit: '1000000' })).wait();
  const ibBusdDeposited = (await fairLaunch.userInfo(config.Alpaca.PoolIds.BUSDVault, (await ethers.getSigners())[0].address)).amount;
  (await fairLaunch.withdraw((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.BUSDVault, ibBusdDeposited, { gasLimit: '1000000' })).wait();
  const ibBusdBalance2 = await ibBusd.balanceOf((await ethers.getSigners())[0].address);
  (await busdVault.withdraw(ibBusdBalance2, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Deposit/Withdraw USDT");
  const usdtBalance = await usdt.balanceOf((await ethers.getSigners())[0].address);
  (await usdt.approve(config.Alpaca.USDTVault, usdtBalance)).wait();
  (await usdtVault.deposit(usdtBalance, { gasLimit: '1000000' })).wait();
  const ibUsdtBalance = await ibUsdt.balanceOf((await ethers.getSigners())[0].address);
  (await ibUsdt.approve(config.Alpaca.AlpacaFairLaunch, ibUsdtBalance)).wait();
  (await fairLaunch.deposit((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.USDTVault, ibUsdtBalance, { gasLimit: '1000000' })).wait();
  const ibUsdtDeposited = (await fairLaunch.userInfo(config.Alpaca.PoolIds.USDTVault, (await ethers.getSigners())[0].address)).amount;
  (await fairLaunch.withdraw((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.USDTVault, ibUsdtDeposited, { gasLimit: '1000000' })).wait();
  const ibUsdtBalance2 = await ibUsdt.balanceOf((await ethers.getSigners())[0].address);
  (await usdtVault.withdraw(ibUsdtBalance2, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");

  console.log(">> Deposit/Withdraw ALPACA");
  const alpacaBalance = await alpaca.balanceOf((await ethers.getSigners())[0].address);
  (await alpaca.approve(config.Alpaca.ALPACAVault, alpacaBalance)).wait();
  (await alpacaVault.deposit(alpacaBalance, { gasLimit: '1000000' })).wait();
  const ibAlpacaBalance = await ibAlpaca.balanceOf((await ethers.getSigners())[0].address);
  (await ibAlpaca.approve(config.Alpaca.AlpacaFairLaunch, ibAlpacaBalance)).wait();
  (await fairLaunch.deposit((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.ALPACAVault, ibAlpacaBalance, { gasLimit: '1000000' })).wait();
  const ibAlpacaDeposited = (await fairLaunch.userInfo(config.Alpaca.PoolIds.ALPACAVault, (await ethers.getSigners())[0].address)).amount;
  (await fairLaunch.withdraw((await ethers.getSigners())[0].address, config.Alpaca.PoolIds.ALPACAVault, ibAlpacaDeposited, { gasLimit: '1000000' })).wait();
  const ibAlpacaBalance2 = await ibAlpaca.balanceOf((await ethers.getSigners())[0].address);
  (await alpacaVault.withdraw(ibAlpacaBalance2, { gasLimit: '1000000' })).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ["s011"];