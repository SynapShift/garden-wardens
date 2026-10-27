// Locale keys retain the original Mandarin copy to preserve the default experience.
export const messages = {
  辉光花: "Glowbloom",
  昼光产能: "Day energy",
  蓝莓炮: "Berry Cannon",
  高速单攻: "Rapid fire",
  南瓜卫士: "Pumpkin Guard",
  坚固防线: "Sturdy shield",
  星雾菇: "Starshroom",
  月夜减速: "Night slowing",
  花园正在苏醒: "The garden awakens",
  准备就绪: "Ready",
  花园能量: "Garden energy",
  暖阳阶段: "Sunlight",
  月影阶段: "Moonlight",
  "波次 {0} / {1}": "Wave {0} / {1}",
  "天气 · 平静": "Weather · Calm",
  "天气 · 太阳雨": "Weather · Sunshower",
  "天气 · 顺风": "Weather · Tailwind",
  拾光藤: "Lightvine",
  自动收集: "Auto collect",
  奇趣种匣: "Seed Box",
  随机奇遇: "Random gift",
  荆棘工坊: "Workshop",
  全园火力: "Garden firepower",
  花园工具箱: "Garden tools",
  可用: "Ready",
  已启用: "Active",
  "{0} 光": "{0} energy",
  "{0}  ·  {1}": "{0}  ·  {1}",
  拾光藤正在替你收集能量: "Lightvine is collecting energy for you",
  "拾光藤还需要 {0} 点能量": "Lightvine needs {0} more energy",
  "拾光藤苏醒 · 能量球将自动归仓":
    "Lightvine awakens · Energy is collected automatically",
  "奇趣种匣还需要 {0} 点能量": "Seed Box needs {0} more energy",
  "种匣开出丰收日 · 获得 220 能量": "Harvest gift · Gained 220 energy",
  "种匣开出春露 · 全园恢复生命": "Spring dew · All wardens healed",
  "种匣开出奇种 · {0} 免费升级": "Rare seed · {0} upgraded for free",
  "奇种已满园 · 转化为 180 能量": "All wardens upgraded · Gained 180 energy",
  "种匣开出霜风 · 全场怪客受创减速":
    "Frost wind · All invaders damaged and slowed",
  荆棘工坊已强化至最高等级: "Workshop is at maximum level",
  "火力强化还需要 {0} 点能量": "Firepower upgrade needs {0} more energy",
  "荆棘工坊强化至 {0} 级 · 弹体威力提升":
    "Workshop level {0} · Projectile power increased",
  守住这座会呼吸的花园: "Guard this living garden",
  "昼夜会改变守卫能力，天气会改变战场节奏。\n在同类植物上再次种植，融合出更强形态。":
    "Day and night change your wardens; weather shapes the battle.\nPlant the same warden on a tile to fuse stronger forms.",
  开始守护: "Start guarding",
  "先选择守卫，在草坪上种下第一株植物":
    "Select a warden, then plant it on the lawn",
  这里已经住着另一位守卫: "A different warden already occupies this tile",
  已经达到最高融合等级: "Maximum fusion level reached",
  "融合需要 {0} 点能量": "Fusion costs {0} energy",
  "{0} 融合至 LV.{1}": "{0} fused to LV.{1}",
  "融合完成 · 继续搭配守卫，守住五条草坪":
    "Fusion complete · Defend all five lanes",
  "还需要 {0} 点能量": "Need {0} more energy",
  "辉光花会产出能量 · 点击发光能量收集":
    "Glowblooms produce energy · Tap glowing orbs to collect",
  "种下辉光花，持续补充花园能量":
    "Plant Glowblooms for a steady supply of energy",
  "第 {0} 路  来袭  ◀": "Lane {0} · Incoming ◀",
  "暖阳回归 · 辉光花产能加速": "Sunlight returns · Glowblooms produce faster",
  "月影降临 · 星雾菇进入共鸣": "Moonlight falls · Starshrooms resonate",
  天气恢复平静: "The weather is calm again",
  "太阳雨 · 额外能量正在坠落": "Sunshower · Extra energy is falling",
  "顺风 · 弹体获得疾速加成": "Tailwind · Projectiles move faster",
  "第 {0} 波 · 新的怪客加入战场": "Wave {0} · New invaders approach",
  "应急割草车启动！": "Emergency mower activated!",
  "点击发光能量，补充花园储备": "Tap glowing energy to replenish your reserves",
  "在同类植物上再次种植，可以融合升级":
    "Plant the same warden on its tile to fuse and upgrade",
  花园暂停了呼吸: "Garden paused",
  继续守护: "Guarding resumed",
  黎明守住了: "Dawn is safe",
  花园陷入沉睡: "The garden sleeps",
  "六波怪客全部退散，新的种子正在发芽。":
    "All six waves defeated. New seeds are sprouting.",
  "重新编排守卫，利用融合和昼夜共鸣再试一次。":
    "Try again with fusion, new formations and day/night resonance.",
  再守一夜: "Guard again",
  花园守护中: "Guarding the garden",
  花园守夜人: "Garden Wardens",
  花园守夜人游戏: "Garden Wardens game",
  选择守卫: "Select warden",
  空格: "Space",
  暂停: "Pause",
  点击: "Tap",
  "种植 / 融合 / 收集": "Plant / Fuse / Collect",
  "开源项目 · MIT": "Open source · MIT",
  "花园守夜人——原创手绘风 WebGL 植物塔防游戏。":
    "Garden Wardens — a hand-painted WebGL garden defense game.",
};
let language = "zh-CN";
const listeners = new Set();
const patterns = Object.entries(messages)
  .filter(([key]) => key.includes("{0}"))
  .map(([key, value]) => ({
    pattern: new RegExp(
      "^" +
        key
          .split(/\{\d+\}/)
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("(.+?)") +
        "$",
      "s",
    ),
    value,
  }));
