import { NETWORK_CONFIG, CHAIN_ID } from "./config.js";

export class WalletManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.connected = false;
  }

  async connect() {
    if (!window.ethereum) {
      throw new Error(
        "No wallet detected! Please install MetaMask or Rabby wallet."
      );
    }

    try {
      // Request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Check and switch network
      await this.switchToArcTestnet();

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.address = accounts[0];
      this.connected = true;

      // Listen for account/chain changes
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.address = accounts[0];
          window.dispatchEvent(new CustomEvent("walletChanged"));
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });

      return this.address;
    } catch (error) {
      if (error.code === 4001) {
        throw new Error("Connection rejected by user");
      }
      throw error;
    }
  }

  async switchToArcTestnet() {
    const chainIdHex = NETWORK_CONFIG.chainId;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError) {
      // Chain not added yet, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [NETWORK_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  }

  async getBalance() {
    if (!this.provider || !this.address) return "0";
    const balance = await this.provider.getBalance(this.address);
    return ethers.formatEther(balance);
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.connected = false;
    window.dispatchEvent(new CustomEvent("walletDisconnected"));
  }

  shortenAddress(addr) {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
}
