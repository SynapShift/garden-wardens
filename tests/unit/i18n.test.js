import { afterEach, expect, it, vi } from "vitest";
import {
  messages,
  translate,
  getLanguage,
  setLanguage,
  subscribe,
  localizedText,
  bindPage,
} from "../../src/i18n.js";
afterEach(() => setLanguage("zh-CN"));
it("defaults to Mandarin, validates locale, notifies only on change", () => {
  expect(getLanguage()).toBe("zh-CN");
  expect(translate("辉光花")).toBe("辉光花");
  const listener = vi.fn();
  const unsubscribe = subscribe(listener);
  expect(() => setLanguage("fr")).toThrow(RangeError);
  setLanguage("en");
  setLanguage("en");
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
});
it("translates every static and interpolated message including nested plant names", () => {
  setLanguage("en");
  for (const [key, value] of Object.entries(messages)) {
    const source = key.replace(/\{\d+\}/g, "7");
    expect(translate(source)).toBe(value.replace(/\{\d+\}/g, "7"));
  }
  expect(translate("蓝莓炮 融合至 LV.3")).toBe("Berry Cannon fused to LV.3");
  expect(translate("月夜减速  ·  125")).toBe("Night slowing  ·  125");
  expect(translate("unknown")).toBe("unknown");
  expect(translate(10)).toBe(10);
});
it("updates live canvas labels and removes subscriptions when destroyed", () => {
  let destroy;
  const text = {
    setText: vi.fn(),
    once: (_event, callback) => {
      destroy = callback;
    },
  };
  const scene = { add: { text: vi.fn(() => text) } };
  const label = localizedText(scene, 10, 20, "辉光花", {});
  setLanguage("en");
  expect(text.setText).not.toBeUndefined();
  expect(label.setText("蓝莓炮")).toBe(text);
  setLanguage("zh-CN");
  destroy();
  setLanguage("en");
  expect(scene.add.text).toHaveBeenCalledWith(10, 20, "辉光花", {});
});
it("updates page labels, accessibility, metadata and selector", () => {
  let change;
  const select = {
    value: "zh-CN",
    addEventListener: (_type, fn) => {
      change = fn;
    },
  };
  const label = { dataset: { zh: "花园守夜人" }, textContent: "" };
  const game = { setAttribute: vi.fn() },
    meta = { setAttribute: vi.fn() };
  const document = {
    documentElement: { lang: "" },
    title: "",
    querySelectorAll: () => [label],
    querySelector: (key) =>
      key === "#language" ? select : key === "#game-container" ? game : meta,
  };
  bindPage(document);
  expect(document.documentElement.lang).toBe("zh-CN");
  select.value = "en";
  change();
  expect(label.textContent).toBe("Garden Wardens");
  expect(document.title).toBe("Garden Wardens");
  expect(game.setAttribute).toHaveBeenLastCalledWith(
    "aria-label",
    "Garden Wardens game",
  );
  setLanguage("zh-CN");
  expect(document.title).toContain("花园守夜人");
});