export function getLanguage() {
  return language;
}
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function setLanguage(value) {
  if (!["zh-CN", "en"].includes(value))
    throw new RangeError("Unsupported language");
  if (value === language) return;
  language = value;
  listeners.forEach((listener) => listener());
}
export function translate(source) {
  if (language === "zh-CN" || typeof source !== "string") return source;
  if (messages[source]) return messages[source];
  for (const { pattern, value } of patterns) {
    const match = source.match(pattern);
    if (match)
      return value.replace(/\{(\d+)\}/g, (_, index) =>
        translate(match[Number(index) + 1]),
      );
  }
  return source;
}
// Keep each label's Mandarin source so language changes never alter game state.
// Phaser emits destroy when its scene is restarted; remove that subscription then.
export function localizedText(scene, x, y, source, style) {
  const text = scene.add.text(x, y, translate(source), style);
  const originalSetText = text.setText.bind(text);
  text.setText = (value) => {
    source = value;
    originalSetText(translate(value));
    return text;
  };
  const unsubscribe = subscribe(() => originalSetText(translate(source)));
  text.once("destroy", unsubscribe);
  return text;
}
export function bindPage(document) {
  const select = document.querySelector("#language");
  const labels = [...document.querySelectorAll("[data-zh]")];
  const update = () => {
    document.documentElement.lang = language;
    document.title =
      language === "en" ? "Garden Wardens" : "花园守夜人 · Garden Wardens";
    labels.forEach((label) => {
      label.textContent = translate(label.dataset.zh);
    });
    document
      .querySelector("#game-container")
      .setAttribute("aria-label", translate("花园守夜人游戏"));
    document
      .querySelector('meta[name="description"]')
      .setAttribute(
        "content",
        translate("花园守夜人——原创手绘风 WebGL 植物塔防游戏。"),
      );
    select.value = language;
  };
  select.addEventListener("change", () => setLanguage(select.value));
  subscribe(update);
  update();
}
