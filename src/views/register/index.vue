<template>
  <div class="pure-black-register">
    <div class="pure-black-screen">
      <div class="pure-black-content">
        <h2 class="pure-black-title">REGISTER</h2>

        <p class="pure-black-hint">
          用户名可用中文、英文、数字与 _ - . ，长度 2 到 20 个字符；密码为 4 位。
        </p>

        <form @submit.prevent="handleRegister" class="pure-black-form" novalidate>
          <input
            v-model="form.username"
            type="text"
            placeholder="Username"
            class="pure-black-input"
          />
          <p v-if="errors.username" class="pure-black-error">{{ errors.username }}</p>

          <input
            v-model="form.password"
            type="password"
            placeholder="Password"
            class="pure-black-input"
          />
          <p v-if="errors.password" class="pure-black-error">{{ errors.password }}</p>

          <input
            v-model="form.confirmPassword"
            type="password"
            placeholder="Confirm password"
            class="pure-black-input"
          />
          <p v-if="errors.confirmPassword" class="pure-black-error">
            {{ errors.confirmPassword }}
          </p>

          <button type="submit" class="pure-black-btn" :disabled="submitting">
            <span class="btn-text">{{ submitting ? "Registering" : "Register" }}</span>
          </button>
        </form>

        <p class="pure-black-tip">
          已有账号？<br />
          Already have an account?
          <router-link to="/login" class="pure-black-link">Log in</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { register } from "@/modules/auth/api/authApi";
import { useAuthStore } from "@/stores/auth";

// 与后端 UserService 的校验保持一致：后端用 \p{IsHan}，这里是同名字符集
const USERNAME_PATTERN = /^[\p{Script=Han}A-Za-z0-9_.-]+$/u;
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 20;
const PASSWORD_LENGTH = 4;

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  username: "",
  password: "",
  confirmPassword: "",
});
const errors = reactive({
  username: "",
  password: "",
  confirmPassword: "",
});
const submitting = ref(false);

const clearErrors = () => {
  errors.username = "";
  errors.password = "";
  errors.confirmPassword = "";
};

const validate = () => {
  clearErrors();
  const username = form.username.trim();

  if (!username) {
    errors.username = "用户名不能为空";
  } else if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    errors.username = `用户名长度需为 ${USERNAME_MIN_LENGTH} 到 ${USERNAME_MAX_LENGTH} 个字符`;
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = "用户名只能包含中文、英文、数字、下划线、连字符和点";
  }

  if (!form.password) {
    errors.password = "密码不能为空";
  } else if (form.password.length !== PASSWORD_LENGTH) {
    errors.password = `密码必须为 ${PASSWORD_LENGTH} 位`;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "请再次输入密码";
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "两次输入的密码不一致";
  }

  return !errors.username && !errors.password && !errors.confirmPassword;
};

const handleRegister = async () => {
  if (submitting.value || !validate()) return;

  submitting.value = true;
  try {
    const res = await register({
      username: form.username.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    });

    if (res.code !== 200 || !res.data) {
      throw new Error(res.msg || "注册失败");
    }

    await authStore.login(res.data, form.username.trim());
    window.$vmessage.success(res.msg || "注册成功");
    router.push("/home");
  } catch (e) {
    // HTTP 错误已由 request.js 提示，这里不重复提示；已填内容保留
    if (!e.response) {
      window.$vmessage.error(e.message || "注册失败");
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<style src="./index.css" scoped></style>
