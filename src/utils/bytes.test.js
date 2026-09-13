import { describe, expect, it } from "vitest";

import { formatBytes } from "@/utils/bytes";

describe("formatBytes", () => {
  it("按 1024 进位换算单位", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024 * 5)).toBe("5 MB");
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe("2 GB");
  });

  it("保留两位小数", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("非法或非正数返回空串，调用方据此不展示提示", () => {
    expect(formatBytes(0)).toBe("");
    expect(formatBytes(-1)).toBe("");
    expect(formatBytes(undefined)).toBe("");
    expect(formatBytes(NaN)).toBe("");
  });
});
