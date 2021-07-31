import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import "@openzeppelin/hardhat-upgrades";

import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-typechain";
import "hardhat-deploy";
import "solidity-coverage";

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
      accounts: [
        {
          privateKey: process.env.LOCAL_PRIVATE_KEY_1,
          balance: '10000000000000000000000',
        },
        {
          privateKey: process.env.LOCAL_PRIVATE_KEY_2,
          balance: '10000000000000000000000',
        },
        {
          privateKey: process.env.LOCAL_PRIVATE_KEY_3,
          balance: '10000000000000000000000',
        },
        {
          privateKey: process.env.LOCAL_PRIVATE_KEY_4,
          balance: '10000000000000000000000',
        },
        {
          privateKey: process.env.LOCAL_PRIVATE_KEY_5,
          balance: '10000000000000000000000',
        },
        {
          privateKey: process.env.LOCAL_PRIVATE_KEY_6,
          balance: '10000000000000000000000',
        },
        {
          privateKey: process.env.LOCAL_PRIVATE_KEY_7,
          balance: '10000000000000000000000',
        },
      ],
    },
    testnet: {
      url: 'https://data-seed-prebsc-1-s3.binance.org:8545',
      accounts: [process.env.BSC_TESTNET_PRIVATE_KEY],
    },
    mainnet: {
      url: 'https://bsc-dataseed2.defibit.io',
      accounts: [process.env.BSC_MAINNET_PRIVATE_KEY],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
          evmVersion: "istanbul",
          outputSelection: {
            "*": {
              "": [
                "ast"
              ],
              "*": [
                "evm.bytecode.object",
                "evm.deployedBytecode.object",
                "abi",
                "evm.bytecode.sourceMap",
                "evm.deployedBytecode.sourceMap",
                "metadata"
              ]
            }
          }
        }
      },
      {
        version: '0.5.16'
      },
      {
        version: '0.8.0'
      }
    ]
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v5',
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.BSC_MAINNET_SCAN_API_KEY
  },
};
