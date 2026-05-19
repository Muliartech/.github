// ArcLoot Contract ABI (minimal interface for frontend)
export const ARC_LOOT_ABI = [
  // Read functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function rewardPerTap() view returns (uint256)",
  "function cooldownTime() view returns (uint256)",
  "function dailyTapLimit() view returns (uint256)",
  "function referralBonus() view returns (uint256)",
  "function totalPlayers() view returns (uint256)",
  "function getPlayerStats(address) view returns (uint256 balance, uint256 totalTaps, uint256 totalEarned, uint256 lastTapTime, uint256 dailyTaps, address referrer, uint256 referralEarnings, uint256 cooldownRemaining)",
  "function getTopPlayers(uint256) view returns (address[] addresses, uint256[] earnings)",

  // Write functions
  "function tap()",
  "function registerReferral(address referrer)",
  "function transfer(address to, uint256 amount) returns (bool)",

  // Events
  "event Tapped(address indexed player, uint256 reward, uint256 totalTaps)",
  "event ReferralRegistered(address indexed player, address indexed referrer)",
  "event ReferralReward(address indexed referrer, address indexed player, uint256 amount)",
];
