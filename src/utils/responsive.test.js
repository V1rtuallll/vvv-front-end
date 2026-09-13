import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HOVER_MEDIA_QUERY,
  isNarrowViewport,
  supportsHover,
} from "@/utils/responsive";

function stubMatchMedia(matches) {
  const matchMedia = vi.fn(() => ({ matches }));
  return { matchMedia };
}

describe("supportsHover", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("media query 命中时返回 true（桌面指针设备）", () => {
    expect(supportsHover(stubMatchMedia(true))).toBe(true);
  });

  it("media query 未命中时返回 false（触屏设备）", () => {
    expect(supportsHover(stubMatchMedia(false))).toBe(false);
  });

  it("用 (hover: hover) 作为判定依据", () => {
    const win = stubMatchMedia(false);

    supportsHover(win);

    expect(win.matchMedia).toHaveBeenCalledWith(HOVER_MEDIA_QUERY);
  });

  it("运行环境没有 matchMedia 时按支持 hover 处理", () => {
    expect(supportsHover({})).toBe(true);
    expect(supportsHover(null)).toBe(true);
  });

  it("matchMedia 抛异常时回退到支持 hover", () => {
    const win = {
      matchMedia: () => {
        throw new Error("unsupported");
      },
    };

    expect(supportsHover(win)).toBe(true);
  });
});

describe("isNarrowViewport", () => {
  it("宽度等于断点时按窄屏处理", () => {
    expect(isNarrowViewport({ innerWidth: 768 })).toBe(true);
  });

  it("宽度小于断点时按窄屏处理", () => {
    expect(isNarrowViewport({ innerWidth: 360 })).toBe(true);
  });

  it("宽度大于断点时按宽屏处理", () => {
    expect(isNarrowViewport({ innerWidth: 1024 })).toBe(false);
  });

  it("可以指定自定义断点", () => {
    expect(isNarrowViewport({ innerWidth: 480 }, 480)).toBe(true);
    expect(isNarrowViewport({ innerWidth: 481 }, 480)).toBe(false);
  });

  it("无法读取宽度时按宽屏处理", () => {
    expect(isNarrowViewport(null)).toBe(false);
    expect(isNarrowViewport({})).toBe(false);
  });
});
