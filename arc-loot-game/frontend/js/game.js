import { CONTRACT_ADDRESS, EXPLORER_URL } from "./config.js";
import { ARC_LOOT_ABI } from "./abi.js";

export class GameManager {
  constructor(walletManager) {
    this.wallet = walletManager;
    this.contract = null;
    this.playerStats = null;
    this.cooldownInterval = null;
  }

  async initialize() {
    if (!this.wallet.signer) {
      throw new Error("Wallet not connected");
    }

    this.contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ARC_LOOT_ABI,
      this.wallet.signer
    );

    await this.refreshStats();
    this.startCooldownTimer();
  }

  async tap() {
    if (!this.contract) throw new Error("Game not initialized");

    try {
      const tx = await this.contract.tap();
      return tx;
    } catch (error) {
      if (error.reason) {
        throw new Error(error.reason);
      }
      if (error.message.includes("Cooldown active")) {
        throw new Error("Cooldown active! Wait before tapping again.");
      }
      if (error.message.includes("Daily limit reached")) {
        throw new Error("Daily limit reached! Come back tomorrow.");
      }
      throw error;
    }
  }

  async registerReferral(referrerAddress) {
    if (!this.contract) throw new Error("Game not initialized");

    try {
      const tx = await this.contract.registerReferral(referrerAddress);
      return tx;
    } catch (error) {
      if (error.reason) throw new Error(error.reason);
      throw error;
    }
  }

  async refreshStats() {
    if (!this.contract || !this.wallet.address) return;

    try {
      const stats = await this.contract.getPlayerStats(this.wallet.address);
      this.playerStats = {
        balance: ethers.formatEther(stats.balance),
        totalTaps: Number(stats.totalTaps),
        totalEarned: ethers.formatEther(stats.totalEarned),
        lastTapTime: Number(stats.lastTapTime),
        dailyTaps: Number(stats.dailyTaps),
        referrer: stats.referrer,
        referralEarnings: ethers.formatEther(stats.referralEarnings),
        cooldownRemaining: Number(stats.cooldownRemaining),
      };

      // Get global stats
      const totalPlayers = await this.contract.totalPlayers();
      const totalSupply = await this.contract.totalSupply();
      const rewardPerTap = await this.contract.rewardPerTap();
      const dailyLimit = await this.contract.dailyTapLimit();

      this.globalStats = {
        totalPlayers: Number(totalPlayers),
        totalSupply: ethers.formatEther(totalSupply),
        rewardPerTap: ethers.formatEther(rewardPerTap),
        dailyLimit: Number(dailyLimit),
      };
    } catch (error) {
      console.error("Failed to refresh stats:", error);
    }
  }

  async getLeaderboard(count = 10) {
    if (!this.contract) return [];

    try {
      const result = await this.contract.getTopPlayers(count);
      const leaderboard = [];
      for (let i = 0; i < result.addresses.length; i++) {
        if (result.addresses[i] !== ethers.ZeroAddress) {
          leaderboard.push({
            address: result.addresses[i],
            earnings: ethers.formatEther(result.earnings[i]),
          });
        }
      }
      return leaderboard;
    } catch (error) {
      console.error("Failed to get leaderboard:", error);
      return [];
    }
  }

  startCooldownTimer() {
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);

    this.cooldownInterval = setInterval(() => {
      window.dispatchEvent(new CustomEvent("cooldownTick"));
    }, 1000);
  }

  getCooldownRemaining() {
    if (!this.playerStats) return 0;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - this.playerStats.lastTapTime;
    const remaining = 5 - elapsed; // 5 second cooldown
    return Math.max(0, remaining);
  }

  getReferralLink() {
    if (!this.wallet.address) return "";
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?ref=${this.wallet.address}`;
  }

  getExplorerLink(txHash) {
    return `${EXPLORER_URL}/tx/${txHash}`;
  }

  destroy() {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }
}
