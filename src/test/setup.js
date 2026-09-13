import { beforeEach, vi } from "vitest";

// VMessage.vue 把 $vmessage 挂到 window 上，形状是 {success, info, warning, error}。
// 这里统一装替身，测试文件里直接用 window.$vmessage.warning 断言，不用各自 mock 一遍。
beforeEach(() => {
  window.$vmessage = {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  };
});
