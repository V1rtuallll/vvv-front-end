import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vue-router", () => ({ useRouter: vi.fn() }));
vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));
vi.mock("@/modules/auth/api/authApi", () => ({ login: vi.fn() }));

import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import LoginPage from "@/views/login/index.vue";

function mountLogin() {
  return mount(LoginPage, { global: { stubs: { RouterLink: true } } });
}

describe("登录页", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouter.mockReturnValue({ push: vi.fn() });
    useAuthStore.mockReturnValue({ login: vi.fn(), isLoggedIn: false, username: "" });
  });

  it("不再声称账号不存在时会自动创建", () => {
    const wrapper = mountLogin();

    expect(wrapper.text()).not.toContain("自动创建");
    expect(wrapper.text()).not.toContain("created automatically");
  });

  it("提供注册入口", () => {
    const wrapper = mountLogin();

    expect(wrapper.html()).toContain('to="/register"');
  });
});
