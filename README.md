# 花园守夜人 · Garden Wardens

**中文** · [English](README.en.md)

一款原创手绘风 WebGL 植物塔防游戏，使用 Phaser 3 与 Vite 构建，支持桌面和移动浏览器。

**[在线试玩 →](https://synapshift.github.io/garden-wardens/)** · 无需安装，打开浏览器即可游玩

![花园守夜人游戏画面](assets/gameplay-preview.png)

## 游戏特色

- 5 条草地防线、9 列种植位和 6 波渐进关卡
- 4 种原创植物守卫与 4 种原创花园怪客
- 昼夜共鸣、三级融合、动态天气和击杀能量回收
- 能量工具系统：自动收集、随机种匣与全园火力强化
- 手绘透明角色精灵与独立战场背景
- 呼吸、摇摆、种植、攻击后坐力及敌人步行动画
- 弹体尾迹、爆裂粒子、受击闪白、减速染色和镜头震动
- Web Audio 合成反馈音，无需额外音频素材
- 支持键盘、鼠标和触控操作

## 操作方式

- 点击顶部守卫卡片，或按 `1`–`4` 选择植物
- 点击草坪格子种植
- 在同类植物上再次种植，融合到 2–3 级
- 点击发光能量球进行收集
- 按空格键或右上角按钮暂停

## 原创机制

**昼夜共鸣：** 每 32 秒昼夜轮换。暖阳阶段加快辉光花产能；月影阶段显著提升星雾菇的施法速度。

**融合种植：** 同类植物可以原地融合，恢复并提高生命上限。三级植物还会解锁强化能力。

**动态天气：** 太阳雨会降下额外能量；顺风会提高所有弹体速度，让同一套阵容产生不同节奏。

## 本地运行

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 美术资源管线

角色原图位于 `assets/source/`，可通过脚本处理为游戏所需的透明精灵：

```bash
python tools/process_assets.py
```

需要 Python、Pillow 和 NumPy，输出目录为 `public/assets/sprites/`。

## 项目结构

```text
├── .github/workflows/       # GitHub Pages 自动部署
├── assets/source/           # 角色源图
├── public/assets/           # 游戏背景与透明精灵
├── src/main.js              # Phaser 场景、战斗与特效
├── tools/process_assets.py  # 素材处理脚本
├── index.html
├── styles.css
└── LICENSE
```

## 开源许可

代码使用 [MIT License](LICENSE)。游戏名称、角色和当前美术均按原创项目设计，没有包含其他游戏的代码或素材。

欢迎提交 Issue 和 Pull Request。
