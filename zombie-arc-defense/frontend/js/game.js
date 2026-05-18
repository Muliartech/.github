/**
 * ZombieDefense game engine. Pure HTML5 canvas, no engine library.
 * Heroes stand on the left, zombies spawn from the right and march left.
 * The game.onEnd(score) callback fires once the base falls.
 */
(function () {
  const W = 900, H = 500;
  const LANE_COUNT = 4;
  const LANE_TOP = 70, LANE_BOT = H - 30;
  const LANE_H = (LANE_BOT - LANE_TOP) / LANE_COUNT;
  const HERO_X = 80;
  const BASE_X = 30;

  function laneY(lane) { return LANE_TOP + LANE_H * (lane + 0.5); }

  // Tier stats: 1 weak, 2 medium, 3 strong.
  const HERO_STATS = {
    1: { dmg: 8,  fireMs: 600, color: "#7dd3fc", range: 720 },
    2: { dmg: 16, fireMs: 450, color: "#a78bfa", range: 760 },
    3: { dmg: 30, fireMs: 320, color: "#fbbf24", range: 820 },
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.reset();
      this.onEnd = () => {};
      this.onTick = () => {};
      this._raf = null;
      this._last = 0;
    }

    reset() {
      this.heroes = [];   // {lane, tier, lastFire}
      this.zombies = [];  // {lane, x, hp, maxHp, speed, dmg}
      this.bullets = [];  // {x, y, vx, dmg, lane}
      this.wave = 0;
      this.score = 0;
      this.baseHp = 100;
      this.alive = false;
      this.spawnTimer = 0;
      this.waveTimer = 0;
      this.zombiesThisWave = 0;
      this.zombiesSpawned = 0;
      this.startTime = 0;
    }

    setHeroes(tiers) {
      // Assign heroes to lanes round-robin. Up to 8 heroes shown (2 per lane).
      const list = tiers.slice(0, LANE_COUNT * 2);
      this.heroes = list.map((tier, i) => ({
        lane: i % LANE_COUNT,
        slot: Math.floor(i / LANE_COUNT), // 0 front, 1 back
        tier,
        lastFire: 0,
      }));
    }

    start() {
      if (this.heroes.length === 0) return false;
      this.alive = true;
      this.wave = 1;
      this.score = 0;
      this.baseHp = 100;
      this.zombies.length = 0;
      this.bullets.length = 0;
      this.spawnTimer = 0;
      this.zombiesSpawned = 0;
      this.zombiesThisWave = this._waveSize(1);
      this.waveTimer = 0;
      this.startTime = performance.now();
      this._last = this.startTime;
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame((t) => this._loop(t));
      return true;
    }

    stop() {
      this.alive = false;
      cancelAnimationFrame(this._raf);
    }

    _waveSize(w) { return 6 + w * 2; }

    _spawnZombie() {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      const tier = Math.min(3, 1 + Math.floor(this.wave / 4));
      const baseHp = 20 + this.wave * 6;
      const hp = tier === 3 ? baseHp * 3 : tier === 2 ? baseHp * 1.7 : baseHp;
      const speed = 30 + this.wave * 1.2 + (tier === 3 ? 10 : 0);
      this.zombies.push({
        lane, x: W + 20,
        hp, maxHp: hp,
        speed, dmg: 4 + this.wave,
        tier,
      });
    }

    _loop(t) {
      if (!this.alive) return;
      const dt = Math.min(0.05, (t - this._last) / 1000);
      this._last = t;
      this._update(dt, t);
      this._draw();
      this.onTick({
        wave: this.wave, score: this.score,
        baseHp: Math.max(0, Math.floor(this.baseHp)),
        heroes: this.heroes.length,
      });
      this._raf = requestAnimationFrame((tt) => this._loop(tt));
    }

    _update(dt, now) {
      // Spawn zombies for the current wave.
      this.spawnTimer -= dt;
      if (this.zombiesSpawned < this.zombiesThisWave && this.spawnTimer <= 0) {
        this._spawnZombie();
        this.zombiesSpawned++;
        this.spawnTimer = Math.max(0.35, 1.4 - this.wave * 0.06);
      }

      // Heroes fire.
      for (const h of this.heroes) {
        const stats = HERO_STATS[h.tier];
        if (now - h.lastFire < stats.fireMs) continue;
        // Find nearest zombie in same lane within range.
        let target = null, bestX = Infinity;
        for (const z of this.zombies) {
          if (z.lane !== h.lane) continue;
          if (z.x < bestX && z.x - HERO_X <= stats.range) {
            target = z; bestX = z.x;
          }
        }
        if (target) {
          const hx = HERO_X + (h.slot ? -28 : 0);
          this.bullets.push({
            x: hx + 12, y: laneY(h.lane),
            vx: 600, dmg: stats.dmg, lane: h.lane,
          });
          h.lastFire = now;
        }
      }

      // Bullets move + collide.
      for (const b of this.bullets) b.x += b.vx * dt;
      this.bullets = this.bullets.filter((b) => {
        if (b.x > W + 20) return false;
        for (const z of this.zombies) {
          if (z.lane === b.lane && Math.abs(z.x - b.x) < 14) {
            z.hp -= b.dmg;
            return false;
          }
        }
        return true;
      });

      // Zombies advance.
      for (const z of this.zombies) z.x -= z.speed * dt;

      // Zombie -> base damage.
      for (const z of this.zombies) {
        if (z.x < BASE_X + 20) {
          this.baseHp -= z.dmg * dt;
          z.x = BASE_X + 20; // park at base while it bites
        }
      }

      // Remove dead zombies, award score.
      const before = this.zombies.length;
      this.zombies = this.zombies.filter((z) => {
        if (z.hp <= 0) { this.score += 10 * z.tier; return false; }
        return true;
      });
      // Wave complete?
      if (this.zombiesSpawned >= this.zombiesThisWave && this.zombies.length === 0) {
        this.wave++;
        this.zombiesSpawned = 0;
        this.zombiesThisWave = this._waveSize(this.wave);
        this.score += 50; // wave clear bonus
      }
      // No-op vs unused before
      void before;

      // Game over?
      if (this.baseHp <= 0) {
        this.alive = false;
        cancelAnimationFrame(this._raf);
        const finalScore = Math.max(0, Math.floor(this.score));
        setTimeout(() => this.onEnd(finalScore), 50);
      }
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0d1420");
      g.addColorStop(1, "#070b12");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Lane stripes
      for (let i = 0; i < LANE_COUNT; i++) {
        ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)";
        ctx.fillRect(0, LANE_TOP + i * LANE_H, W, LANE_H);
      }

      // Base
      ctx.fillStyle = "#1f3a52";
      ctx.fillRect(0, LANE_TOP, BASE_X + 20, LANE_BOT - LANE_TOP);
      ctx.strokeStyle = "#58e36b";
      ctx.strokeRect(0.5, LANE_TOP + 0.5, BASE_X + 19, LANE_BOT - LANE_TOP - 1);
      ctx.fillStyle = "#58e36b";
      ctx.font = "bold 12px monospace";
      ctx.fillText("BASE", 6, LANE_TOP - 4);

      // Base HP bar
      ctx.fillStyle = "#2a3140";
      ctx.fillRect(BASE_X + 26, 18, 200, 10);
      ctx.fillStyle = this.baseHp > 35 ? "#58e36b" : "#ef4444";
      ctx.fillRect(BASE_X + 26, 18, 200 * Math.max(0, this.baseHp) / 100, 10);
      ctx.strokeStyle = "#243044";
      ctx.strokeRect(BASE_X + 26.5, 18.5, 199, 9);

      // Heroes
      for (const h of this.heroes) {
        const stats = HERO_STATS[h.tier];
        const hx = HERO_X + (h.slot ? -28 : 0);
        const hy = laneY(h.lane);
        ctx.fillStyle = stats.color;
        ctx.beginPath();
        ctx.arc(hx, hy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#06210d";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("T" + h.tier, hx, hy + 4);
        ctx.textAlign = "start";
      }

      // Zombies
      for (const z of this.zombies) {
        const y = laneY(z.lane);
        ctx.fillStyle = z.tier === 3 ? "#7c2d12" : z.tier === 2 ? "#65a30d" : "#4d7c0f";
        ctx.fillRect(z.x - 10, y - 12, 20, 24);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(z.x - 6, y - 7, 3, 3);
        ctx.fillRect(z.x + 3, y - 7, 3, 3);
        // hp bar
        ctx.fillStyle = "#000";
        ctx.fillRect(z.x - 12, y - 18, 24, 3);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(z.x - 12, y - 18, 24 * (z.hp / z.maxHp), 3);
      }

      // Bullets
      ctx.fillStyle = "#fde047";
      for (const b of this.bullets) {
        ctx.fillRect(b.x - 4, b.y - 1.5, 8, 3);
      }

      // Wave label
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Wave ${this.wave}`, W - 12, 22);
      ctx.textAlign = "start";
    }
  }

  window.ZombieGame = Game;
})();
