import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentChinaTime } from "@/utils/date";

describe("getCurrentChinaTime", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("按中国时区输出 ISO 8601 字符串", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T00:30:00Z")); // 北京时间 08:30
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(getCurrentChinaTime()).toBe("2026-09-12T08:30:00");
  });
});
