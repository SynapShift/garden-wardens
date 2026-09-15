# 花园守夜人 · Garden Wardens

[中文](#中文) · [English](#english)

## 中文

一个原创、手绘风格的 WebGL 植物塔防游戏。项目使用 Phaser 3 + Vite 构建，支持桌面和移动浏览器，可直接部署到 GitHub Pages。

![花园守夜人游戏画面](assets/gameplay-preview.png)

## 现在已经有什么

- 5 条草地防线、9 列种植位和 6 波渐进关卡
- 4 种原创植物守卫与 4 种原创花园怪客
- 昼夜共鸣、三级融合、动态天气和击杀能量回收
- 手绘透明角色精灵与独立战场背景
- 精灵呼吸/摇摆、种植弹性动画、攻击后坐力和敌人步行动画
- 弹体尾迹、爆裂粒子、受击闪白、减速染色和镜头震动
- Web Audio 合成反馈音，无需额外音频素材
- 键盘、鼠标和触控操作
- GitHub Actions 自动部署 Pages

## 本地运行

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

终端会显示本地试玩地址。生产构建：

```bash
npm run build
npm run preview
```

## 操作

- 点击顶部守卫卡片，或按 `1`–`4` 选择植物。
- 点击草坪格子种植。
- 在同类植物上再次种植，融合到 2–3 级。
- 点击发光能量球进行收集。
- 按空格键或右上角按钮暂停。

## 原创机制

### 昼夜共鸣

每 32 秒昼夜轮换。暖阳阶段加快辉光花产能；月影阶段显著提升星雾菇的施法速度。

### 融合种植

同类植物可以原地融合，恢复并提高生命上限。三级蓝莓炮有额外伤害概率，三级星雾菇获得范围伤害。

### 动态天气

太阳雨会降下额外能量；顺风会提高所有弹体速度。天气让同一套阵容产生不同节奏。

## 美术资源管线

生成后的角色原图位于 `assets/source/`。为了得到适合游戏运行的透明精灵，仓库包含可复现的处理脚本：

```bash
python tools/process_assets.py
```

需要 Python、Pillow 和 NumPy。脚本会进行边缘连通背景分割、相邻角色清理、透明边缘柔化以及 512×512 标准化，结果输出到 `public/assets/sprites/`。

## GitHub Pages

仓库内置 `.github/workflows/deploy-pages.yml`。推送到 `main` 或 `master` 后，在仓库 **Settings → Pages → Source** 中选择 **GitHub Actions** 即可自动发布。

## 项目结构

```text
.
├── .github/workflows/       # GitHub Pages 自动部署
├── assets/
│   ├── source/              # 可复现的生成源图
│   ├── gameplay-preview.png
│   └── garden-defense-concept.png
├── public/assets/
│   ├── sprites/             # 8 个透明角色精灵
│   ├── favicon.svg
│   └── garden-battlefield.png
├── src/main.js              # Phaser 场景、战斗和特效
├── tools/process_assets.py  # 素材清理与切分
├── index.html
├── styles.css
├── package.json
└── LICENSE
```

## 开源与版权

代码使用 [MIT License](LICENSE)。游戏名称、角色和当前美术均按原创项目设计，没有打包其他游戏的代码或素材。

欢迎提交 Issue 和 Pull Request。

---

## English

An original hand-painted WebGL garden-defense game built with Phaser 3 and Vite. It supports desktop and mobile browsers and is playable directly through GitHub Pages.

![Garden Wardens gameplay](assets/gameplay-preview.png)

### Features

- Five garden lanes, nine planting columns, and six progressively harder waves
- Four original plant wardens and four original garden invaders
- Day/night resonance, three-level plant fusion, dynamic weather, and energy recovery
- Hand-painted transparent character sprites and a dedicated battlefield background
- Breathing, swaying, planting, recoil, and walking animations
- Projectile trails, burst particles, hit flashes, slow effects, and camera shake
- Synthesized Web Audio feedback with no additional audio files
- Keyboard, mouse, and touch controls
- Automatic GitHub Pages deployment through GitHub Actions

### Run locally

Node.js 20 or newer is required.

```bash
npm install
npm run dev
```

The development URL will appear in the terminal. To test the production build:

```bash
npm run build
npm run preview
```

### Controls

- Select a warden card at the top, or press `1`–`4`.
- Click or tap a lawn tile to plant.
- Plant the same type on an occupied tile to fuse it to level 2 or 3.
- Click or tap glowing energy orbs to collect them.
- Press Space or use the button in the top-right corner to pause.

### Original mechanics

#### Day/night resonance

Day and night alternate every 32 seconds. Glowblooms produce energy faster in daylight, while Starshrooms cast significantly faster under moonlight.

#### Plant fusion

Wardens of the same type can fuse in place, restoring health and increasing maximum health. Level-three Blueberry Cannons can deal bonus damage, while level-three Starshrooms gain area damage.

#### Dynamic weather

Sunshowers generate extra energy, while tailwinds increase every projectile's speed. Each weather event changes the rhythm of the same formation.

### Art asset pipeline

Generated source artwork is stored in `assets/source/`. The repository includes a reproducible processing script that creates transparent, game-ready sprites:

```bash
python tools/process_assets.py
```

It requires Python, Pillow, and NumPy. The script segments connected backgrounds, removes adjacent characters, softens transparent edges, normalizes each sprite to 512×512, and writes the results to `public/assets/sprites/`.

### GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`. After pushing to `main` or `master`, select **GitHub Actions** under **Settings → Pages → Source** to enable automatic deployment.

### Project structure

```text
.
├── .github/workflows/       # GitHub Pages deployment
├── assets/
│   ├── source/              # Reproducible source artwork
│   ├── gameplay-preview.png
│   └── garden-defense-concept.png
├── public/assets/
│   ├── sprites/             # Eight transparent character sprites
│   ├── favicon.svg
│   └── garden-battlefield.png
├── src/main.js              # Phaser scene, combat, and effects
├── tools/process_assets.py  # Asset cleanup and sprite extraction
├── index.html
├── styles.css
├── package.json
└── LICENSE
```

### Open source and copyright

The code is released under the [MIT License](LICENSE). The game title, characters, and current artwork were designed as an original project; no code or assets from other games are included.

Issues and pull requests are welcome.
