import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import { usePageQuery } from "@/utils/usePageQuery";

/**
 * 在真实路由里挂一个只调用 usePageQuery 的空组件。
 * 用真路由而不是替身：这一层要验的就是「地址变了会怎样」，替身把地址变化模拟出来
 * 就等于替被测逻辑把活干了。
 */
async function mountPager(path = "/list") {
  const load = vi.fn();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/list", component: { template: "<div />" } }],
  });
  await router.push(path);
  await router.isReady();

  let api;
  mount(
    { setup() { api = usePageQuery(load); return () => null; } },
    { global: { plugins: [router] } },
  );

  return { api, router, load };
}

describe("usePageQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("挂载时从地址里读页码", async () => {
    expect((await mountPager("/list?page=3")).api.page.value).toBe(3);
  });

  it("地址里没有页码或页码非法时落在第一页", async () => {
    expect((await mountPager("/list")).api.page.value).toBe(1);
    expect((await mountPager("/list?page=abc")).api.page.value).toBe(1);
    expect((await mountPager("/list?page=0")).api.page.value).toBe(1);
  });

  it("翻页把页码写进地址并重新取数", async () => {
    const { api, router, load } = await mountPager("/list");

    api.goTo(3);
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBe("3");
    expect(api.page.value).toBe(3);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("回到第一页时把页码从地址里摘掉，地址保持干净", async () => {
    const { api, router } = await mountPager("/list?page=5");

    api.goTo(1);
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBeUndefined();
    expect(api.page.value).toBe(1);
  });

  it("翻页不冲掉地址里别的参数", async () => {
    const { api, router } = await mountPager("/list?id=9");

    api.goTo(2);
    await flushPromises();

    expect(router.currentRoute.value.query).toEqual({ id: "9", page: "2" });
  });

  it("同值或小于 1 的页码不发请求", async () => {
    const { api, load } = await mountPager("/list?page=3");

    api.goTo(3);
    api.goTo(0);
    api.goTo(-1);
    await flushPromises();

    expect(load).not.toHaveBeenCalled();
  });

  it("地址被外部改动时跟上页码并重新取数", async () => {
    const { api, router, load } = await mountPager("/list?page=2");

    await router.push("/list?page=4");
    await flushPromises();

    expect(api.page.value).toBe(4);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("外部改成非法页码时回到第一页", async () => {
    const { api, router } = await mountPager("/list?page=2");

    await router.push("/list?page=xyz");
    await flushPromises();

    expect(api.page.value).toBe(1);
  });

  it("自己写出去的页码不会再触发一次取数", async () => {
    const { api, load } = await mountPager("/list");

    api.goTo(2);
    await flushPromises();

    // 一次 goTo 只取一次数：watch 那一条不能又跟一次
    expect(load).toHaveBeenCalledTimes(1);
  });
});
