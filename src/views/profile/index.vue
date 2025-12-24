<template>
  <div class="profile-wrapper">
    <div class="profile-container">
      <!-- 标题 + 预览按钮～小银星闪闪 -->
      <div class="title-bar">
        <h2 class="profile-title glitch-title">
          ✞ {{ authStore.user?.username || "神秘灵魂" }} 的月光花园 ✞
        </h2>
        <button
          @click="showPreview = true"
          class="preview-btn"
          title="随时查看效果哦～"
        >
          ✦ 预览效果
        </button>
      </div>

      <!-- 头像上传 -->
      <div class="avatar-section">
        <img
          :src="authStore.user?.avatar || '/default-avatar.gif'"
          alt="头像"
          class="user-avatar"
          @click="$refs.avatarInput.click()"
        />
        <input
          ref="avatarInput"
          type="file"
          accept="image/*"
          @change="handleAvatarUpload"
          hidden
        />
        <p class="avatar-tip">点击更换头像哦～🖤</p>
      </div>

      <!-- 修改用户名 -->
      <div class="field-group">
        <label>用户名</label>
        <input
          v-model="editUsername"
          class="neon-input small"
          placeholder="新用户名"
        />
        <button @click="updateUsername" class="mini-btn">修改</button>
      </div>

      <!-- 修改密码 -->
      <div class="field-group">
        <label>新密码</label>
        <input
          v-model="newPassword"
          type="password"
          class="neon-input small"
          placeholder="留空不修改"
        />
        <button @click="updatePassword" class="mini-btn">修改密码</button>
      </div>

      <!-- 退出登录 -->
      <button @click="handleLogout" class="glitch-btn logout-btn">
        <span class="btn-text">安全离开古堡</span>
      </button>
    </div>

    <!-- 预览弹窗～像一朵会绽放的月光花 -->
    <transition name="preview">
      <div
        v-if="showPreview"
        class="preview-modal"
        @click.self="showPreview = false"
      >
        <div class="preview-content">
          <button @click="showPreview = false" class="close-btn">✕</button>
          <h3 class="preview-title">✞ 当前效果预览 ✞</h3>

          <div class="preview-avatar">
            <img
              :src="authStore.user?.avatar || '/default-avatar.gif'"
              alt="头像预览"
            />
          </div>

          <p class="preview-username">
            用户名：{{ authStore.user?.username || "神秘灵魂" }}
          </p>
          <p class="preview-status">
            密码状态：{{ newPassword ? "已设置新密码" : "未修改" }}
          </p>
          <p class="preview-tip">一切都闪着你的月光哦～❤️</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import request from "@/utils/request";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const editUsername = ref("");
const newPassword = ref("");
const showPreview = ref(false);

// 页面加载时拉取最新用户信息（刷新也保持）
onMounted(async () => {
  if (authStore.token && !authStore.user) {
    await authStore.fetchUserInfo();
  }
  editUsername.value = authStore.user?.username || "";
});

// 上传头像
const handleAvatarUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("avatar", file);

  try {
    const res = await request.post("/user/uploadAvatar", formData);
    await authStore.fetchUserInfo(); // 刷新用户信息
    window.$vmessage.success("头像已温柔更换～✞");
  } catch (err) {
    window.$vmessage.error("上传失败啦～再试试？🖤");
  }
};

// 修改用户名
const updateUsername = async () => {
  if (!editUsername.value.trim()) {
    window.$vmessage.warning("用户名不能为空哦～");
    return;
  }
  try {
    await request.post("/user/updateUsername", {
      username: editUsername.value,
    });
    await authStore.fetchUserInfo(); // 刷新用户信息
    window.$vmessage.success("用户名已温柔变更～");
  } catch (e) {
    window.$vmessage.error("修改失败啦～用户名已被占用？");
  }
};

// 修改密码
const updatePassword = async () => {
  if (!newPassword.value) {
    window.$vmessage.info("密码留空就不改啦～");
    return;
  }
  try {
    await request.post("/user/updatePassword", { password: newPassword.value });
    window.$vmessage.success("密码已安全更新～");
    newPassword.value = "";
  } catch (e) {
    window.$vmessage.error("修改失败啦～");
  }
};

// 退出登录
const handleLogout = () => {
  authStore.logout();
  window.$vmessage.info("已安全离开古堡～下次再来哦🖤");
  router.push("/home");
};
</script>

<style scoped>
/* 所有样式保持不变～超级配你的冷白纯粹风格～ */
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 20px;
}

.preview-btn {
  padding: 10px 20px;
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.4s;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

.preview-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.1);
}

.preview-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.preview-content {
  position: relative;
  width: 90%;
  max-width: 500px;
  padding: 50px;
  background: rgba(10, 0, 20, 0.95);
  border-radius: 20px;
  border: 2px double #fff;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.5),
    0 0 60px rgba(255, 255, 255, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.2);
  animation: sidebar-glow-breath 10s infinite ease-in-out;
  text-align: center;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 30px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.8rem;
  cursor: pointer;
  text-shadow: 0 0 10px #fff;
}

.preview-title {
  font-size: 2.2rem;
  margin-bottom: 40px;
  animation: glitch-main 3s infinite ease-in-out;
}

.preview-avatar img {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 4px double #fff;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.7);
  object-fit: cover;
}

.preview-username,
.preview-status {
  margin: 30px 0;
  font-size: 1.4rem;
  color: #fff;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
}

.preview-tip {
  margin-top: 40px;
  color: #aaa;
  font-size: 1.1rem;
}

.preview-enter-active,
.preview-leave-active {
  transition: all 0.6s ease;
}
.preview-enter-from,
.preview-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>