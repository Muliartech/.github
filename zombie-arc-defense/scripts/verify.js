/**
 * Verifies the three contracts on Arcscan. Reads addresses from
 * deployments/arcTestnet.json so you don't have to type them.
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const file = path.join(__dirname, "..", "deployments", "arcTestnet.json");
  if (!fs.existsSync(file)) {
    throw new Error("deployments/arcTestnet.json not found. Run deploy first.");
  }
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log("Verifying ZombieCoin ...");
  await safeVerify(dep.contracts.ZombieCoin, [dep.deployer]);

  console.log("Verifying ZombieHero ...");
  await safeVerify(dep.contracts.ZombieHero, [
    dep.deployer,
    dep.contracts.USDC || "0x0000000000000000000000000000000000000001",
    dep.treasury,
    process.env.HERO_BASE_URI || "https://example.com/hero/",
  ]);

  console.log("Verifying ZombieGame ...");
  await safeVerify(dep.contracts.ZombieGame, [
    dep.deployer,
    dep.contracts.ZombieCoin,
    dep.contracts.ZombieHero,
    dep.scoreSigner,
  ]);
}

async function safeVerify(address, args) {
  try {
    await hre.run("verify:verify", { address, constructorArguments: args });
  } catch (e) {
    console.warn("  skip:", e.message.split("\n")[0]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
