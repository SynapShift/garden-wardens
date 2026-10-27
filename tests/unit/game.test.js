import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// Rendering is covered by Playwright. This deterministic adapter records scene
// objects and runs timer/tween completion callbacks explicitly for logic tests.
const harness = vi.hoisted(() => ({
  nodes: [],
  timers: [],
  tweens: [],
  roll: 0,
}));
vi.mock("phaser", () => {
  function node(x = 0, y = 0, text = "") {
    const target = {
      x,
      y,
      text,
      active: true,
      width: 100,
      scaleX: 1,
      scaleY: 1,
      depth: 0,
      rotation: 0,
      events: {},
      frame: { name: 0 },
      anims: {
        isPlaying: true,
        currentAnim: null,
        pause() {
          this.isPlaying = false;
        },
        resume() {
          this.isPlaying = true;
        },
      },
    };
    const proxy = new Proxy(target, {
      get(obj, key) {
        if (key in obj) return obj[key];
        return (...args) => {
          if (key === "on") obj.events[args[0]] = args[1];
          if (key === "destroy") obj.active = false;
          if (key === "setText") obj.text = args[0];
          if (key === "setPosition") {
            obj.x = args[0];
            obj.y = args[1];
          }
          if (key === "setScale") {
            obj.scaleX = args[0];
            obj.scaleY = args[1] ?? args[0];
          }
          if (key === "setDepth") obj.depth = args[0];
          if (key === "setVisible") obj.visible = args[0];
          if (key === "play") {
            obj.anims.currentAnim = { key: args[0] };
            obj.anims.isPlaying = true;
          }
          return proxy;
        };
      },
    });
    harness.nodes.push(proxy);
    return proxy;
  }
  class Scene {
    constructor() {
      this.add = Object.fromEntries(
        [
          "image",
          "sprite",
          "rectangle",
          "text",
          "ellipse",
          "circle",
          "container",
          "graphics",
        ].map((key) => [key, (...args) => node(...args)]),
      );
      this.make = { graphics: () => node() };
      this.cameras = { main: node() };
      this.load = node();
      this.input = node();
      this.input.keyboard = node();
      this.anims = {
        exists: () => false,
        create: vi.fn(),
        generateFrameNumbers: () => [],
      };
      this.scene = { start: vi.fn(), restart: vi.fn() };
      this.time = {
        delayedCall: (_delay, callback) => harness.timers.push(callback),
      };
      this.tweens = {
        timeScale: 1,
        add: (config) => harness.tweens.push(config),
        killTweensOf: vi.fn(),
      };
    }
  }
  return {
    default: {
      Scene,
      Game: class {},
      AUTO: 0,
      BlendModes: { MULTIPLY: 0 },
      Scale: { FIT: 0, CENTER_BOTH: 0 },
      Math: {
        Between: (a, b) => Math.min(b, Math.max(a, harness.roll)),
        FloatBetween: (a, b) => (a + b) / 2,
        Clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
      },
      Utils: {
        Array: {
          GetRandom: (list) => list[0],
          Remove: (list, item) => {
            const index = list.indexOf(item);
            if (index >= 0) list.splice(index, 1);
          },
        },
      },
    },
  };
});
vi.stubGlobal("window", {
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
});
const { GameScene, BootScene } = await import("../../src/main.js");
let scene;
function finish() {
  const timers = harness.timers.splice(0);
  timers.forEach((callback) => callback());
  const tweens = harness.tweens.splice(0);
  tweens.forEach((config) => config.onComplete?.());
}
function plant(type = "berry", row = 0, col = 0) {
  scene.selected = type;
  scene.energy = 10000;
  scene.placePlant({ row, col });
  return scene.entities.at(-1);
}
function enemy(x = 700, row = 0) {
  scene.spawnEnemy();
  const unit = scene.enemyUnits.at(-1);
  unit.sprite.x = x;
  unit.row = row;
  return unit;
}
beforeEach(() => {
  harness.nodes = [];
  harness.timers = [];
  harness.tweens = [];
  harness.roll = 0;
  vi.spyOn(Math, "random").mockReturnValue(0.2);
  scene = new GameScene();
  scene.create();
  scene.started = true;
});
afterEach(() => vi.restoreAllMocks());
describe("scene initialization and controls", () => {
  it("preloads all art and starts the game scene", () => {
    const boot = new BootScene();
    boot.preload();
    boot.load.events.progress(0.5);
    boot.load.events.complete();
    boot.create();
    expect(boot.scene.start).toHaveBeenCalledWith("game");
  });
  it("handles UI callbacks, intro, cards, toolbox and pause", () => {
    for (const n of [...harness.nodes]) {
      n.events.pointerover?.();
      n.events.pointerout?.();
    }
    scene.input.events.pointermove({ worldX: 310, worldY: 330 });
    scene.input.events.pointerdown({ worldX: 310, worldY: 330 }, []);
    scene.input.events.pointerdown({ worldX: 310, worldY: 330 }, [{}]);
    scene.input.keyboard.events["keydown-ONE"]();
    scene.input.keyboard.events["keydown-SPACE"]();
    expect(scene.isPaused).toBe(true);
    scene.togglePause();
    expect(scene.isPaused).toBe(false);
    scene.toolboxHit.events.pointerdown();
    expect(scene.toolboxOpen).toBe(true);
    scene.toolboxHit.events.pointerover();
    scene.toolboxHit.events.pointerout();
    scene.tools.forEach((tool) => {
      tool.hit.events.pointerover();
      tool.hit.events.pointerout();
      tool.hit.events.pointerdown();
    });
    scene.cards.forEach((card) => {
      card.hit.events.pointerdown();
      card.hit.events.pointerover();
      card.hit.events.pointerout();
    });
    const introStart = harness.nodes.find((n) => n.x === 800 && n.y === 567);
    introStart.events.pointerdown();
    scene.pauseButton.bg.events.pointerdown();
    scene.togglePause();
    scene.drawCard(null);
    scene.drawHover(0, 0);
    scene.drawHover(310, 330);
    scene.started = false;
    scene.drawHover(310, 330);
    scene.togglePause();
    scene.toolboxHit.events.pointerdown();
    expect(scene.cellAt(0, 0)).toBeNull();
    expect(scene.cellAt(1600, 900)).toBeNull();
    expect(scene.cellAt(310, 330)).toEqual({ col: 0, row: 0 });
  });
  it("caps frame duration and does not advance paused games", () => {
    scene.update(0, 1000);
    expect(scene.elapsed).toBe(0.04);
    scene.isPaused = true;
    scene.update(0, 1000);
    expect(scene.elapsed).toBe(0.04);
  });
});
describe("planting and tools", () => {
  it("charges costs, fuses, rejects illegal placements and heals on fusion", () => {
    const p = plant();
    expect(p.hp).toBe(190);
    expect(scene.energy).toBe(9900);
    scene.selected = "pumpkin";
    scene.placePlant({ row: 0, col: 0 });
    expect(scene.entities).toHaveLength(1);
    scene.selected = "berry";
    scene.energy = 0;
    scene.placePlant({ row: 0, col: 0 });
    expect(p.level).toBe(1);
    scene.energy = 1000;
    scene.placePlant({ row: 0, col: 0 });
    scene.placePlant({ row: 0, col: 0 });
    scene.placePlant({ row: 0, col: 0 });
    expect(p.level).toBe(3);
    expect(p.hp).toBe(p.maxHp);
    scene.energy = 0;
    scene.placePlant({ row: 1, col: 1 });
    expect(scene.entities).toHaveLength(1);
    scene.updateHUD();
    finish();
  });
  it("collects energy once and auto-collects only at its interval", () => {
    plant("sunbloom");
    scene.spawnEnergy(500, 300, 20);
    const orb = scene.orbs[0];
    const energy = scene.energy;
    orb.sprite.events.pointerdown({ event: { stopPropagation: vi.fn() } });
    expect(scene.energy).toBe(energy + 20);
    scene.collectOrb(orb);
    expect(scene.energy).toBe(energy + 20);
    scene.energy = 0;
    scene.buyCollector();
    expect(scene.autoCollector).toBe(false);
    scene.energy = 1000;
    scene.buyCollector();
    scene.buyCollector();
    expect(scene.autoCollector).toBe(true);
    scene.spawnEnergy(500, 300, 20);
    scene.updateTools(1);
    expect(scene.orbs).toHaveLength(0);
    scene.spawnEnergy(500, 300, 20);
    scene.updateTools(0.01);
    expect(scene.orbs).toHaveLength(1);
    finish();
    finish();
    expect(scene.orbs).toHaveLength(0);
  });
  it("applies all mystery rewards and caps arsenal upgrades", () => {
    const p = plant();
    p.hp = 1;
    scene.energy = 0;
    scene.openMysteryBox();
    scene.energy = 10000;
    for (const roll of [0, 1, 2, 2, 2, 3]) {
      harness.roll = roll;
      enemy();
      scene.openMysteryBox();
    }
    expect(p.level).toBe(3);
    expect(p.hp).toBe(p.maxHp);
    scene.energy = 0;
    scene.upgradeWeapons();
    expect(scene.weaponLevel).toBe(0);
    scene.energy = 10000;
    for (let i = 0; i < 4; i++) scene.upgradeWeapons();
    expect(scene.weaponLevel).toBe(3);
    expect(scene.toolPrice("collector")).toBe(280);
    expect(scene.toolPrice("mystery")).toBe(140);
    expect(scene.toolPrice("arsenal")).toBe(0);
    scene.tools.forEach((tool) => scene.drawTool(tool));
    scene.started = false;
    scene.buyCollector();
    scene.openMysteryBox();
    scene.upgradeWeapons();
  });
});
describe("combat simulation", () => {
  it("fires both projectile types, damages, slows, splashes and removes expired shots", () => {
    const berry = plant(),
      mushroom = plant("mushroom", 0, 1);
    plant("sunbloom", 1, 0);
    plant("pumpkin", 2, 0);
    const a = enemy(700),
      b = enemy(720);
    a.hp = 1000;
    b.hp = 10;
    scene.entities.forEach((p) => (p.cooldown = 0));
    scene.updatePlants(1);
    expect(scene.projectiles).toHaveLength(2);
    for (const shot of scene.projectiles) {
      shot.sprite.x = 700;
      shot.level = 3;
    }
    scene.updateProjectiles(0);
    expect(a.hp).toBeLessThan(1000);
    expect(a.slow).toBe(2.8);
    expect(scene.enemyUnits).not.toContain(b);
    scene.phase = "night";
    mushroom.cooldown = 0;
    scene.updatePlants(1);
    for (const shot of scene.projectiles) shot.life = 0;
    scene.updateProjectiles(1);
    expect(scene.projectiles).toHaveLength(0);
    scene.shoot(berry, "berry-orb", 9999, 470);
    scene.projectiles[0].sprite.x = a.sprite.x;
    scene.updateProjectiles(0);
    expect(scene.enemyUnits).not.toContain(a);
    scene.defeatEnemy(a);
    finish();
    finish();
  });
  it("moves enemies, attacks blockers, animates, and triggers mower/loss", () => {
    const p = plant();
    const a = enemy(p.sprite.x);
    p.hp = 1;
    scene.updateEnemies(0.1);
    expect(scene.entities).toHaveLength(0);
    a.sprite.x = 500;
    a.slow = 3;
    scene.animateEnemyGait(a, 0, false);
    scene.animateEnemyGait(a, 0, true);
    scene.animateEnemyGait(a, 0, false);
    a.sprite.frame.name = 2;
    scene.reducedMotion = true;
    scene.animateEnemyGait(a, 0, false);
    scene.footstepDust(a);
    a.sprite.x = 190;
    scene.updateEnemies(0.1);
    expect(scene.mowers[0].active).toBe(true);
    a.sprite.x = scene.mowers[0].sprite.x;
    scene.updateMowers(0);
    expect(scene.enemyUnits).toHaveLength(0);
    scene.mowers[0].sprite.x = 1800;
    scene.updateMowers(0.1);
    expect(scene.mowers[0].active).toBe(false);
    enemy(50);
    scene.updateEnemies(0.1);
    expect(scene.ended).toBe(true);
    const retry = harness.nodes.find(
      (n) => n.x === 800 && n.y === 520 && n.events.pointerdown,
    );
    retry.events.pointerdown();
    expect(scene.scene.restart).toHaveBeenCalled();
    finish();
    finish();
  });
  it("scales all enemy variants and progresses through the final wave", () => {
    scene.wave = 6;
    for (const roll of [0.1, 0.4, 0.7, 0.99]) {
      Math.random.mockReturnValue(roll);
      scene.spawnEnemy();
    }
    expect(new Set(scene.enemyUnits.map((e) => e.type)).size).toBe(4);
    scene.enemyUnits = [];
    scene.spawned = scene.spawnTarget;
    scene.wave = 1;
    scene.updateWave(5);
    expect(scene.wave).toBe(2);
    scene.spawnClock = 0;
    scene.updateWave(1);
    expect(scene.spawned).toBe(1);
    scene.enemyUnits = [];
    scene.spawned = scene.spawnTarget;
    scene.wave = 6;
    scene.updateWave(5);
    expect(scene.ended).toBe(true);
    scene.endGame(true);
  });
  it("alternates day/night and restores weather after both events", () => {
    scene.updatePhase(32);
    expect(scene.phase).toBe("night");
    scene.updatePhase(32);
    expect(scene.phase).toBe("day");
    for (const roll of [0.2, 0.8]) {
      Math.random.mockReturnValue(roll);
      scene.weatherClock = 0;
      scene.updateWeather(1);
      expect(scene.weather).toBe(roll < 0.5 ? "sunshower" : "tailwind");
      scene.updateHUD();
      scene.updateWeather(1);
      scene.updateWeather(10);
      expect(scene.weather).toBe("calm");
    }
    scene.windStreak();
    scene.warnLane(0);
    scene.warnLane(0);
    finish();
    finish();
  });
  it("cleans all entities on reset and tolerates unavailable audio", () => {
    const p = plant();
    enemy();
    scene.shoot(p, "berry-orb", 20, 470);
    scene.spawnEnergy(500, 300, 20);
    scene.resetState();
    expect(scene.entities).toEqual([]);
    expect(scene.enemyUnits).toEqual([]);
    scene.flash(null, 0);
    scene.flash({ active: false }, 0);
    scene.soundCue(300, 0.1);
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
    const oscillator = {
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    window.AudioContext = class {
      currentTime = 0;
      createGain() {
        return gain;
      }
      createOscillator() {
        return oscillator;
      }
    };
    scene.soundCue(300, 0.1);
    expect(oscillator.start).toHaveBeenCalled();
    delete window.AudioContext;
  });
});
