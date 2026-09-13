import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const interceptors = vi.hoisted(() => ({
  request: { use: vi.fn() },
  response: { use: vi.fn() },
}));

vi.mock("axios", () => ({
  default: {
    create: () => ({ interceptors }),
  },
}));

import { useAuthStore } from "@/stores/auth";
import request from "@/utils/request";

const onRequest = interceptors.request.use.mock.calls[0][0];
const onFulfilled = interceptors.response.use.mock.calls[0][0];
const onRejected = interceptors.response.use.mock.calls[0][1];

function httpError(status, data) {
  return { response: { status, data }, message: `Request failed with status code ${status}` };
}

describe("request 响应拦截器", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("把后端 4xx/5xx 的 msg 原样透传给用户", async () => {
    const cases = [
      [400, "参数 id 的值 notanumber 无法解析为 Long"],
      [401, "未登录或登录已过期"],
      [403, "没有权限执行该操作"],
      [404, "请求的资源不存在"],
      [409, "数据已存在，无法重复写入"],
      [413, "上传文件超过大小限制"],
      [500, "不支持的类型"],
    ];

    for (const [status, msg] of cases) {
      const error = httpError(status, { code: status, msg, data: null });

      await expect(onRejected(error)).rejects.toBe(error);
      expect(window.$vmessage.error).toHaveBeenLastCalledWith(msg);
    }

    expect(window.$vmessage.error).toHaveBeenCalledTimes(cases.length);
  });

  it("401 时清空登录态", async () => {
    const authStore = useAuthStore();
    authStore.token = "token";
    authStore.user = { username: "V1rtual" };

    await expect(onRejected(httpError(401, { code: 401, msg: "未登录或登录已过期" }))).rejects.toBeTruthy();

    expect(authStore.token).toBeNull();
    expect(authStore.user).toBeNull();
  });

  it("401 没有 msg 时用中性兜底文案", async () => {
    await expect(onRejected(httpError(401, null))).rejects.toBeTruthy();

    expect(window.$vmessage.error).toHaveBeenCalledWith("登录已过期，请重新登录");
  });

  it("后端没给 msg 时按状态码兜底", async () => {
    const cases = [
      [400, "请求参数不合法"],
      [403, "没有权限执行该操作"],
      [404, "请求的资源不存在"],
      [409, "数据已存在，无法重复写入"],
      [413, "上传文件超过大小限制"],
      [500, "服务器内部错误"],
    ];

    for (const [status, msg] of cases) {
      await expect(onRejected(httpError(status, undefined))).rejects.toBeTruthy();
      expect(window.$vmessage.error).toHaveBeenLastCalledWith(msg);
    }
  });

  it("请求超时给出中性提示", async () => {
    await expect(
      onRejected({ code: "ECONNABORTED", message: "timeout of 1000000ms exceeded" })
    ).rejects.toBeTruthy();

    expect(window.$vmessage.error).toHaveBeenCalledWith("请求超时，请稍后重试");
  });

  it("连不上服务器时给出中性提示", async () => {
    await expect(onRejected({ message: "Network Error" })).rejects.toBeTruthy();

    expect(window.$vmessage.error).toHaveBeenCalledWith("网络错误，请稍后重试");
  });

  it("HTTP 200 + code 非 200 仍然按业务错误 reject", async () => {
    const response = { status: 200, data: { code: 500, msg: "请先登录才能点赞" } };

    await expect(onFulfilled(response)).rejects.toMatchObject({
      message: "请先登录才能点赞",
      isBusinessError: true,
    });
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("成功响应原样返回 Result 信封", () => {
    const envelope = { code: 200, msg: "success", data: { id: 1 } };

    expect(onFulfilled({ status: 200, data: envelope })).toBe(envelope);
    expect(window.$vmessage.error).not.toHaveBeenCalled();
  });

  it("有 token 时注入 Bearer 头，没有时不加", () => {
    expect(request).toBeDefined();

    const authStore = useAuthStore();
    authStore.token = "token";
    expect(onRequest({ headers: {} }).headers.Authorization).toBe("Bearer token");

    authStore.logout();
    expect(onRequest({ headers: {} }).headers.Authorization).toBeUndefined();
  });
});
