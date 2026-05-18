/* global ethers */
/**
 * Wallet + contract bindings for Arc Testnet.
 * Exposes window.Wallet with methods used by app.js.
 */
(function () {
  const ARC = {
    chainId: 5042002,
    chainIdHex: "0x" + (5042002).toString(16),
    name: "Arc Testnet",
    rpc: "https://rpc.testnet.arc.network",
    explorer: "https://testnet.arcscan.app",
    // Arc uses USDC as native gas (18 decimals on Arc).
    nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  };

  let provider, signer, account;
  let coin, hero, game, usdc;

  async function loadAbi(name) {
    const r = await fetch(`abi/${name}.json`, { cache: "no-store" });
    if (!r.ok) throw new Error(`Missing ABI: ${name}. Did you run \`npm run deploy:arc\`?`);
    return await r.json();
  }

  async function ensureArcNetwork() {
    if (!window.ethereum) throw new Error("No injected wallet found. Install MetaMask.");
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC.chainIdHex }],
      });
    } catch (err) {
      // 4902 = chain not added yet
      if (err && (err.code === 4902 || /Unrecognized chain/i.test(err.message || ""))) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: ARC.chainIdHex,
            chainName: ARC.name,
            nativeCurrency: ARC.nativeCurrency,
            rpcUrls: [ARC.rpc],
            blockExplorerUrls: [ARC.explorer],
          }],
        });
      } else {
        throw err;
      }
    }
  }

  async function connect() {
    await ensureArcNetwork();
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();

    const dep = window.ARC_DEPLOYMENT?.contracts || {};
    if (dep.ZombieCoin && dep.ZombieHero && dep.ZombieGame) {
      const [coinAbi, heroAbi, gameAbi, usdcAbi] = await Promise.all([
        loadAbi("ZombieCoin"),
        loadAbi("ZombieHero"),
        loadAbi("ZombieGame"),
        loadAbi("USDC"),
      ]);
      coin = new ethers.Contract(dep.ZombieCoin, coinAbi, signer);
      hero = new ethers.Contract(dep.ZombieHero, heroAbi, signer);
      game = new ethers.Contract(dep.ZombieGame, gameAbi, signer);
      if (dep.USDC && dep.USDC !== ethers.ZeroAddress) {
        usdc = new ethers.Contract(dep.USDC, usdcAbi, signer);
      }
    }
    return { account, hasContracts: !!coin };
  }

  async function getBalances() {
    if (!account) return { usdc: 0n, zmb: 0n, heroes: 0n, gas: 0n };
    const gasBal = await provider.getBalance(account);
    const out = { gas: gasBal, usdc: 0n, zmb: 0n, heroes: 0n };
    if (usdc) {
      try { out.usdc = await usdc.balanceOf(account); } catch (_) {}
    }
    if (coin) out.zmb = await coin.balanceOf(account);
    if (hero) out.heroes = await hero.balanceOf(account);
    return out;
  }

  async function claimStarter() {
    if (!hero) throw new Error("Contracts not deployed yet.");
    const tx = await hero.claimStarter();
    return await tx.wait();
  }

  async function buyHero(tier) {
    if (!hero) throw new Error("Contracts not deployed yet.");
    if (!usdc) throw new Error("USDC contract not configured. Set USDC_ADDRESS in .env and redeploy.");
    const prices = { 1: 1_000_000n, 2: 5_000_000n, 3: 20_000_000n };
    const price = prices[tier];
    const heroAddr = await hero.getAddress();
    const allowance = await usdc.allowance(account, heroAddr);
    if (allowance < price) {
      const txA = await usdc.approve(heroAddr, price);
      await txA.wait();
    }
    const tx = await hero.buyHero(tier);
    return await tx.wait();
  }

  async function startRun() {
    if (!game) throw new Error("Contracts not deployed yet.");
    const tx = await game.startRun();
    const receipt = await tx.wait();
    // Extract runId from RunStarted event
    const ev = receipt.logs
      .map((l) => { try { return game.interface.parseLog(l); } catch { return null; } })
      .find((l) => l && l.name === "RunStarted");
    return ev?.args?.runId;
  }

  async function claimRewards(runId, score, signature) {
    if (!game) throw new Error("Contracts not deployed yet.");
    const tx = await game.claimRewards(runId, score, signature);
    return await tx.wait();
  }

  function explorer(tx) { return `${ARC.explorer}/tx/${tx}`; }

  window.Wallet = {
    connect, getBalances,
    claimStarter, buyHero,
    startRun, claimRewards,
    explorer,
    get account() { return account; },
    get hasContracts() { return !!coin && !!hero && !!game; },
    ARC,
  };
})();
