// ArcLoot Game Configuration
// Update CONTRACT_ADDRESS after deploying to Arc Testnet
export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

export const NETWORK_CONFIG = {
  chainId: "0x4CE4F2", // 5042002 in hex
  chainName: "Arc Testnet",
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
};

export const CHAIN_ID = 5042002;
export const EXPLORER_URL = "https://testnet.arcscan.app";
export const FAUCET_URL = "https://faucets.chain.link/arc-testnet";
