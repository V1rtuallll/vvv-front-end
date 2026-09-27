import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stashResume, takeResume } from "@/modules/gallery/resume";

const SRC = "https://cdn.example.test/imgs/a.png";

/** 取过就不该再留在槽里：留着会落到下一次不相干的打开上 */
const takeTwice = () => [takeResume(SRC), takeResume(SRC)];

describe("点详情时拍下的播放进度快照", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 每个用例从空槽开始：这一格是模块级的，上一轮留下的快照会串进来
    takeResume(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("存进去的三项原样取回来", () => {
    stashResume(SRC, { mediaIndex: 2, mediaTime: 37.5, bgmTime: 12.25 });

    expect(takeResume(SRC)).toMatchObject({ mediaIndex: 2, mediaTime: 37.5, bgmTime: 12.25 });
  });

  it("取过一次就清空，第二次拿到 null", () => {
    stashResume(SRC, { mediaIndex: 1 });

    expect(takeTwice()).toEqual([expect.objectContaining({ mediaIndex: 1 }), null]);
  });

  /** 快照是给某一件作品的，比对的是标识而不是「有没有」 */
  it("src 对不上时返回 null，并且照样把槽清掉", () => {
    stashResume(SRC, { mediaIndex: 2 });

    expect(takeResume("https://cdn.example.test/imgs/b.png")).toBeNull();
    expect(takeResume(SRC)).toBeNull();
  });

  /**
   * 详情没打开成功时这一格不会被取走。不设期限的话它会一直留着，
   * 之后某次深链恰好落在同一件作品上，就会莫名其妙地从中间开始。
   */
  it("超过有效期就不再使用", () => {
    stashResume(SRC, { mediaIndex: 2 });

    vi.advanceTimersByTime(60_000);

    expect(takeResume(SRC)).toBeNull();
  });

  it("没有 src 时不记：没有标识就没法确认取到的是同一件作品", () => {
    stashResume(null, { mediaIndex: 2 });

    expect(takeResume(null)).toBeNull();
  });

  /**
   * 不进度的值不该被当成进度带过去：`currentTime` 在元素还没起播时是 0，
   * 图片作品的视频进度、没播 BGM 的作品的音乐进度也都是 0。
   * 存成 0 与不存的区别在于详情那边要不要跳，而跳到一个本来就是 0 的位置没有意义。
   */
  it("0 与不是数字的进度一律记成 null", () => {
    stashResume(SRC, { mediaIndex: -3, mediaTime: 0, bgmTime: Number.NaN });

    expect(takeResume(SRC)).toMatchObject({ mediaIndex: 0, mediaTime: null, bgmTime: null });
  });

  it("页码取整；负数与乱填的一律落到 0", () => {
    stashResume(SRC, { mediaIndex: "2.9" });
    expect(takeResume(SRC).mediaIndex).toBe(2);

    stashResume(SRC, { mediaIndex: "第三张" });
    expect(takeResume(SRC).mediaIndex).toBe(0);
  });
});
