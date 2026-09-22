import { describe, expect, it } from "vitest";

import { coverOf, mediaListOf } from "@/modules/gallery/media";

const PHOTO_A = { id: 11, src: "/a.png", type: "photo" };
const PHOTO_B = { id: 12, src: "/b.png", type: "photo" };

describe("作品封面的取法", () => {
  /**
   * 封面在服务端下了两份：列表行的 src / type 与 media[0]。两者之间没有外键、也没有唯一约束，
   * 谁也不保证另一份被同步更新 —— 所以 media 非空时一律以 media[0] 为准。
   */
  it("media 非空时以 media[0] 为准，不看行上的 src", () => {
    const item = { src: "/stale.png", type: "video", media: [PHOTO_A, PHOTO_B] };

    expect(coverOf(item)).toBe(PHOTO_A);
  });

  /** 列表接口不带媒体时（BGM 候选、回填之前的历史行）只有行上那一份可用 */
  it("media 为空或缺失时回落到 src / type", () => {
    expect(coverOf({ src: "/a.png", type: "photo" })).toMatchObject({ src: "/a.png", type: "photo" });
    expect(coverOf({ src: "/a.png", type: "photo", media: [] })).toMatchObject({ src: "/a.png", type: "photo" });
  });

  it("没有条目时给一个空封面，而不是抛错", () => {
    expect(coverOf(null)).toMatchObject({ src: null, type: null });
  });
});

describe("详情弹窗要翻的媒体列表", () => {
  it("media 非空时原样返回", () => {
    expect(mediaListOf({ media: [PHOTO_A, PHOTO_B] })).toEqual([PHOTO_A, PHOTO_B]);
  });

  /**
   * 空数组是合法形状，表示「这条作品只登记了封面这一条」。按「没有媒体」渲染会留出
   * 一片空白，而封面明明还在。
   */
  it("media 为空时兜底成只有封面的一条", () => {
    expect(mediaListOf({ src: "/a.png", type: "photo" }))
      .toEqual([{ id: null, src: "/a.png", type: "photo" }]);
  });

  it("没有条目时返回空数组", () => {
    expect(mediaListOf(null)).toEqual([]);
  });
});
