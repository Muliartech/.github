import { WalletManager } from "./wallet.js";
import { GameManager } from "./game.js";
import { CONTRACT_ADDRESS, EXPLORER_URL, FAUCET_URL } from "./config.js";

// Global state
let wallet = null;
let game = null;
let isTapping = false;

// DOM Elements
const elements = {};

function cacheDOMElements() {
  elements.connectBtn = document.getElementById("connect-btn");
  elements.walletInfo = document.getElementById("wallet-info");
  elements.walletAddress = document.getElementById("wallet-address");
  elements.usdcBalance = document.getElementById("usdc-balance");
  elements.gameSection = document.getElementById("game-section");
  elements.preConnect = document.getElementById("pre-connect");
  elements.tapBtn = document.getElementById("tap-btn");
  elements.tapReward = document.getElementById("tap-reward");
  elements.cooldownBar = document.getElementById("cooldown-bar");
  elements.cooldownText = document.getElementById("cooldown-text");
  elements.tokenBalance = document.getElementById("token-balance");
  elements.totalTaps = document.getElementById("total-taps");
  elements.totalEarned = document.getElementById("total-earned");
  elements.dailyTaps = document.getElementById("daily-taps");
  elements.dailyLimit = document.getElementById("daily-limit");
  elements.referralEarnings = document.getElementById("referral-earnings");
  elements.referralLink = document.getElementById("referral-link");
  elements.copyRefBtn = document.getElementById("copy-ref-btn");
  elements.leaderboardBody = document.getElementById("leaderboard-body");
  elements.totalPlayers = document.getElementById("total-players");
  elements.totalSupply = document.getElementById("total-supply");
  elements.rewardRate = document.getElementById("reward-rate");
  elements.notification = document.getElementById("notification");
  elements.txStatus = document.getElementById("tx-status");
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  cacheDOMElements();
  setupEventListeners();
  checkReferralParam();
});

function setupEventListeners() {
  elements.connectBtn.addEventListener("click", connectWallet);
  elements.tapBtn.addEventListener("click", handleTap);
  elements.copyRefBtn.addEventListener("click", copyReferralLink);

  window.addEventListener("walletChanged", async () => {
    await initializeGame();
  });

  window.addEventListener("walletDisconnected", () => {
    showPreConnect();
  });

  window.addEventListener("cooldownTick", updateCooldownUI);
}

async function connectWallet() {
  try {
    elements.connectBtn.textContent = "Connecting...";
    elements.connectBtn.disabled = true;

    wallet = new WalletManager();
    await wallet.connect();

    elements.walletAddress.textContent = wallet.shortenAddress(wallet.address);
    const balance = await wallet.getBalance();
    elements.usdcBalance.textContent = `${parseFloat(balance).toFixed(4)} USDC`;

    elements.walletInfo.classList.remove("hidden");
    elements.connectBtn.textContent = "Connected";

    await initializeGame();
  } catch (error) {
    showNotification(error.message, "error");
    elements.connectBtn.textContent = "Connect Wallet";
    elements.connectBtn.disabled = false;
  }
}

async function initializeGame() {
  try {
    game = new GameManager(wallet);
    await game.initialize();

    // Check for pending referral
    const pendingRef = sessionStorage.getItem("pendingReferral");
    if (pendingRef && game.playerStats && game.playerStats.totalTaps === 0) {
      try {
        await game.registerReferral(pendingRef);
        showNotification("Referral registered! Your referrer gets 5% bonus.", "success");
        sessionStorage.removeItem("pendingReferral");
      } catch (e) {
        console.log("Referral registration skipped:", e.message);
      }
    }

    showGameUI();
    updateStatsUI();
    await updateLeaderboard();
  } catch (error) {
    showNotification("Failed to initialize game: " + error.message, "error");
  }
}

async function handleTap() {
  if (isTapping || !game) return;

  const cooldown = game.getCooldownRemaining();
  if (cooldown > 0) {
    showNotification(`Cooldown: ${cooldown}s remaining`, "warning");
    return;
  }

  isTapping = true;
  elements.tapBtn.classList.add("tapping");
  elements.tapBtn.disabled = true;

  try {
    showTxStatus("Sending tap transaction...");
    const tx = await game.tap();

    showTxStatus(
      `<a href="${game.getExplorerLink(tx.hash)}" target="_blank">Tx sent! Waiting for confirmation...</a>`
    );

    await tx.wait();

    // Show reward animation
    showRewardAnimation();

    showTxStatus(
      `<a href="${game.getExplorerLink(tx.hash)}" target="_blank">Tap confirmed! +${game.globalStats.rewardPerTap} ARCLOOT</a>`
    );

    showNotification(`+${game.globalStats.rewardPerTap} ARCLOOT earned!`, "success");

    // Refresh stats
    await game.refreshStats();
    updateStatsUI();

    // Update USDC balance (gas was spent)
    const balance = await wallet.getBalance();
    elements.usdcBalance.textContent = `${parseFloat(balance).toFixed(4)} USDC`;
  } catch (error) {
    showNotification(error.message, "error");
    hideTxStatus();
  } finally {
    isTapping = false;
    elements.tapBtn.classList.remove("tapping");
    elements.tapBtn.disabled = false;
  }
}

