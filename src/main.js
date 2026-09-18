import Phaser from "phaser";

const WIDTH = 1600;
const HEIGHT = 900;
const BOARD = { x: 240, y: 245, cols: 9, rows: 5, cellW: 140, cellH: 108 };
const TOTAL_WAVES = 6;
const PHASE_DURATION = 32;

const PLANTS = {
  sunbloom: { name: "辉光花", cost: 50, hp: 160, cooldown: 7.2, scale: 0.21, color: 0xffd65a, role: "昼光产能" },
  berry: { name: "蓝莓炮", cost: 100, hp: 190, cooldown: 1.5, scale: 0.22, color: 0x4f91ff, role: "高速单攻" },
  pumpkin: { name: "南瓜卫士", cost: 75, hp: 580, cooldown: 0, scale: 0.23, color: 0xf18a38, role: "坚固防线" },
  mushroom: { name: "星雾菇", cost: 125, hp: 170, cooldown: 2.2, scale: 0.21, color: 0xb67be8, role: "月夜减速" },
};

const ENEMIES = {
  gardener: { hp: 150, speed: 19, damage: 34, reward: 12, scale: 0.22 },
  runner: { hp: 105, speed: 33, damage: 24, reward: 15, scale: 0.22 },
  bucket: { hp: 310, speed: 14, damage: 42, reward: 22, scale: 0.23 },
  brute: { hp: 660, speed: 9, damage: 66, reward: 38, scale: 0.28 },
};

class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  preload() {
    this.cameras.main.setBackgroundColor("#10271b");
    const title = this.add.text(WIDTH / 2, HEIGHT / 2 - 72, "花园正在苏醒", {
      fontFamily: '"Noto Sans SC", sans-serif', fontSize: 34, fontStyle: "bold", color: "#fff4cc",
    }).setOrigin(0.5);
    const track = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 420, 8, 0xffffff, 0.1);
    const bar = this.add.rectangle(WIDTH / 2 - 210, HEIGHT / 2, 0, 8, 0xffd55c).setOrigin(0, 0.5);
    const percent = this.add.text(WIDTH / 2, HEIGHT / 2 + 38, "0%", { fontSize: 14, color: "#91aa98" }).setOrigin(0.5);
    this.load.on("progress", (value) => { bar.width = 420 * value; percent.setText(`${Math.round(value * 100)}%`); });
    this.load.on("complete", () => { title.setText("准备就绪"); track.setAlpha(0); });

    this.load.image("battlefield", "assets/garden-battlefield.png");
    Object.keys(PLANTS).forEach((key) => this.load.image(key, `assets/sprites/${key}.png`));
    Object.keys(ENEMIES).forEach((key) => this.load.spritesheet(`${key}-sheet`, `assets/animations/${key}-sheet.webp`, { frameWidth: 512, frameHeight: 512, endFrame: 7 }));
  }

  create() { this.scene.start("game"); }
}

class GameScene extends Phaser.Scene {
  constructor() { super("game"); }

  create() {
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.createTextures();
    this.createEnemyAnimations();
    this.add.image(WIDTH / 2, HEIGHT / 2, "battlefield").setDisplaySize(WIDTH, HEIGHT);
    this.createLaneAtmosphere();
    this.createHUD();
    this.bindInput();
    this.resetState();
    this.showIntro();
  }

  resetState() {
    this.entities?.forEach((item) => item.sprite?.destroy());
    this.enemyUnits?.forEach((item) => item.sprite?.destroy());
    this.projectiles?.forEach((item) => item.sprite?.destroy());
    this.orbs?.forEach((item) => item.sprite?.destroy());
    this.mowers?.forEach((item) => item.sprite?.destroy());
    this.entities = [];
    this.enemyUnits = [];
    this.projectiles = [];
    this.orbs = [];
    this.mowers = [];
    this.energy = 150;
    this.autoCollector = false;
    this.autoCollectClock = 0;
    this.weaponLevel = 0;
    this.toolboxOpen = false;
    this.toolboxHinted = false;
    this.hasPlacedPlant = false;
    this.hasCollectedOrb = false;
    this.hasFusedPlant = false;
    this.energyHintShown = false;
    this.laneWarningAt = Array(BOARD.rows).fill(-Infinity);
    this.selected = "sunbloom";
    this.phase = "day";
    this.phaseTime = 0;
    this.weather = "calm";
    this.weatherClock = 18;
    this.weatherRemaining = 0;
    this.wave = 1;
    this.spawnTarget = 6;
    this.spawned = 0;
    this.spawnClock = 2;
    this.betweenWaves = 0;
    this.started = false;
    this.ended = false;
    this.isPaused = false;
    this.elapsed = 0;
    this.createMowers();
    this.selectPlant("sunbloom");
    this.updateHUD();
  }

  createTextures() {
    const makeCircle = (key, radius, color, glow = color) => {
      const graphics = this.make.graphics({ add: false });
      graphics.fillStyle(glow, 0.22); graphics.fillCircle(radius * 2, radius * 2, radius * 2);
      graphics.fillStyle(color, 1); graphics.fillCircle(radius * 2, radius * 2, radius);
      graphics.fillStyle(0xffffff, 0.75); graphics.fillCircle(radius * 1.68, radius * 1.64, radius * 0.3);
      graphics.generateTexture(key, radius * 4, radius * 4); graphics.destroy();
    };
    makeCircle("berry-orb", 10, 0x3476dc, 0x65a5ff);
    makeCircle("spore-orb", 12, 0xaa62e4, 0xd6a4ff);
    makeCircle("energy-orb", 17, 0xffdf4f, 0xffe985);
    makeCircle("spark", 5, 0xffffff);

    const mower = this.make.graphics({ add: false });
    mower.fillStyle(0xd85837); mower.fillRoundedRect(5, 12, 64, 38, 10);
    mower.fillStyle(0x2c342d); mower.fillCircle(20, 52, 11); mower.fillCircle(56, 52, 11);
    mower.lineStyle(7, 0xd9ded4); mower.beginPath(); mower.moveTo(61, 17); mower.lineTo(82, 0); mower.strokePath();
    mower.generateTexture("mower", 90, 66); mower.destroy();
  }

  createEnemyAnimations() {
    const frameRates = { gardener: 7, runner: 11, bucket: 6, brute: 5 };
    Object.keys(ENEMIES).forEach((type) => {
      if (!this.anims.exists(`${type}-walk`)) {
        this.anims.create({ key: `${type}-walk`, frames: this.anims.generateFrameNumbers(`${type}-sheet`, { start: 0, end: 3 }), frameRate: frameRates[type], repeat: -1 });
        this.anims.create({ key: `${type}-die`, frames: this.anims.generateFrameNumbers(`${type}-sheet`, { start: 4, end: 7 }), frameRate: 7, repeat: 0 });
      }
    });
  }

