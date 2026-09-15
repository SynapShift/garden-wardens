# 花园守夜人 · Garden Wardens

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

AI 生成或辅助生成的美术在不同地区可能适用不同规则；发布前请根据目标平台和所在地确认相关政策。后续引入第三方字体、音乐或素材时，应在仓库中记录来源和许可证。

欢迎提交 Issue 和 Pull Request。