function showRewardAnimation() {
  elements.tapReward.classList.add("show");
  setTimeout(() => {
    elements.tapReward.classList.remove("show");
  }, 1500);
}

function updateStatsUI() {
  if (!game || !game.playerStats) return;

  const stats = game.playerStats;
  const global = game.globalStats;

  elements.tokenBalance.textContent = parseFloat(stats.balance).toFixed(2);
  elements.totalTaps.textContent = stats.totalTaps.toLocaleString();
  elements.totalEarned.textContent = parseFloat(stats.totalEarned).toFixed(2);
  elements.dailyTaps.textContent = stats.dailyTaps;
  elements.dailyLimit.textContent = global.dailyLimit;
  elements.referralEarnings.textContent = parseFloat(stats.referralEarnings).toFixed(2);

  // Global stats
  elements.totalPlayers.textContent = global.totalPlayers.toLocaleString();
  elements.totalSupply.textContent = parseFloat(global.totalSupply).toFixed(0);
  elements.rewardRate.textContent = global.rewardPerTap;

  // Referral link
  elements.referralLink.value = game.getReferralLink();
}

function updateCooldownUI() {
  if (!game) return;

  const cooldown = game.getCooldownRemaining();
  const maxCooldown = 5;
  const progress = ((maxCooldown - cooldown) / maxCooldown) * 100;

  elements.cooldownBar.style.width = `${progress}%`;

  if (cooldown > 0) {
    elements.cooldownText.textContent = `${cooldown}s`;
    elements.tapBtn.classList.add("on-cooldown");
  } else {
    elements.cooldownText.textContent = "Ready!";
    elements.tapBtn.classList.remove("on-cooldown");
  }
}

async function updateLeaderboard() {
  if (!game) return;

  const leaders = await game.getLeaderboard(10);
  elements.leaderboardBody.innerHTML = "";

  if (leaders.length === 0) {
    elements.leaderboardBody.innerHTML = `
      <tr><td colspan="3" style="text-align:center; opacity:0.6;">No players yet. Be the first!</td></tr>
    `;
    return;
  }

  leaders.forEach((player, index) => {
    const row = document.createElement("tr");
    const isYou = player.address.toLowerCase() === wallet.address.toLowerCase();
    row.className = isYou ? "highlight-row" : "";

    const medals = ["&#x1F947;", "&#x1F948;", "&#x1F949;"];
    const rank = index < 3 ? medals[index] : `#${index + 1}`;

    row.innerHTML = `
      <td>${rank}</td>
      <td>
        <a href="${EXPLORER_URL}/address/${player.address}" target="_blank">
          ${wallet.shortenAddress(player.address)}${isYou ? " (You)" : ""}
        </a>
      </td>
      <td>${parseFloat(player.earnings).toFixed(0)} ARCLOOT</td>
    `;
    elements.leaderboardBody.appendChild(row);
  });
}

function copyReferralLink() {
  const link = elements.referralLink.value;
  navigator.clipboard.writeText(link).then(() => {
    showNotification("Referral link copied!", "success");
    elements.copyRefBtn.textContent = "Copied!";
    setTimeout(() => {
      elements.copyRefBtn.textContent = "Copy";
    }, 2000);
  });
}

function checkReferralParam() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ethers.isAddress(ref)) {
    sessionStorage.setItem("pendingReferral", ref);
    showNotification("Referral detected! Connect wallet to activate.", "info");
  }
}

function showGameUI() {
  elements.preConnect.classList.add("hidden");
  elements.gameSection.classList.remove("hidden");
}

function showPreConnect() {
  elements.preConnect.classList.remove("hidden");
  elements.gameSection.classList.add("hidden");
}

function showNotification(message, type = "info") {
  elements.notification.textContent = message;
  elements.notification.className = `notification show ${type}`;
  setTimeout(() => {
    elements.notification.className = "notification";
  }, 4000);
}

function showTxStatus(html) {
  elements.txStatus.innerHTML = html;
  elements.txStatus.classList.remove("hidden");
}

function hideTxStatus() {
  elements.txStatus.classList.add("hidden");
}
