import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vue-router", () => ({ useRouter: vi.fn() }));
vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/modules/auth/api/authApi", () => ({ register: vi.fn() }));

import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { register } from "@/modules/auth/api/authApi";
import RegisterPage from "@/views/register/index.vue";

const push = vi.fn();
const storeLogin = vi.fn();

function mountRegister() {
  return mount(RegisterPage, { global: { stubs: { RouterLink: true } } });
}

async function submitForm(wrapper, { username, password, confirmPassword }) {
  await wrapper.find('input[type="text"]').setValue(username);
  const passwords = wrapper.findAll('input[type="password"]');
  await passwords[0].setValue(password);
  await passwords[1].setValue(confirmPassword);
  await wrapper.find("form").trigger("submit");
  await flushPromises();
}

describe("注册页", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouter.mockReturnValue({ push });
    useAuthStore.mockReturnValue({ login: storeLogin, isLoggedIn: false });
    register.mockResolvedValue({ code: 200, msg: "注册成功", data: "token-1" });
  });

  it("用户名含空格或其他特殊字符时给出字段错误且不调用接口", async () => {
    const wrapper = mountRegister();

    await submitForm(wrapper, { username: "moon light", password: "1234", confirmPassword: "1234" });

    expect(wrapper.text()).toContain("用户名只能包含中文、英文、数字、下划线、连字符和点");
    expect(register).not.toHaveBeenCalled();
  });

  it("接受中文、下划线、连字符和点组成的用户名", async () => {
    const wrapper = mountRegister();

    await submitForm(wrapper, { username: "月光-A_b.1", password: "1234", confirmPassword: "1234" });

    expect(wrapper.text()).not.toContain("用户名只能包含");
    expect(register).toHaveBeenCalledWith({
      username: "月光-A_b.1",
      password: "1234",
      confirmPassword: "1234",
    });
  });

  it("密码短于 4 位时给出字段错误且不调用接口", async () => {
    const wrapper = mountRegister();

    await submitForm(wrapper, { username: "moon", password: "123", confirmPassword: "123" });

    expect(wrapper.text()).toContain("密码至少 4 位");
    expect(register).not.toHaveBeenCalled();
  });

  /** 规则是「至少 4 位」，更长的密码必须能提交，否则等于给用户设了个隐形的长度上限 */
  it("密码长于 4 位时可以正常注册", async () => {
    const wrapper = mountRegister();

    await submitForm(wrapper, {
      username: "moon",
      password: "a-much-longer-password",
      confirmPassword: "a-much-longer-password",
    });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[0][0]).toMatchObject({ password: "a-much-longer-password" });
  });

  it("两次密码不一致时给出字段错误且不调用接口", async () => {
    const wrapper = mountRegister();

    await submitForm(wrapper, { username: "moon", password: "1234", confirmPassword: "4321" });

    expect(wrapper.text()).toContain("两次输入的密码不一致");
    expect(register).not.toHaveBeenCalled();
  });

  it("用户名为空白时给出字段错误且不调用接口", async () => {
    const wrapper = mountRegister();

    await submitForm(wrapper, { username: "   ", password: "1234", confirmPassword: "1234" });

    expect(wrapper.text()).toContain("用户名不能为空");
    expect(register).not.toHaveBeenCalled();
  });

  it("注册成功时先去掉用户名两端空白，再写入 token 并进入首页", async () => {
    const wrapper = mountRegister();

    await submitForm(wrapper, { username: "  moon_1  ", password: "1234", confirmPassword: "1234" });

    expect(register).toHaveBeenCalledWith({
      username: "moon_1",
      password: "1234",
      confirmPassword: "1234",
    });
    expect(storeLogin).toHaveBeenCalledWith("token-1", "moon_1");
    expect(window.$vmessage.success).toHaveBeenCalledWith("注册成功");
    expect(push).toHaveBeenCalledWith("/home");
  });

  it("提交期间禁用按钮，避免重复提交", async () => {
    let finish;
    register.mockReturnValue(new Promise((resolve) => {
      finish = resolve;
    }));
    const wrapper = mountRegister();

    await submitForm(wrapper, { username: "moon", password: "1234", confirmPassword: "1234" });

    const button = wrapper.find("button");
    expect(button.attributes("disabled")).toBeDefined();
    expect(register).toHaveBeenCalledTimes(1);

    finish({ code: 200, msg: "注册成功", data: "token-1" });
    await flushPromises();
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("接口报错时保留已填内容，且不重复弹出错误提示", async () => {
    register.mockRejectedValue(
      Object.assign(new Error("用户名已被占用"), {
        response: { status: 409, data: { code: 409, msg: "用户名已被占用", data: null } },
      })
    );
    const wrapper = mountRegister();

    await submitForm(wrapper, { username: "moon", password: "1234", confirmPassword: "1234" });

    expect(wrapper.find('input[type="text"]').element.value).toBe("moon");
    expect(wrapper.findAll('input[type="password"]')[0].element.value).toBe("1234");
    // request.js 的响应拦截器已经提示过 HTTP 错误
    expect(window.$vmessage.error).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
