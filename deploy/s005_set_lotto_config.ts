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
  const TIME_INTERVAL = 1 * 60 * 60 * 24;
  const MAX_NUM = 1000000000;
  const PLAY_TO_THE_MOON_FEE = 0;
  const SAFU_FEE = 100;
  const OPERATOR_FEE = 400;
  const NEXT_LOTTERY_FEE = 500;
  const DENOMINATOR_FEE = 10000;
  const PRIZE_LOCKER = config.LinearRelease.PRIZE0;
  const PRIZE_LOCKUP_BLOCK = 0;

  const lottery = Lottery__factory.connect(config.Lottery, (await ethers.getSigners())[0]);

  console.log(">> Setting new lotto (game type: 0)");
  (await lottery.setLottoConfig(GAME_TYPE, true, TIME_INTERVAL, MAX_NUM, PLAY_TO_THE_MOON_FEE, SAFU_FEE, OPERATOR_FEE, NEXT_LOTTERY_FEE, DENOMINATOR_FEE, PRIZE_LOCKER, PRIZE_LOCKUP_BLOCK)).wait();
  console.log("✅ Done");
};

export default func;
func.tags = ['s005'];