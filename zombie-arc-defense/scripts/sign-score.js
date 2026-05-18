/**
 * Demo "backend" signer: signs (player, runId, score, gameAddress, chainId)
 * so the player can claim rewards on-chain.
 *
 * Usage:
 *   node scripts/sign-score.js <player> <runId> <score>
 *
 * In production you would run this on a server you control, behind some
 * anti-cheat checks. For local testing, run it on your own machine using
 * the same private key set as `scoreSigner` at deploy time.
 */
require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const [, , player, runId, scoreStr] = process.argv;
  if (!player || !runId || !scoreStr) {
    console.error("Usage: node scripts/sign-score.js <player> <runId> <score>");
    process.exit(1);
  }

  const dep = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "arcTestnet.json"), "utf8")
  );

  const pk = process.env.SCORE_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(pk);
  console.log("Signing as:", wallet.address);

  const score = BigInt(scoreStr);
  const chainId = BigInt(dep.chainId);
  const game = dep.contracts.ZombieGame;

  const packed = ethers.solidityPackedKeccak256(
    ["address", "bytes32", "uint256", "address", "uint256"],
    [player, runId, score, game, chainId]
  );
  const sig = await wallet.signMessage(ethers.getBytes(packed));
  console.log("\nsignature:", sig);
  console.log("\nUse in front-end: claimRewards(runId, score, signature)");
}

main();
