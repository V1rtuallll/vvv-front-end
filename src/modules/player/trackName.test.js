import { describe, expect, it } from "vitest";

import { formatTrackName } from "@/modules/player/trackName";

describe("formatTrackName", () => {
  it("去掉扩展名与「艺人 - 」前缀", () => {
    expect(formatTrackName("Sewerslvt - Lexapro Delirium.mp3")).toBe("Lexapro Delirium");
    expect(formatTrackName("Iwakura - farlands.mp3")).toBe("farlands");
  });

  it("扩展名整段去掉，flac 不会剩个点", () => {
    expect(formatTrackName("M2U-BlythE.flac")).toBe("M2U-BlythE");
  });

  it("没有「 - 」时把下划线换成空格", () => {
    expect(formatTrackName("a_b_c.mp3")).toBe("a b c");
  });

  /**
   * 曲目名一路从后端配置来。空列表时下标会取到 undefined，
   * 这里抛一个 undefined.replace 就会把整个播放器挂掉 —— 所以必须兜住。
   */
  it("拿到非字符串时返回空串而不是抛", () => {
    expect(formatTrackName(undefined)).toBe("");
    expect(formatTrackName(null)).toBe("");
    expect(formatTrackName("")).toBe("");
  });
});
