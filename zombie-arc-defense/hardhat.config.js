require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Arc Testnet (Circle)
 * - RPC URL:   https://rpc.testnet.arc.network
 * - Chain ID:  5042002
 * - Gas token: USDC (18 decimals on Arc)
 * - Explorer:  https://testnet.arcscan.app
 */
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "11".repeat(32); // dummy if missing
const ARC_RPC = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {},
    arcTestnet: {
      url: ARC_RPC,
      chainId: 5042002,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    // Arcscan-compatible verification (Blockscout-style endpoint).
    apiKey: { arcTestnet: process.env.ARCSCAN_API_KEY || "empty" },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app",
        },
      },
    ],
  },
};