  createLaneAtmosphere() {
    this.laneGlow = this.add.graphics().setDepth(2);
    for (let row = 0; row < BOARD.rows; row += 1) {
      const y = BOARD.y + row * BOARD.cellH;
      this.laneGlow.fillStyle(row % 2 ? 0x143d20 : 0xffffff, row % 2 ? 0.04 : 0.025);
      this.laneGlow.fillRoundedRect(BOARD.x, y + 3, BOARD.cols * BOARD.cellW, BOARD.cellH - 6, 24);
    }
    this.hoverCell = this.add.graphics().setDepth(3);
    this.nightVeil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x25265c, 0).setDepth(80).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.vignette = this.add.graphics().setDepth(90);
    this.vignette.fillStyle(0x061009, 0.16); this.vignette.fillRect(0, 0, WIDTH, 55); this.vignette.fillRect(0, HEIGHT - 35, WIDTH, 35);
  }

  createHUD() {
    const panel = this.add.graphics().setDepth(100);
    panel.fillStyle(0x0e2419, 0.92); panel.fillRoundedRect(22, 18, 1556, 112, 24);
    panel.lineStyle(2, 0xffefbf, 0.15); panel.strokeRoundedRect(22, 18, 1556, 112, 24);
    panel.fillStyle(0x173526, 0.94); panel.fillRoundedRect(42, 35, 176, 77, 18);

    this.energyIcon = this.add.image(77, 73, "energy-orb").setScale(0.72).setDepth(102);
    this.energyText = this.add.text(109, 51, "150", { fontFamily: '"Noto Sans SC"', fontSize: 28, fontStyle: "bold", color: "#fff4c9" }).setDepth(102);
    this.add.text(110, 83, "花园能量", { fontFamily: '"Noto Sans SC"', fontSize: 12, color: "#9fbaa6" }).setDepth(102);

    this.cards = [];
    Object.entries(PLANTS).forEach(([key, data], index) => {
      const x = 258 + index * 224;
      const cardBg = this.add.graphics().setDepth(101);
      const hit = this.add.rectangle(x + 101, 73, 204, 78, 0xffffff, 0.001).setDepth(106).setInteractive({ useHandCursor: true });
      const icon = this.add.image(x + 40, 73, key).setDisplaySize(65, 65).setDepth(103);
      const name = this.add.text(x + 76, 48, data.name, { fontFamily: '"Noto Sans SC"', fontSize: 15, fontStyle: "bold", color: "#f8f1d6" }).setDepth(103);
      const info = this.add.text(x + 76, 74, `${data.role}  ·  ${data.cost}`, { fontFamily: '"Noto Sans SC"', fontSize: 10, color: "#9db2a2" }).setDepth(103);
      hit.on("pointerdown", () => this.selectPlant(key));
      hit.on("pointerover", () => { if (this.selected !== key) cardBg.setAlpha(1.25); icon.setScale(icon.scaleX * 1.05); });
      hit.on("pointerout", () => { icon.setDisplaySize(65, 65); this.drawCard(this.cards[index]); });
      this.cards.push({ key, x, bg: cardBg, hit, icon, name, info });
    });

    this.phaseLabel = this.add.text(1180, 47, "暖阳阶段", { fontFamily: '"Noto Sans SC"', fontSize: 13, fontStyle: "bold", color: "#ffe27a" }).setDepth(103);
    this.phaseTrack = this.add.rectangle(1180, 83, 160, 7, 0xffffff, 0.11).setOrigin(0, 0.5).setDepth(102);
    this.phaseBar = this.add.rectangle(1180, 83, 1, 7, 0xffd65a).setOrigin(0, 0.5).setDepth(103);
    this.waveText = this.add.text(1365, 47, "波次 1 / 6", { fontFamily: '"Noto Sans SC"', fontSize: 13, fontStyle: "bold", color: "#f6edda" }).setDepth(103);
    this.weatherText = this.add.text(1365, 78, "天气 · 平静", { fontFamily: '"Noto Sans SC"', fontSize: 11, color: "#9fbaa6" }).setDepth(103);

    this.pauseButton = this.makeButton(1513, 74, "Ⅱ", 44, () => this.togglePause());
    this.createToolDock();
    this.toastBg = this.add.graphics().setDepth(210).setAlpha(0);
    this.toastText = this.add.text(WIDTH / 2, 225, "", { fontFamily: '"Noto Sans SC"', fontSize: 15, fontStyle: "bold", color: "#fff5d2" }).setOrigin(0.5).setDepth(211).setAlpha(0);
  }

  drawCard(card) {
    if (!card) return;
    card.bg.clear();
    const selected = this.selected === card.key;
    const affordable = this.energy >= PLANTS[card.key].cost;
    card.bg.fillStyle(selected ? 0x51451f : 0x173526, selected ? 0.97 : 0.82);
    card.bg.fillRoundedRect(card.x, 34, 204, 78, 17);
    card.bg.lineStyle(selected ? 2 : 1, selected ? 0xffdf63 : 0xffffff, selected ? 0.85 : 0.08);
    card.bg.strokeRoundedRect(card.x, 34, 204, 78, 17);
    card.icon.setAlpha(affordable ? 1 : 0.45);
    card.name.setAlpha(affordable ? 1 : 0.5);
    card.info.setAlpha(affordable ? 1 : 0.45);
  }

  createToolDock() {
    const definitions = [
      { key: "collector", x: 500, title: "拾光藤", detail: "自动收集", action: () => this.buyCollector() },
      { key: "mystery", x: 735, title: "奇趣种匣", detail: "随机奇遇", action: () => this.openMysteryBox() },
      { key: "arsenal", x: 970, title: "荆棘工坊", detail: "全园火力", action: () => this.upgradeWeapons() },
    ];
    this.tools = definitions.map((definition) => {
      const bg = this.add.graphics().setDepth(101);
      const hit = this.add.rectangle(definition.x + 105, 169, 214, 52, 0xffffff, 0.001).setDepth(106).setInteractive({ useHandCursor: true });
      const title = this.add.text(definition.x + 16, 151, definition.title, { fontFamily: '"Noto Sans SC"', fontSize: 13, fontStyle: "bold", color: "#f8efd0" }).setDepth(103);
      const detail = this.add.text(definition.x + 16, 175, definition.detail, { fontFamily: '"Noto Sans SC"', fontSize: 10, color: "#8eaa96" }).setDepth(103);
      const price = this.add.text(definition.x + 196, 169, "", { fontFamily: '"Noto Sans SC"', fontSize: 11, fontStyle: "bold", color: "#ffd965" }).setOrigin(1, 0.5).setDepth(103);
      const tool = { ...definition, bg, hit, title, detail, price };
      hit.on("pointerdown", definition.action);
      hit.on("pointerover", () => bg.setAlpha(1.2));
      hit.on("pointerout", () => bg.setAlpha(1));
      return tool;
    });
    this.toolboxBg = this.add.graphics().setDepth(101);
    this.toolboxHit = this.add.rectangle(1375, 169, 214, 52, 0xffffff, 0.001).setDepth(106).setInteractive({ useHandCursor: true });
    this.toolboxTitle = this.add.text(1290, 169, "花园工具箱", { fontFamily: '"Noto Sans SC"', fontSize: 13, fontStyle: "bold", color: "#f8efd0" }).setOrigin(0, 0.5).setDepth(103);
    this.toolboxArrow = this.add.text(1461, 169, "＋", { fontFamily: '"Noto Sans SC"', fontSize: 18, color: "#ffd965" }).setOrigin(0.5).setDepth(103);
    this.toolboxBadge = this.add.text(1274, 145, "可用", { fontFamily: '"Noto Sans SC"', fontSize: 10, fontStyle: "bold", color: "#18331f", backgroundColor: "#d9ec77", padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(107).setVisible(false);
    this.toolboxHit.on("pointerdown", () => {
      if (!this.started || this.ended) return;
      this.toolboxOpen = !this.toolboxOpen;
      this.toolboxHinted = true;
      this.updateToolbox();
    });
    this.toolboxHit.on("pointerover", () => this.toolboxBg.setAlpha(1.2));
    this.toolboxHit.on("pointerout", () => this.toolboxBg.setAlpha(1));
    this.updateToolbox();
  }

  updateToolbox() {
    this.toolboxBg.clear();
    this.toolboxBg.fillStyle(this.toolboxOpen ? 0x294c31 : 0x112e20, 0.94);
    this.toolboxBg.fillRoundedRect(1268, 143, 214, 52, 13);
    this.toolboxBg.lineStyle(1, this.toolboxOpen ? 0xd9ec77 : 0xffffff, this.toolboxOpen ? 0.38 : 0.1);
    this.toolboxBg.strokeRoundedRect(1268, 143, 214, 52, 13);
    this.toolboxArrow.setText(this.toolboxOpen ? "−" : "＋");
    this.tools?.forEach((tool) => [tool.bg, tool.hit, tool.title, tool.detail, tool.price].forEach((item) => item.setVisible(this.toolboxOpen)));
    this.toolboxBadge?.setVisible(!this.toolboxOpen && !this.toolboxHinted && this.energy >= 140);
  }

  toolPrice(key) {
    if (key === "collector") return this.autoCollector ? 0 : 280;
    if (key === "mystery") return 140;
    return this.weaponLevel >= 3 ? 0 : 260 + this.weaponLevel * 180;
  }

  drawTool(tool) {
    const price = this.toolPrice(tool.key);
    const complete = (tool.key === "collector" && this.autoCollector) || (tool.key === "arsenal" && this.weaponLevel >= 3);
    const affordable = complete || this.energy >= price;
    tool.bg.clear();
    tool.bg.fillStyle(complete ? 0x315b32 : 0x112e20, complete ? 0.94 : 0.9);
    tool.bg.fillRoundedRect(tool.x, 143, 214, 52, 13);
    tool.bg.lineStyle(1, complete ? 0x9ad070 : 0xffffff, complete ? 0.45 : 0.09);
    tool.bg.strokeRoundedRect(tool.x, 143, 214, 52, 13);
    tool.price.setText(complete ? "已启用" : `${price} 光`);
    tool.title.setAlpha(affordable ? 1 : 0.48);
    tool.detail.setAlpha(affordable ? 1 : 0.42);
    tool.price.setAlpha(affordable ? 1 : 0.42);
  }

  buyCollector() {
    if (!this.started || this.isPaused || this.ended) return;
    if (this.autoCollector) return this.toast("拾光藤正在替你收集能量");
    if (this.energy < 280) return this.toast(`拾光藤还需要 ${280 - Math.floor(this.energy)} 点能量`);
    this.energy -= 280;
    this.autoCollector = true;
    this.toast("拾光藤苏醒 · 能量球将自动归仓");
    this.soundCue(720, 0.12, "triangle", 0.025);
  }

  openMysteryBox() {
    if (!this.started || this.isPaused || this.ended) return;
    if (this.energy < 140) return this.toast(`奇趣种匣还需要 ${140 - Math.floor(this.energy)} 点能量`);
    this.energy -= 140;
    const roll = Phaser.Math.Between(0, 3);
    if (roll === 0) {
      this.energy += 220;
      this.toast("种匣开出丰收日 · 获得 220 能量");
    } else if (roll === 1) {
      this.entities.forEach((plant) => { plant.hp = plant.maxHp; });
      this.toast("种匣开出春露 · 全园恢复生命");
    } else if (roll === 2) {
      const candidates = this.entities.filter((plant) => plant.level < 3);
      if (candidates.length) {
        const plant = Phaser.Utils.Array.GetRandom(candidates);
        plant.level += 1; plant.maxHp = Math.round(plant.maxHp * 1.35); plant.hp = plant.maxHp;
        plant.levelText.setText(`LV.${plant.level}`).setVisible(true);
        this.toast(`种匣开出奇种 · ${PLANTS[plant.type].name} 免费升级`);
      } else {
        this.energy += 180;
        this.toast("奇种已满园 · 转化为 180 能量");
      }
    } else {
      [...this.enemyUnits].forEach((enemy) => { enemy.hp -= 55; enemy.slow = Math.max(enemy.slow, 4); if (enemy.hp <= 0) this.defeatEnemy(enemy); });
      this.toast("种匣开出霜风 · 全场怪客受创减速");
    }
    this.burst(842, 170, 0xffd965, 22);
    this.soundCue(940, 0.12, "triangle", 0.028);
  }

  upgradeWeapons() {
    if (!this.started || this.isPaused || this.ended) return;
    if (this.weaponLevel >= 3) return this.toast("荆棘工坊已强化至最高等级");
    const price = this.toolPrice("arsenal");
    if (this.energy < price) return this.toast(`火力强化还需要 ${price - Math.floor(this.energy)} 点能量`);
    this.energy -= price;
    this.weaponLevel += 1;
    this.toast(`荆棘工坊强化至 ${this.weaponLevel} 级 · 弹体威力提升`);
    this.cameras.main.flash(180, 255, 220, 105, false, undefined, 0.1);
    this.soundCue(560 + this.weaponLevel * 90, 0.14, "sawtooth", 0.022);
  }

  makeButton(x, y, label, size, action) {
    const bg = this.add.circle(x, y, size / 2, 0xffffff, 0.075).setDepth(104).setStrokeStyle(1, 0xffffff, 0.13).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y - 1, label, { fontSize: 17, fontStyle: "bold", color: "#e8efdf" }).setOrigin(0.5).setDepth(105);
    bg.on("pointerover", () => bg.setFillStyle(0xffffff, 0.14));
    bg.on("pointerout", () => bg.setFillStyle(0xffffff, 0.075));
    bg.on("pointerdown", action);
    return { bg, text };
  }

  bindInput() {
    this.input.on("pointermove", (pointer) => this.drawHover(pointer.worldX, pointer.worldY));
    this.input.on("pointerdown", (pointer, objects) => {
      if (objects.length || !this.started || this.isPaused || this.ended) return;
      const cell = this.cellAt(pointer.worldX, pointer.worldY);
      if (cell) this.placePlant(cell);
    });
    this.input.keyboard.on("keydown-SPACE", () => this.togglePause());
    ["ONE", "TWO", "THREE", "FOUR"].forEach((code, index) => {
      this.input.keyboard.on(`keydown-${code}`, () => this.selectPlant(Object.keys(PLANTS)[index]));
    });
  }

  showIntro() {
    this.modal?.destroy(true);
    const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07120c, 0.64).setDepth(300).setInteractive();
    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(0x10271b, 0.97); panel.fillRoundedRect(435, 235, 730, 410, 34);
    panel.lineStyle(2, 0xffe39a, 0.24); panel.strokeRoundedRect(435, 235, 730, 410, 34);
    const kicker = this.add.text(800, 292, "A HAND-PAINTED GARDEN DEFENSE", { fontSize: 11, fontStyle: "bold", color: "#91c492", letterSpacing: 3 }).setOrigin(0.5).setDepth(302);
    const title = this.add.text(800, 350, "守住这座会呼吸的花园", { fontFamily: '"Noto Sans SC"', fontSize: 39, fontStyle: "bold", color: "#fff4cf" }).setOrigin(0.5).setDepth(302);
    const copy = this.add.text(800, 435, "昼夜会改变守卫能力，天气会改变战场节奏。\n在同类植物上再次种植，融合出更强形态。", { fontFamily: '"Noto Sans SC"', fontSize: 16, color: "#aec2b2", align: "center", lineSpacing: 12 }).setOrigin(0.5).setDepth(302);
    const buttonBg = this.add.graphics().setDepth(302);
    buttonBg.fillStyle(0xffcf58); buttonBg.fillRoundedRect(660, 535, 280, 64, 18);
    const button = this.add.rectangle(800, 567, 280, 64, 0xffffff, 0.001).setDepth(304).setInteractive({ useHandCursor: true });
    const buttonText = this.add.text(800, 566, "开始守护", { fontFamily: '"Noto Sans SC"', fontSize: 19, fontStyle: "bold", color: "#3b2a08" }).setOrigin(0.5).setDepth(303);
    button.on("pointerover", () => { buttonText.setScale(1.04); buttonBg.setAlpha(1.15); });
    button.on("pointerout", () => { buttonText.setScale(1); buttonBg.setAlpha(1); });
    button.on("pointerdown", () => {
      this.modal.destroy(true);
      this.started = true;
      this.toast("先选择守卫，在草坪上种下第一株植物");
      this.soundCue(520, 0.08, "sine");
    });
    this.modal = this.add.container(0, 0, [shade, panel, kicker, title, copy, buttonBg, buttonText, button]).setDepth(300);
  }

  createMowers() {
    for (let row = 0; row < BOARD.rows; row += 1) {
      const sprite = this.add.image(187, this.groundY(row), "mower").setOrigin(0.5, 1).setScale(0.78).setDepth(this.rowDepth(row) + 4);
      this.mowers.push({ row, sprite, active: false, used: false });
    }
  }

  selectPlant(key) {
    this.selected = key;
    this.cards?.forEach((card) => this.drawCard(card));
    this.soundCue(620, 0.025, "sine", 0.018);
  }

  cellAt(x, y) {
    if (x < BOARD.x || y < BOARD.y) return null;
    const col = Math.floor((x - BOARD.x) / BOARD.cellW);
    const row = Math.floor((y - BOARD.y) / BOARD.cellH);
    return col >= 0 && col < BOARD.cols && row >= 0 && row < BOARD.rows ? { col, row } : null;
  }

  drawHover(x, y) {
    this.hoverCell.clear();
    if (!this.started || this.isPaused || this.ended) return;
    const cell = this.cellAt(x, y);
    if (!cell) return;
    this.hoverCell.fillStyle(0xffe377, 0.12);
    this.hoverCell.fillRoundedRect(BOARD.x + cell.col * BOARD.cellW + 4, BOARD.y + cell.row * BOARD.cellH + 5, BOARD.cellW - 8, BOARD.cellH - 10, 22);
    this.hoverCell.lineStyle(2, 0xffe79a, 0.5);
    this.hoverCell.strokeRoundedRect(BOARD.x + cell.col * BOARD.cellW + 4, BOARD.y + cell.row * BOARD.cellH + 5, BOARD.cellW - 8, BOARD.cellH - 10, 22);
  }

  placePlant(cell) {
    const data = PLANTS[this.selected];
    const existing = this.entities.find((plant) => plant.row === cell.row && plant.col === cell.col);
    if (existing) {
      if (existing.type !== this.selected) return this.toast("这里已经住着另一位守卫");
      if (existing.level >= 3) return this.toast("已经达到最高融合等级");
      const cost = Math.ceil(data.cost * (0.55 + existing.level * 0.15));
      if (this.energy < cost) return this.toast(`融合需要 ${cost} 点能量`);
      this.energy -= cost;
      existing.level += 1;
      existing.maxHp = Math.round(existing.maxHp * 1.35);
      existing.hp = existing.maxHp;
      existing.levelText.setText(`LV.${existing.level}`).setVisible(true).setColor(existing.level === 3 ? "#ffe173" : "#ffffff");
      this.tweens.add({ targets: existing.sprite, scaleX: existing.baseScale * 1.22, scaleY: existing.baseScale * 1.22, duration: 160, yoyo: true, ease: "Back.Out" });
      this.burst(existing.sprite.x, existing.sprite.y, data.color, 20);
      this.soundCue(760, 0.1, "triangle");
      this.toast(`${data.name} 融合至 LV.${existing.level}`);
      if (!this.hasFusedPlant) {
        this.hasFusedPlant = true;
        this.time.delayedCall(1550, () => this.toast("融合完成 · 继续搭配守卫，守住五条草坪"));
      }
      return;
    }
    if (this.energy < data.cost) return this.toast(`还需要 ${data.cost - Math.floor(this.energy)} 点能量`);
    this.energy -= data.cost;
    const x = this.colX(cell.col);
    const y = this.groundY(cell.row);
    const sprite = this.add.image(x, y, this.selected).setOrigin(0.5, 0.934).setScale(0.02).setDepth(this.rowDepth(cell.row) + 2);
    const healthBg = this.add.rectangle(x, y + 8, 72, 7, 0x142019, 0.65).setDepth(sprite.depth + 2).setVisible(false);
    const health = this.add.rectangle(x - 36, y + 8, 72, 7, 0x7fd466).setOrigin(0, 0.5).setDepth(sprite.depth + 3).setVisible(false);
    const levelText = this.add.text(x, y - 105, "LV.1", { fontSize: 11, fontStyle: "bold", color: "#ffffff", stroke: "#25412c", strokeThickness: 4 }).setOrigin(0.5).setDepth(sprite.depth + 3).setVisible(false);
    const plant = { type: this.selected, row: cell.row, col: cell.col, sprite, health, healthBg, levelText, hp: data.hp, maxHp: data.hp, cooldown: data.cooldown * 0.45, level: 1, baseScale: data.scale };
    this.entities.push(plant);
    this.tweens.add({ targets: sprite, scaleX: data.scale, scaleY: data.scale, duration: 370, ease: "Back.Out" });
    this.tweens.add({ targets: sprite, y: y - 4, angle: { from: -1.5, to: 1.5 }, duration: 1150 + Math.random() * 350, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.burst(x, y + 38, 0xc9ed76, 12);
    this.soundCue(390, 0.06, "triangle");
    if (!this.hasPlacedPlant) {
      this.hasPlacedPlant = true;
      this.time.delayedCall(550, () => this.toast(this.selected === "sunbloom" ? "辉光花会产出能量 · 点击发光能量收集" : "种下辉光花，持续补充花园能量"));
    }
  }

  colX(col) { return BOARD.x + col * BOARD.cellW + BOARD.cellW / 2; }
  rowY(row) { return BOARD.y + row * BOARD.cellH + BOARD.cellH / 2; }
  groundY(row) { return this.rowY(row) + 32; }
  rowDepth(row) { return 10 + row * 10; }

  spawnEnemy() {
    const roll = Math.random();
    let type = "gardener";
    if (this.wave >= 4 && roll > Math.max(0.72, 0.92 - this.wave * 0.025)) type = "brute";
    else if (this.wave >= 2 && roll > Math.max(0.48, 0.76 - this.wave * 0.035)) type = "bucket";
    else if (this.wave >= 2 && roll > 0.34) type = "runner";
    const data = ENEMIES[type];
    const row = Phaser.Math.Between(0, BOARD.rows - 1);
    this.warnLane(row);
    const formationPressure = Math.max(0, this.entities.length - 10) * 0.025;
    const upgradePressure = this.weaponLevel * 0.12;
    const finalWavePressure = this.wave === TOTAL_WAVES ? 0.18 : 0;
    const scaleUp = (1 + (this.wave - 1) * 0.28) * (1 + formationPressure + upgradePressure + finalWavePressure);
    const damageUp = 1 + (this.wave - 1) * 0.09;
    const sprite = this.add.sprite(WIDTH + 125, this.groundY(row), `${type}-sheet`, 0).setOrigin(0.5, 0.965).setScale(data.scale).setAlpha(0.18).setDepth(this.rowDepth(row) + 5).play(`${type}-walk`);
    const shadow = this.add.ellipse(sprite.x, this.groundY(row) + 3, type === "brute" ? 105 : 72, 20, 0x102015, 0.22).setDepth(sprite.depth - 1);
    const healthBg = this.add.rectangle(sprite.x, sprite.y - 102, 76, 8, 0x182019, 0.7).setDepth(sprite.depth + 3);
    const health = this.add.rectangle(sprite.x - 38, sprite.y - 102, 76, 8, 0xe76c4d).setOrigin(0, 0.5).setDepth(sprite.depth + 4);
    const enemy = { type, row, sprite, shadow, health, healthBg, hp: data.hp * scaleUp, maxHp: data.hp * scaleUp, damage: data.damage * damageUp, speed: data.speed * (1 + this.wave * 0.07), slow: 0, attackClock: 0, attackKick: 0, baseScale: data.scale, contactFrame: -1 };
    this.enemyUnits.push(enemy);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 720, ease: "Sine.Out" });
    this.tweens.add({ targets: shadow, alpha: 0.22, duration: 720, ease: "Sine.Out" });
  }

  warnLane(row) {
    if (this.elapsed - this.laneWarningAt[row] < 7) return;
    this.laneWarningAt[row] = this.elapsed;
    const y = this.rowY(row);
    const glow = this.add.rectangle(1485, y, 215, BOARD.cellH - 12, 0xffb84f, 0).setDepth(78);
    const marker = this.add.text(1515, y, `第 ${row + 1} 路  来袭  ◀`, { fontFamily: '"Noto Sans SC"', fontSize: 13, fontStyle: "bold", color: "#fff1b4", stroke: "#502d16", strokeThickness: 4 }).setOrigin(0.5).setDepth(79).setAlpha(0);
    this.tweens.add({ targets: glow, alpha: 0.22, duration: 150, yoyo: true, hold: 340, onComplete: () => glow.destroy() });
    this.tweens.add({ targets: marker, alpha: 1, x: 1480, duration: 190, yoyo: true, hold: 360, onComplete: () => marker.destroy() });
  }

  update(time, deltaMs) {
    if (!this.started || this.isPaused || this.ended) return;
    const dt = Math.min(0.04, deltaMs / 1000);
    this.elapsed += dt;
    this.updatePhase(dt);
    this.updateWeather(dt);
    this.updateWave(dt);
    this.updatePlants(dt);
    this.updateTools(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateMowers(dt);
    this.updateHUD();
  }

  updatePhase(dt) {
    this.phaseTime += dt;
    if (this.phaseTime < PHASE_DURATION) return;
    this.phaseTime = 0;
    this.phase = this.phase === "day" ? "night" : "day";
    this.tweens.add({ targets: this.nightVeil, alpha: this.phase === "night" ? 0.38 : 0, duration: 1800, ease: "Sine.InOut" });
    this.energyIcon.setTexture("energy-orb").setTint(this.phase === "night" ? 0xcba8ff : 0xffffff);
    this.toast(this.phase === "day" ? "暖阳回归 · 辉光花产能加速" : "月影降临 · 星雾菇进入共鸣");
    this.burst(800, 165, this.phase === "day" ? 0xffdf66 : 0xcaa2ff, 28);
  }

  updateWeather(dt) {
    if (this.weatherRemaining > 0) {
      this.weatherRemaining -= dt;
      if (this.weather === "tailwind" && Math.random() < dt * 8) this.windStreak();
      if (this.weatherRemaining <= 0) { this.weather = "calm"; this.weatherClock = Phaser.Math.Between(19, 28); this.toast("天气恢复平静"); }
      return;
    }
    this.weatherClock -= dt;
    if (this.weatherClock > 0) return;
    this.weather = Math.random() < 0.5 ? "sunshower" : "tailwind";
    this.weatherRemaining = 10;
    if (this.weather === "sunshower") {
      for (let i = 0; i < 5; i += 1) this.time.delayedCall(i * 450, () => this.spawnEnergy(Phaser.Math.Between(330, 1370), 150, 20));
      this.toast("太阳雨 · 额外能量正在坠落");
    } else this.toast("顺风 · 弹体获得疾速加成");
  }

  updateWave(dt) {
    if (this.spawned < this.spawnTarget) {
      this.spawnClock -= dt;
      if (this.spawnClock <= 0) {
        this.spawnEnemy(); this.spawned += 1;
        this.spawnClock = Math.max(0.58, 2.25 - this.wave * 0.22) + Math.random() * 0.45;
      }
    } else if (!this.enemyUnits.length) {
      if (this.wave >= TOTAL_WAVES) return this.endGame(true);
      this.betweenWaves += dt;
      if (this.betweenWaves > 4) {
        this.wave += 1; this.spawned = 0; this.spawnTarget = 5 + this.wave * 3; this.spawnClock = 1.25; this.betweenWaves = 0;
        this.toast(`第 ${this.wave} 波 · 新的怪客加入战场`);
      }
    }
  }

  updatePlants(dt) {
    for (const plant of this.entities) {
      plant.cooldown -= dt;
      const data = PLANTS[plant.type];
      if (plant.type === "sunbloom" && plant.cooldown <= 0) {
        plant.cooldown = data.cooldown * (this.phase === "day" ? 0.68 : 1.18) / (1 + (plant.level - 1) * 0.24);
        this.spawnEnergy(plant.sprite.x + Phaser.Math.Between(-16, 16), plant.sprite.y - 30, 14 + plant.level * 6);
        this.tweens.add({ targets: plant.sprite, scaleX: plant.baseScale * 1.12, scaleY: plant.baseScale * 1.12, yoyo: true, duration: 180 });
      }
      const target = this.enemyUnits.filter((enemy) => enemy.row === plant.row && enemy.sprite.x > plant.sprite.x).sort((a, b) => a.sprite.x - b.sprite.x)[0];
      if (!target || plant.cooldown > 0) continue;
      if (plant.type === "berry") {
        plant.cooldown = data.cooldown / (1 + (plant.level - 1) * 0.24);
        this.shoot(plant, "berry-orb", 27 + plant.level * 8, 470);
      } else if (plant.type === "mushroom") {
        plant.cooldown = data.cooldown * (this.phase === "night" ? 0.55 : 1) / (1 + (plant.level - 1) * 0.18);
        this.shoot(plant, "spore-orb", 19 + plant.level * 7, 360);
      }
    }
  }

  updateTools(dt) {
    if (!this.autoCollector || !this.orbs.length) return;
    this.autoCollectClock -= dt;
    if (this.autoCollectClock > 0) return;
    this.autoCollectClock = 0.55;
    this.collectOrb(this.orbs[0]);
  }

  shoot(plant, texture, damage, speed) {
    const sprite = this.add.image(plant.sprite.x + 35, plant.sprite.y - 12, texture).setScale(0.75).setDepth(this.rowDepth(plant.row) + 7);
    const weaponBoost = 1 + this.weaponLevel * 0.22;
    this.projectiles.push({ sprite, row: plant.row, type: texture, damage: damage * weaponBoost, speed: speed * (1 + this.weaponLevel * 0.08), level: plant.level, life: 4 });
    this.tweens.add({ targets: plant.sprite, x: plant.sprite.x - 5, duration: 65, yoyo: true });
    this.soundCue(texture === "berry-orb" ? 260 : 440, 0.025, "sine", 0.012);
  }

  updateEnemies(dt) {
    for (const enemy of [...this.enemyUnits]) {
      enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.attackClock -= dt;
      enemy.attackKick = Math.max(0, enemy.attackKick - dt * 5.5);
      const blocker = this.entities.filter((plant) => plant.row === enemy.row && Math.abs(enemy.sprite.x - plant.sprite.x) < 62).sort((a, b) => b.sprite.x - a.sprite.x)[0];
      if (blocker) {
        if (enemy.attackClock <= 0) {
          enemy.attackClock = Math.max(0.52, 0.74 - this.wave * 0.025);
          enemy.attackKick = 1;
          blocker.hp -= enemy.damage;
          this.flash(blocker.sprite, 0xffdd9a);
          this.burst(blocker.sprite.x + 30, blocker.sprite.y, 0xd3a95c, 5);
          if (blocker.hp <= 0) this.removePlant(blocker);
        }
      } else {
        enemy.sprite.x -= enemy.speed * (enemy.slow > 0 ? 0.48 : 1) * dt;
      }
      this.animateEnemyGait(enemy, dt, Boolean(blocker));
      enemy.healthBg.setPosition(enemy.sprite.x, enemy.sprite.y - 102);
      enemy.health.setPosition(enemy.sprite.x - 38, enemy.sprite.y - 102).setDisplaySize(76 * Math.max(0, enemy.hp / enemy.maxHp), 8);
      const showHealth = enemy.hp < enemy.maxHp || enemy.sprite.x < 850;
      enemy.healthBg.setVisible(showHealth);
      enemy.health.setVisible(showHealth);
      if (enemy.sprite.x < BOARD.x - 42) {
        const mower = this.mowers[enemy.row];
        if (!mower.used) { mower.used = true; mower.active = true; this.toast("应急割草车启动！"); this.soundCue(130, 0.18, "sawtooth", 0.035); }
        else if (!mower.active && enemy.sprite.x < 100) this.endGame(false);
      }
    }
  }

  animateEnemyGait(enemy, dt, attacking) {
    const ground = this.groundY(enemy.row);
    const motion = this.reducedMotion ? 0.28 : 1;
    if (attacking) {
      enemy.sprite.anims.pause();
      const pulse = Math.sin(this.elapsed * 8 + enemy.sprite.x * 0.01);
      enemy.sprite.y = ground - Math.max(0, pulse) * 1.5 * motion;
      enemy.sprite.angle = (-1.2 - enemy.attackKick * 5 + pulse * 0.8) * motion;
      enemy.sprite.setScale(enemy.baseScale * (1 + enemy.attackKick * 0.045), enemy.baseScale * (1 - enemy.attackKick * 0.035));
      enemy.shadow.setPosition(enemy.sprite.x + enemy.attackKick * 3, ground + 3).setDisplaySize(enemy.type === "brute" ? 105 : 72, 20).setAlpha(0.24);
      return;
    }

    const slowFactor = enemy.slow > 0 ? 0.58 : 1;
    if (enemy.sprite.anims.currentAnim?.key !== `${enemy.type}-walk`) enemy.sprite.play(`${enemy.type}-walk`);
    else if (!enemy.sprite.anims.isPlaying) enemy.sprite.anims.resume();
    enemy.sprite.anims.timeScale = (this.reducedMotion ? 0.72 : 1) * slowFactor;
    const frame = Number(enemy.sprite.frame.name) % 4;
    const lift = frame === 1 || frame === 3 ? 1 : 0;
    enemy.sprite.y = ground - lift * 2 * motion;
    enemy.sprite.angle = 0;
    enemy.sprite.setScale(enemy.baseScale);
    const shadowWidth = (enemy.type === "brute" ? 105 : 72) * (1 - lift * 0.12 * motion);
    enemy.shadow.setPosition(enemy.sprite.x, ground + 3).setDisplaySize(shadowWidth, 20 - lift * 3 * motion).setAlpha(0.18 + (1 - lift) * 0.08);

    if ((frame === 0 || frame === 2) && frame !== enemy.contactFrame) {
      enemy.contactFrame = frame;
      if (!this.reducedMotion && Math.random() < 0.42) this.footstepDust(enemy);
    }
  }

  footstepDust(enemy) {
    const ground = this.groundY(enemy.row) + 2;
    for (let index = 0; index < 2; index += 1) {
      const dust = this.add.ellipse(enemy.sprite.x + Phaser.Math.Between(-14, 12), ground, Phaser.Math.Between(8, 14), Phaser.Math.Between(3, 6), 0xcabf82, 0.22).setDepth(enemy.sprite.depth - 2);
      this.tweens.add({ targets: dust, x: dust.x + Phaser.Math.Between(8, 20), y: ground - Phaser.Math.Between(3, 9), scaleX: 1.7, scaleY: 1.35, alpha: 0, duration: Phaser.Math.Between(240, 360), ease: "Quad.Out", onComplete: () => dust.destroy() });
    }
  }

  updateProjectiles(dt) {
    const speedBoost = this.weather === "tailwind" ? 1.65 : 1;
    for (const shot of [...this.projectiles]) {
      shot.sprite.x += shot.speed * speedBoost * dt;
      shot.sprite.rotation += dt * 5;
      shot.life -= dt;
      if (Math.random() < 0.45) this.trailSpark(shot.sprite.x - 10, shot.sprite.y, shot.type === "berry-orb" ? 0x6eacff : 0xd3a0ff);
      const hit = this.enemyUnits.find((enemy) => enemy.row === shot.row && Math.abs(enemy.sprite.x - shot.sprite.x) < (enemy.type === "brute" ? 54 : 37));
      if (hit) {
        hit.hp -= shot.damage;
        if (shot.type === "spore-orb") {
          hit.slow = 2.8;
          hit.sprite.setTint(0xd9c1ff);
          this.time.delayedCall(100, () => hit.sprite?.active && hit.sprite.clearTint());
          if (shot.level >= 3) this.splash(hit, shot.damage * 0.45, 115);
        } else {
          this.flash(hit.sprite, 0xbdd7ff);
          if (shot.level >= 3 && Math.random() < 0.3) hit.hp -= shot.damage;
        }
        this.burst(shot.sprite.x, shot.sprite.y, shot.type === "berry-orb" ? 0x6baaff : 0xd2a1ff, 9);
        this.cameras.main.shake(55, 0.0018);
        this.removeProjectile(shot);
        if (hit.hp <= 0) this.defeatEnemy(hit);
      } else if (shot.life <= 0 || shot.sprite.x > WIDTH + 50) this.removeProjectile(shot);
    }
  }

  splash(origin, damage, radius) {
    for (const enemy of [...this.enemyUnits]) {
      if (enemy !== origin && enemy.row === origin.row && Math.abs(enemy.sprite.x - origin.sprite.x) < radius) {
        enemy.hp -= damage; enemy.slow = Math.max(enemy.slow, 1.5);
        if (enemy.hp <= 0) this.defeatEnemy(enemy);
      }
    }
    this.burst(origin.sprite.x, origin.sprite.y, 0xbe7ff0, 18);
  }

  updateMowers(dt) {
    for (const mower of this.mowers) {
      if (!mower.active) continue;
      mower.sprite.x += 650 * dt;
      mower.sprite.angle += Math.sin(this.elapsed * 32) * 1.5;
      for (const enemy of [...this.enemyUnits]) if (enemy.row === mower.row && Math.abs(enemy.sprite.x - mower.sprite.x) < 72) this.defeatEnemy(enemy);
      if (mower.sprite.x > WIDTH + 90) { mower.active = false; mower.sprite.setVisible(false); }
    }
  }

  spawnEnergy(x, y, value) {
    const sprite = this.add.image(x, y, "energy-orb").setScale(0).setDepth(150).setInteractive({ useHandCursor: true });
    sprite.setTint(this.phase === "night" ? 0xcba8ff : 0xffffff);
    const targetY = Phaser.Math.Clamp(y + Phaser.Math.Between(65, 135), 210, 800);
    const orb = { sprite, value, expires: 10 };
    this.orbs.push(orb);
    if (this.hasPlacedPlant && !this.hasCollectedOrb && !this.energyHintShown) {
      this.energyHintShown = true;
      this.time.delayedCall(760, () => this.toast("点击发光能量，补充花园储备"));
    }
    this.tweens.add({ targets: sprite, scale: 1, y: targetY, duration: 700, ease: "Back.Out" });
    this.tweens.add({ targets: sprite, angle: 360, duration: 5000, repeat: -1 });
    sprite.on("pointerdown", (pointer) => {
      pointer.event.stopPropagation?.();
      this.collectOrb(orb);
    });
    this.time.delayedCall(10000, () => { if (sprite.active) this.tweens.add({ targets: sprite, alpha: 0, duration: 450, onComplete: () => this.removeOrb(orb) }); });
  }

  collectOrb(orb) {
    const { sprite, value } = orb;
    if (!sprite?.active || !this.orbs.includes(orb)) return;
    Phaser.Utils.Array.Remove(this.orbs, orb);
    this.energy += value;
    if (!this.hasCollectedOrb) {
      this.hasCollectedOrb = true;
      this.time.delayedCall(420, () => this.toast("在同类植物上再次种植，可以融合升级"));
    }
    this.soundCue(880, 0.08, "sine", 0.025);
    this.burst(sprite.x, sprite.y, this.phase === "day" ? 0xffe265 : 0xcda9ff, 16);
    this.tweens.add({ targets: sprite, x: 78, y: 72, scale: 0.25, alpha: 0, duration: 360, ease: "Cubic.In", onComplete: () => sprite.destroy() });
  }

  removeOrb(orb) { Phaser.Utils.Array.Remove(this.orbs, orb); orb.sprite?.destroy(); }
  removeProjectile(shot) { Phaser.Utils.Array.Remove(this.projectiles, shot); shot.sprite?.destroy(); }

  removePlant(plant) {
    Phaser.Utils.Array.Remove(this.entities, plant);
    this.burst(plant.sprite.x, plant.sprite.y, PLANTS[plant.type].color, 18);
    [plant.sprite, plant.health, plant.healthBg, plant.levelText].forEach((object) => object.destroy());
  }

  defeatEnemy(enemy) {
    if (!this.enemyUnits.includes(enemy)) return;
    this.energy += ENEMIES[enemy.type].reward;
    Phaser.Utils.Array.Remove(this.enemyUnits, enemy);
    this.burst(enemy.sprite.x, enemy.sprite.y, 0xa5c789, enemy.type === "brute" ? 28 : 18);
    this.soundCue(180, 0.045, "triangle", 0.016);
    enemy.sprite.clearTint().setAngle(0).setScale(enemy.baseScale).play(`${enemy.type}-die`);
    this.tweens.add({ targets: enemy.shadow, alpha: 0, scaleX: 1.3, duration: 620, ease: "Quad.Out", onComplete: () => enemy.shadow.destroy() });
    this.time.delayedCall(420, () => {
      if (enemy.sprite.active) this.tweens.add({ targets: enemy.sprite, alpha: 0, duration: 320, ease: "Quad.In", onComplete: () => enemy.sprite.destroy() });
    });
    enemy.health.destroy(); enemy.healthBg.destroy();
  }

  updateHUD() {
    this.energyText.setText(Math.floor(this.energy));
    this.phaseLabel.setText(this.phase === "day" ? "暖阳阶段" : "月影阶段").setColor(this.phase === "day" ? "#ffe27a" : "#d4b7ff");
    this.phaseBar.width = Math.max(1, 160 * this.phaseTime / PHASE_DURATION);
    this.phaseBar.fillColor = this.phase === "day" ? 0xffd65a : 0xb889f0;
    this.waveText.setText(`波次 ${this.wave} / ${TOTAL_WAVES}`);
    this.weatherText.setText(this.weather === "sunshower" ? "天气 · 太阳雨" : this.weather === "tailwind" ? "天气 · 顺风" : "天气 · 平静");
    this.cards?.forEach((card) => this.drawCard(card));
    this.tools?.forEach((tool) => this.drawTool(tool));
    this.updateToolbox();
    for (const plant of this.entities) {
      const hurt = plant.hp < plant.maxHp;
      plant.healthBg.setVisible(hurt).setPosition(plant.sprite.x, plant.sprite.y + 8);
      plant.health.setVisible(hurt).setPosition(plant.sprite.x - 36, plant.sprite.y + 8).setDisplaySize(72 * Math.max(0, plant.hp / plant.maxHp), 7);
      plant.levelText.setPosition(plant.sprite.x, plant.sprite.y - 105);
    }
  }

  togglePause() {
    if (!this.started || this.ended) return;
    this.isPaused = !this.isPaused;
    this.tweens.timeScale = this.isPaused ? 0 : 1;
    this.pauseButton.text.setText(this.isPaused ? "▶" : "Ⅱ");
    this.toast(this.isPaused ? "花园暂停了呼吸" : "继续守护");
  }

  endGame(won) {
    if (this.ended) return;
    this.ended = true;
    this.tweens.timeScale = 1;
    const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07120c, 0.72).setDepth(300).setInteractive();
    const panel = this.add.graphics().setDepth(301);
    panel.fillStyle(0x10271b, 0.98); panel.fillRoundedRect(485, 260, 630, 350, 32);
    panel.lineStyle(2, won ? 0xffdf71 : 0xe67863, 0.4); panel.strokeRoundedRect(485, 260, 630, 350, 32);
    const title = this.add.text(800, 350, won ? "黎明守住了" : "花园陷入沉睡", { fontFamily: '"Noto Sans SC"', fontSize: 40, fontStyle: "bold", color: won ? "#fff0ac" : "#ffd0c7" }).setOrigin(0.5).setDepth(302);
    const copy = this.add.text(800, 420, won ? "六波怪客全部退散，新的种子正在发芽。" : "重新编排守卫，利用融合和昼夜共鸣再试一次。", { fontSize: 15, color: "#adc1b1" }).setOrigin(0.5).setDepth(302);
    const button = this.add.rectangle(800, 520, 230, 58, 0xffd15c, 1).setDepth(302).setInteractive({ useHandCursor: true });
    const label = this.add.text(800, 520, "再守一夜", { fontFamily: '"Noto Sans SC"', fontSize: 18, fontStyle: "bold", color: "#3d2a08" }).setOrigin(0.5).setDepth(303);
    button.on("pointerdown", () => this.scene.restart());
    this.add.container(0, 0, [shade, panel, title, copy, button, label]).setDepth(300);
    if (won) this.burst(800, 250, 0xffe074, 55);
  }

  flash(sprite, tint) {
    if (!sprite?.active) return;
    sprite.setTintFill(tint);
    this.time.delayedCall(65, () => sprite?.active && sprite.clearTint());
  }

  burst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.Between(18, 90);
      const dot = this.add.image(x, y, "spark").setTint(color).setScale(Phaser.Math.FloatBetween(0.25, 0.9)).setDepth(220);
      this.tweens.add({ targets: dot, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance + 24, alpha: 0, scale: 0, duration: Phaser.Math.Between(280, 620), ease: "Quad.Out", onComplete: () => dot.destroy() });
    }
  }

  trailSpark(x, y, color) {
    const dot = this.add.image(x, y + Phaser.Math.Between(-5, 5), "spark").setTint(color).setScale(0.35).setAlpha(0.65).setDepth(70);
    this.tweens.add({ targets: dot, x: x - 25, alpha: 0, scale: 0, duration: 190, onComplete: () => dot.destroy() });
  }

  windStreak() {
    const y = Phaser.Math.Between(190, 830);
    const line = this.add.rectangle(-100, y, Phaser.Math.Between(70, 150), 2, 0xe6f4dc, 0.22).setDepth(75).setAngle(-4);
    this.tweens.add({ targets: line, x: WIDTH + 150, duration: Phaser.Math.Between(900, 1500), onComplete: () => line.destroy() });
  }

  toast(message) {
    this.toastText.setText(message);
    const width = Math.max(220, this.toastText.width + 48);
    this.toastBg.clear(); this.toastBg.fillStyle(0x0d2519, 0.93); this.toastBg.fillRoundedRect(WIDTH / 2 - width / 2, 204, width, 43, 22); this.toastBg.lineStyle(1, 0xffffff, 0.13); this.toastBg.strokeRoundedRect(WIDTH / 2 - width / 2, 204, width, 43, 22);
    this.tweens.killTweensOf([this.toastBg, this.toastText]);
    this.toastBg.setAlpha(0); this.toastText.setAlpha(0);
    this.tweens.add({ targets: [this.toastBg, this.toastText], alpha: 1, yoyo: true, hold: 1250, duration: 170 });
  }

  soundCue(frequency, duration, type = "sine", volume = 0.02) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext ??= new AudioContext();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
      oscillator.connect(gain); gain.connect(this.audioContext.destination);
      oscillator.start(); oscillator.stop(this.audioContext.currentTime + duration);
    } catch { /* Audio is an enhancement; gameplay remains available. */ }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  width: WIDTH,
  height: HEIGHT,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  backgroundColor: "#173825",
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: "high-performance" },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GameScene],
});
