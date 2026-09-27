import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import Pagination from "@/components/Pagination.vue";

/** 挂载页码条。默认：第 6 / 20 页，共 118 条 */
function mountPagination(props = {}) {
  return mount(Pagination, {
    props: { page: 6, totalPages: 20, total: 118, ...props },
  });
}

/** 页码条上的数字按钮（上一页 / 下一页不在其中） */
const numberButtons = (wrapper) => wrapper.findAll(".page-numbers button");

describe("Pagination", () => {
  it("按窗口渲染页码，被折叠处显示省略号", () => {
    const wrapper = mountPagination();

    expect(numberButtons(wrapper).map((button) => button.text()))
      .toEqual(["1", "4", "5", "6", "7", "8", "20"]);
    expect(wrapper.findAll(".page-gap")).toHaveLength(2);
  });

  it("当前页标出 aria-current，方便样式与读屏定位", () => {
    const current = mountPagination().findAll('[aria-current="page"]');

    expect(current).toHaveLength(1);
    expect(current[0].text()).toBe("6");
  });

  it("显示当前页与总数，单位跟随 unit", () => {
    expect(mountPagination().find(".page-info").text()).toContain("/ 20 页（共 118 条）");
    expect(mountPagination({ unit: "篇" }).find(".page-info").text()).toContain("/ 20 页（共 118 篇）");
  });

  it("下拉框列出全部页码，并选中当前页", () => {
    const select = mountPagination().find(".page-jump select");

    expect(select.findAll("option").map((option) => option.text())).toHaveLength(20);
    expect(select.element.value).toBe("6");
  });

  /** 页码按钮翻不到几十页以外的地方，下拉是唯一的直达入口 */
  it("从下拉框选一页就跳到那一页", async () => {
    const wrapper = mountPagination();
    const select = wrapper.find(".page-jump select");

    await select.setValue("17");

    expect(wrapper.emitted("change")).toEqual([[17]]);
  });

  it("从下拉框选当前页不重复请求", async () => {
    const wrapper = mountPagination();

    await wrapper.find(".page-jump select").setValue("6");

    expect(wrapper.emitted("change")).toBeUndefined();
  });

  it("点页码请求跳到那一页", async () => {
    const wrapper = mountPagination();

    await numberButtons(wrapper)[1].trigger("click");

    expect(wrapper.emitted("change")).toEqual([[4]]);
  });

  it("点当前页不重复请求", async () => {
    const wrapper = mountPagination();

    await wrapper.find('[aria-current="page"]').trigger("click");

    expect(wrapper.emitted("change")).toBeUndefined();
  });

  it("上一页与下一页各请求相邻的一页", async () => {
    const wrapper = mountPagination();
    const steps = wrapper.findAll(".page-step");

    await steps[0].trigger("click");
    await steps[1].trigger("click");

    expect(wrapper.emitted("change")).toEqual([[5], [7]]);
  });

  it("第一页禁用上一页，最后一页禁用下一页", () => {
    const first = mountPagination({ page: 1 }).findAll(".page-step");
    expect(first[0].attributes("disabled")).toBeDefined();
    expect(first[1].attributes("disabled")).toBeUndefined();

    const last = mountPagination({ page: 20 }).findAll(".page-step");
    expect(last[0].attributes("disabled")).toBeUndefined();
    expect(last[1].attributes("disabled")).toBeDefined();
  });

  it("只有一页时两个翻页按钮都不可用", () => {
    const steps = mountPagination({ page: 1, totalPages: 1, total: 3 }).findAll(".page-step");

    expect(steps[0].attributes("disabled")).toBeDefined();
    expect(steps[1].attributes("disabled")).toBeDefined();
  });
});
