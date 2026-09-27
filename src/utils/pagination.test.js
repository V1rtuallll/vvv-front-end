import { describe, expect, it } from "vitest";

import { pageNumbers, parsePageParam } from "@/utils/pagination";

/** 省略号在页码序列里的占位值 */
const GAP = "…";

describe("parsePageParam", () => {
  it("合法页码解析成整数", () => {
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam(" 12 ")).toBe(12);
  });

  it("缺省、非数字、非正数一律当第一页", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam("")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
  });

  it("重复的 query 参数取第一个", () => {
    expect(parsePageParam(["2", "5"])).toBe(2);
  });
});

describe("pageNumbers", () => {
  it("当前页居中，首尾页常显，中间折叠", () => {
    expect(pageNumbers(6, 20)).toEqual([1, GAP, 4, 5, 6, 7, 8, GAP, 20]);
  });

  it("窗口贴左边界时左边不折叠", () => {
    expect(pageNumbers(2, 20)).toEqual([1, 2, 3, 4, GAP, 20]);
  });

  it("窗口贴右边界时右边不折叠", () => {
    expect(pageNumbers(19, 20)).toEqual([1, GAP, 17, 18, 19, 20]);
  });

  it("页数少时退化成平铺，不出现孤立的省略号", () => {
    expect(pageNumbers(5, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("只有一页时只返回那一页", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
  });

  it("没有页时不返回任何页码", () => {
    expect(pageNumbers(1, 0)).toEqual([]);
  });

  it("当前页越界时收敛到范围内的那一页", () => {
    expect(pageNumbers(999, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
