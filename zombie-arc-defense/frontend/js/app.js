/**
 * App glue: wires DOM events to Wallet + ZombieGame.
 *
 * Note about scoring: in this reference build we sign the score *locally* in
 * the browser using a key the player pastes ONLY for testnet demo purposes.
 * In production, you would post the score to a server you control which holds
 * the signer key, and return a signature. Never ship a real signer key in a
 * web bundle.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const log = (msg, cls = "") => {
    const el = $("log");
    const line = document.createElement("div");
    line.className = cls;
    line.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  };

  let canvas = $("game");
  let game = new window.ZombieGame(canvas);
  let currentRunId = null;
  let lastScore = 0;
  let lastSignature = null;
  let connected = false;

  // ---------- UI helpers ----------
  function setOverlay(title, msg, hidden = false) {
    $("overlayTitle").textContent = title;
    $("overlayMsg").textContent = msg;
    $("overlay").classList.toggle("hidden", hidden);
  }

  function setHud({ wave, score, baseHp, heroes }) {
    if (wave !== undefined) $("hudWave").textContent = wave;
    if (score !== undefined) $("hudScore").textContent = score;
    if (baseHp !== undefined) $("hudHp").textContent = baseHp;
    if (heroes !== undefined) $("hudHeroes").textContent = heroes;
  }

  game.onTick = setHud;
  game.onEnd = onRunEnded;

  // ---------- Wallet flows ----------
  $("btnConnect").addEventListener("click", async () => {
    try {
      const r = await window.Wallet.connect();
      connected = true;
      $("netInfo").textContent = `Arc Testnet · ${r.account.slice(0, 6)}…${r.account.slice(-4)}`;
      $("btnConnect").textContent = "Connected";
      $("btnConnect").disabled = true;
      log(`Connected: ${r.account}`, "ok");
      if (!r.hasContracts) {
        log("Contracts not deployed yet — running in demo mode.", "err");
      }
      await refreshBalances();
      setOverlay("Ready", "Claim a hero, then press Start Run.");
    } catch (e) {
      log("Connect failed: " + e.message, "err");
    }
  });

  $("btnStarter").addEventListener("click", async () => {
    if (!connected) return log("Connect wallet first.", "err");
    if (!window.Wallet.hasContracts) return log("Contracts not deployed.", "err");
    try {
      log("Claiming free starter hero…");
      const rec = await window.Wallet.claimStarter();
      log(`Starter minted. Tx: ${rec.hash}`, "ok");
      await refreshBalances();
    } catch (e) { log("Mint failed: " + (e.shortMessage || e.message), "err"); }
  });

  document.querySelectorAll("button.buy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tier = Number(btn.dataset.tier);
      if (!connected) return log("Connect wallet first.", "err");
      try {
        log(`Buying tier ${tier} hero (USDC approval may be required)…`);
        const rec = await window.Wallet.buyHero(tier);
        log(`Tier ${tier} hero minted. Tx: ${rec.hash}`, "ok");
        await refreshBalances();
      } catch (e) { log("Buy failed: " + (e.shortMessage || e.message), "err"); }
    });
  });

  $("btnStart").addEventListener("click", async () => {
    if (!connected) return log("Connect wallet first.", "err");
    let tiers = [];
    try {
      if (window.Wallet.hasContracts) {
        currentRunId = await window.Wallet.startRun();
        log(`Run started on chain. runId=${currentRunId}`, "ok");
        // Read player heroes from chain
        const heroAbi = await (await fetch("abi/ZombieHero.json")).json();
        const dep = window.ARC_DEPLOYMENT.contracts;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const heroR = new ethers.Contract(dep.ZombieHero, heroAbi, provider);
        const [, t] = await heroR.heroesOf(window.Wallet.account);
        tiers = t.map((x) => Number(x));
      } else {
        // demo: 4 tier-1 heroes
        currentRunId = "0x" + "00".repeat(32);
        tiers = [1, 1, 1, 1];
        log("Demo mode: spawning 4 tier-1 heroes.");
      }
    } catch (e) {
      return log("Start failed: " + (e.shortMessage || e.message), "err");
    }
    if (!tiers.length) return log("You don't own any hero NFTs yet.", "err");
    game.reset();
    game.setHeroes(tiers);
    setOverlay("", "", true);
    game.start();
    $("btnClaim").disabled = true;
  });

  $("btnClaim").addEventListener("click", async () => {
    if (!currentRunId || !lastSignature) return log("Nothing to claim.", "err");
    try {
      log("Submitting on-chain claim…");
      const rec = await window.Wallet.claimRewards(currentRunId, lastScore, lastSignature);
      log(`Claimed! Tx: ${rec.hash}`, "ok");
      $("btnClaim").disabled = true;
      lastSignature = null;
      await refreshBalances();
    } catch (e) { log("Claim failed: " + (e.shortMessage || e.message), "err"); }
  });

  // ---------- End-of-run handler ----------
  async function onRunEnded(score) {
    lastScore = score;
    setOverlay("Game Over", `Final score: ${score}. Sign your score to claim ZMB.`);
    log(`Run ended. Score=${score}.`);

    if (!window.Wallet.hasContracts) {
      log("Demo mode: no on-chain claim available.", "err");
      return;
    }

    // For testnet demos we ask the player to paste the signer's key locally.
    // In production this step happens server-side.
    const pk = window.prompt(
      "TESTNET DEMO ONLY: paste the SCORE_SIGNER private key to sign your score.\n" +
      "In production this is done by your backend, never in the browser."
    );
    if (!pk) return log("Sign skipped.", "err");
    try {
      const wallet = new ethers.Wallet(pk);
      const dep = window.ARC_DEPLOYMENT;
      const packed = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "address", "uint256"],
        [window.Wallet.account, currentRunId, BigInt(score),
          dep.contracts.ZombieGame, BigInt(dep.chainId)]
      );
      lastSignature = await wallet.signMessage(ethers.getBytes(packed));
      log("Score signed locally. Press Claim ZMB.", "ok");
      $("btnClaim").disabled = false;
    } catch (e) { log("Signing failed: " + e.message, "err"); }
  }

  async function refreshBalances() {
    try {
      const b = await window.Wallet.getBalances();
      $("balUSDC").textContent = window.Wallet.hasContracts && b.usdc
        ? Number(ethers.formatUnits(b.usdc, 6)).toFixed(2)
        : "n/a";
      $("balZMB").textContent = b.zmb ? Number(ethers.formatUnits(b.zmb, 18)).toFixed(2) : "0";
      $("balHero").textContent = b.heroes?.toString() || "0";
    } catch (e) { /* ignore */ }
  }

  // First paint
  setHud({ wave: 0, score: 0, baseHp: 100, heroes: 0 });
})();
