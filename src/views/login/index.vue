<template>
  <div class="pure-black-login">
    <div class="pure-black-screen">
      <div class="pure-black-content">
        <h2 class="pure-black-title">LOGIN</h2>

        <form
          v-if="!authStore.isLoggedIn"
          @submit.prevent="handleLogin"
          class="pure-black-form"
        >
          <input
            v-model="username"
            type="text"
            placeholder="Username"
            class="pure-black-input"
            required
          />
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            class="pure-black-input"
            required
          />
          <button type="submit" class="pure-black-btn">
            <span class="btn-text">Log in</span>
          </button>
        </form>

        <div v-else class="pure-black-welcome">
          <p class="welcome-text">Welcome back , {{ authStore.username }}.</p>
        </div>

        <p class="pure-black-tip">
          若还没有账号，请先注册。<br />
          No account yet? Register first.
          <router-link to="/register" class="pure-black-link">Register</router-link><br />
          You can be anyone you want to be.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { login } from "@/modules/auth/api/authApi";
import { useAuthStore } from "@/stores/auth";

const username = ref("");
const password = ref("");
const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  if (authStore.isLoggedIn) {
    window.$vmessage.success(`Welcome back, ${authStore.username}`);
    router.push("/home");
  }
});

const handleLogin = async () => {
  try {
    const res = await login({
      username: username.value.trim(),
      password: password.value,
    });

    // 严格判断后端是否真成功
    if (res.code !== 200) {
      throw new Error(res.msg || "登录失败");
    }

    // 取出 token（你后端直接放 data 里是字符串）
    const token = res.data; // ← 关键！直接是字符串
    if (!token) {
      throw new Error("未返回 token");
    }

    // 登录 + 自动拉用户信息（会持久化）
    await authStore.login(token, username.value.trim());

    window.$vmessage.success(res.msg || `Welcome, ${username.value}`);
    router.push("/home");
  } catch (e) {
    // 账号不存在、密码错误等 HTTP 错误已由 request.js 提示，这里不重复提示
    if (!e.response) {
      window.$vmessage.error(e.message || "登录失败");
    }
  }
};
</script>

<style scoped>
/* 引入字体：Orbitron英文 + LXGW WenKai Mono TC中文 */
@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@800;900&display=swap");
@import url("https://fonts.googleapis.com/css2?family=LXGW+WenKai+Mono+TC&display=swap");

/* 整体：纯黑背景，占满中间栏 */
.pure-black-login {
  width: 100%;
  height: 100%;
  background: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  box-sizing: border-box;
}

/* 屏幕：纯黑，无任何glow、边框、阴影 */
.pure-black-screen {
  width: 100%;
  max-width: 800px;
  background: #ffffff;
}

/* 内容区：纯黑，文字自己发光 */
.pure-black-content {
  text-align: center;
  padding: 60px 40px;
}

/* 标题：青蓝内glow，无外溢 */
.pure-black-title {
  font-family: "Orbitron", "LXGW WenKai Mono TC", monospace;
  font-weight: 900;
  font-size: 3rem;
  color: #2f3b47;
  letter-spacing: 0.15em;
  margin-bottom: 60px;
}

/* 输入框：青蓝边框 + 内glow */
.pure-black-input {
  width: 80%;
  max-width: 400px;
  padding: 18px 24px;
  margin: 20px 0;
  background: transparent;
  border: 1px solid #b9c4cc;
  border-radius: 8px;
  color: #2f3b47;
  font-family: "Orbitron", "LXGW WenKai Mono TC", monospace;
  font-size: 1.6rem;
  font-weight: 800;
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.2);
}

.pure-black-input:focus {
  outline: none;
  box-shadow: inset 0 0 25px rgba(0, 255, 255, 0.4);
}

/* 按钮：青蓝边框 + 内glow */
.pure-black-btn {
  width: 80%;
  max-width: 400px;
  padding: 20px;
  margin: 40px 0;
  background: transparent;
  border: 2px solid #b9c4cc;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.2);
}

.btn-text {
  font-family: "Orbitron", "LXGW WenKai Mono TC", monospace;
  font-size: 1.8rem;
  font-weight: 900;
  color: #2f3b47;
}

/* 欢迎文字 */
.pure-black-welcome {
  margin: 60px 0;
}

.welcome-text {
  font-family: "Orbitron", "LXGW WenKai Mono TC", monospace;
  font-size: 2.4rem;
  font-weight: 900;
  color: #2f3b47;
}

/* 提示文字 */
.pure-black-tip {
  font-family: "LXGW WenKai Mono TC", monospace;
  font-size: 1.2rem;
  color: #54636f;
  line-height: 2;
}

.pure-black-link {
  color: #2f3b47;
  text-decoration: underline;
}
</style>
