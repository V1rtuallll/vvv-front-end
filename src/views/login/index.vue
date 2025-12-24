<template>
  <div class="login-wrapper">
    <div class="login-container">
      <h2 class="login-title glitch-title">✞ 开启月光之门 ✞</h2>

      <!-- 未登录：登录表单 -->
      <form
        v-if="!authStore.isLoggedIn"
        @submit.prevent="handleLogin"
        class="login-form"
      >
        <input
          v-model="username"
          type="text"
          placeholder="用户名"
          class="neon-input"
          required
        />
        <input
          v-model="password"
          type="password"
          placeholder="密码"
          class="neon-input"
          required
        />
        <button type="submit" class="glitch-btn">
          <span class="btn-text">进入V1rtual古堡</span>
        </button>
      </form>

      <!-- 已登录：欢迎 + 退出 -->
      <div v-else class="logged-in-simple">
        <p class="welcome-back">欢迎回家～{{ authStore.username }} ❤️‍🔥</p>
        <button @click="handleLogout" class="glitch-btn logout-btn">
          <span class="btn-text">安全离开古堡</span>
        </button>
        <p class="to-profile">
          想查看或修改个人信息？<router-link to="/profile" class="link"
            >去个人花园→</router-link
          >
        </p>
      </div>

      <p class="login-tip">
        第一次来？直接登录就会自动创建账号哦～🖤<br />
        欢迎成为永恒黑暗的一部分❤️‍🔥
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import request from "@/utils/request";
import { useAuthStore } from "@/stores/auth";

const username = ref("");
const password = ref("");
const router = useRouter();
const authStore = useAuthStore();

const handleLogin = async () => {
  try {
    const res = await request.post("/auth/login", {
      username: username.value,
      password: password.value,
    });
    authStore.login(res.data.data, username.value); // 这行会自动触发fetchUserInfo
    window.$vmessage.success(`欢迎回家～${username.value} ❤️‍🔥`);
    router.push("/home");
  } catch (e) {
    window.$vmessage.error("进入古堡失败啦～密码不对吗？🖤");
  }
};
const handleLogout = () => {
  authStore.logout();
  window.$vmessage.info("已安全离开古堡～下次再来哦🖤");
  router.push("/home");
};
</script>

<style scoped>
.logged-in-simple {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 20px 0;
}

.welcome-back {
  font-size: 1.8rem;
  background: linear-gradient(90deg, #ff00ff, #00ffff, #ff69b4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: neon-flicker 4s infinite ease-in-out;
}

.to-profile {
  margin-top: 20px;
  color: #aaa;
}

.to-profile .link {
  color: #00ffff;
  text-decoration: underline;
  text-shadow: 0 0 10px #00ffff;
}

.to-profile .link:hover {
  color: #ff69b4;
}

/* 其他样式保持不变～ */
</style>