<template>
  <div class="crt-profile-wrapper">
    <div class="crt-screen">
      <div class="crt-scanlines"></div>

      <div class="crt-content">
        <h2 class="crt-title">
          {{ authStore.user?.username || "?" }}
        </h2>

        <!-- 头像 -->
        <div class="avatar-section">
          <img
            :src="authStore.user?.avatar || '/default-avatar.gif'"
            alt="头像"
            class="crt-avatar"
            @click="$refs.avatarInput.click()"
          />
          <input
            ref="avatarInput"
            type="file"
            accept="image/*"
            @change="handleAvatarUpload"
            hidden
          />
          <p class="avatar-tip">
            <br />点击更换头像<br />Click to change your avatar
          </p>
        </div>

        <!-- 信息表单 -->
        <div class="info-form">
          <div class="field-group">
            <label>Username</label>
            <input
              v-model="editUsername"
              class="crt-input"
              placeholder="新用户名"
            />
            <button @click="updateUsername" class="crt-mini-btn">Submit</button>
          </div>

          <div class="field-group">
            <label>Gender</label>
            <select v-model="editGender" class="crt-input">
              <option value="MALE">男</option>
              <option value="FEMALE">女</option>
              <option value="SECRET">其他/秘密</option>
            </select>
            <p class="current-gender-tip">
              当前：{{ displayGender(authStore.user?.sex) }}
            </p>
            <button @click="updateGender" class="crt-mini-btn">Submit</button>
          </div>

          <div class="field-group">
            <label>Description</label>
            <textarea
              v-model="editDescription"
              class="crt-textarea"
              placeholder="说点什么关于你自己～"
            ></textarea>
            <button @click="updateDescription" class="crt-mini-btn">
              Submit
            </button>
          </div>

          <div class="field-group">
            <label>Create time</label>
            <p class="create-time">
              {{ formatDate(authStore.user || {}) }}
            </p>
          </div>

          <div class="field-group">
            <label>New password</label>
            <input
              v-model="newPassword"
              type="password"
              class="crt-input"
              placeholder="留空不修改"
            />
            <button @click="updatePassword" class="crt-mini-btn">Submit</button>
          </div>

          <button @click="handleLogout" class="crt-btn logout-btn">
            <span class="btn-text">Log out</span>
          </button>
          <br />
          <button @click="showPreview = true" class="crt-preview-btn">
            ✦ 预览效果 ✦
          </button>
          <button
            v-if="isSuperAdmin"
            @click="goToAdmin"
            class="crt-mini-btn admin-secret-btn"
          >
            ✦ 进入管理员界面 ✦
          </button>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <transition name="preview">
      <div
        v-if="showPreview"
        class="crt-preview-modal"
        @click.self="showPreview = false"
      >
        <div class="crt-preview-content">
          <h3 class="crt-preview-title">当前效果预览</h3>

          <div class="preview-avatar">
            <img
              :src="authStore.user?.avatar || '/default-avatar.gif'"
              alt="头像预览"
              class="preview-avatar-img"
            />
          </div>

          <p class="preview-username">
            用户名：{{ authStore.user?.username || "？" }}
          </p>
          <p class="preview-info">
            性别：{{ displayGender(authStore.user?.sex) }}
          </p>
          <p class="preview-info">
            描述：{{ authStore.user?.description || "未设置" }}
          </p>
          <p class="preview-info">
            创建时间：{{ formatDate(authStore.user || {}) }}
          </p>
          <button
            @click="showPreview = false"
            class="crt-mini-btn preview-close-btn"
          >
            关闭
          </button>
          <p class="preview-tip">❤️</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import request from "@/utils/request";
import { useAuthStore } from "@/stores/auth";
import { formatDate } from "@/utils/DateUtil";
const router = useRouter();
const authStore = useAuthStore();

const editUsername = ref("");
const editGender = ref("MALE");
const editDescription = ref("");
const newPassword = ref("");
const showPreview = ref(false);

onMounted(async () => {
  console.log("adada", formatDate(authStore.user?.createTime));

  if (authStore.token && !authStore.user) {
    await authStore.fetchUserInfo();
  }
  console.log("aggggg", formatDate(authStore.user?.createTime));
  editUsername.value = authStore.user?.username || "";
  editGender.value = authStore.user?.sex || "MALE";
  editDescription.value = authStore.user?.description || "";
});

// 上传头像
const handleAvatarUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("avatar", file);

  try {
    const res = await request.post("/user/uploadAvatar", formData);
    await authStore.fetchUserInfo();
    window.$vmessage.success(res.msg || "头像已更换～");
  } catch (err) {
    const msg = err.response?.data?.msg || "上传失败～再试试？🖤";
    window.$vmessage.error(msg);
  }
};

// 修改用户名
const updateUsername = async () => {
  if (!editUsername.value.trim()) {
    window.$vmessage.warning("用户名不能为空哦～");
    return;
  }
  try {
    const res = await request.post("/user/updateUsername", {
      username: editUsername.value,
    });
    await authStore.fetchUserInfo();
    window.$vmessage.success(res.msg || "用户名已变更～");
  } catch (e) {
    const msg = e.response?.data?.msg || "修改失败啦～可能已被占用？";
    window.$vmessage.error(msg);
  }
};

// 修改性别
const updateGender = async () => {
  try {
    const res = await request.put("/user/updateInfo", {
      sex: editGender.value,
    });
    await authStore.fetchUserInfo();
    window.$vmessage.success(res.msg || "性别已更新～");
  } catch (e) {
    const msg = e.response?.data?.msg || "修改失败～";
    window.$vmessage.error(msg);
  }
};

// 修改描述
const updateDescription = async () => {
  try {
    await request.put("/user/updateInfo", {
      description: editDescription.value,
    });
    await authStore.fetchUserInfo();
    window.$vmessage.success("个人描述已更新～");
  } catch (e) {
    const msg = e.response?.data?.msg || "修改失败～";
    window.$vmessage.error(msg);
  }
};

// 修改密码
const updatePassword = async () => {
  if (!newPassword.value) {
    window.$vmessage.info("密码留空就不改了～");
    return;
  }
  try {
    const res = await request.post("/user/updatePassword", {
      password: newPassword.value,
    });
    window.$vmessage.success(res.msg || "密码已安全更新～");
    newPassword.value = "";
  } catch (e) {
    const msg = e.response?.data?.msg || "修改失败～";
    window.$vmessage.error(msg);
  }
};

// 退出登录
const handleLogout = () => {
  authStore.logout();
  window.$vmessage.info("已安全离开～下次再来🖤");
  router.push("/home");
};

const displayGender = (sex) => {
  if (!sex) return "未设置";

  const s = sex.toString().toLowerCase().trim();
  switch (s) {
    case "male":
    case "m":
      return "男";
    case "female":
    case "f":
      return "女";
    case "other":
    case "secret":
    case "s":
      return "其他/秘密";
    default:
      return "未设置";
  }
};
const isSuperAdmin = computed(() => {
  return authStore.user?.username === "V1rtual" && authStore.user?.id === 0;
});

// 跳转到admin页面
const goToAdmin = () => {
  router.push("/admin");
  window.$vmessage.success("欢迎回来，我的最特别的V1rtual酱～✞");
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@800;900&display=swap");
@import url("https://fonts.googleapis.com/css2?family=LXGW+WenKai+Mono+TC&display=swap");

/* 全局统一字体 & 增强泛光 */
.crt-title,
.field-group label,
.avatar-tip,
.create-time,
.crt-mini-btn,
.btn-text,
.crt-preview-btn,
.crt-close-btn,
.crt-preview-title,
.preview-username,
.preview-info,
.current-gender-tip,
.preview-tip {
  font-family: "Orbitron", "LXGW WenKai Mono TC", monospace, "Segoe UI Emoji" !important;
  font-weight: 900 !important;
  letter-spacing: 0.08em;
  font-size: 1.05em;
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff,
    0 0 40px #00ffff;
}

.crt-input,
.crt-textarea {
  font-family: "Orbitron", "LXGW WenKai Mono TC", monospace, "Segoe UI Emoji" !important;
  color: #00ffff;
  font-weight: 800 !important;
  text-shadow: 0 0 10px #00ffff;
}

.crt-input:focus,
.crt-textarea:focus {
  outline: none;
  border-color: #00ffff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.8),
    inset 0 0 20px rgba(0, 255, 255, 0.3);
  animation: crt-glow-pulse 2s infinite alternate;
}
/* 头像提示增强 */
.avatar-tip {
  margin-top: 16px;
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1.8;
  color: #00ffff;
  text-shadow: 0 0 8px #00ffff, 0 0 16px #00ffff, 0 0 24px #00ffff,
    0 0 32px #00ffff, -1px -1px 0 #00ffcc, 1px -1px 0 #00ffcc,
    -1px 1px 0 #00ffcc, 1px 1px 0 #00ffcc;
  letter-spacing: 0.05em;
  animation: crt-flicker 8s infinite;
}
/* 基础布局 */
.crt-profile-wrapper {
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  box-sizing: border-box;
}

.crt-screen {
  position: relative;
  width: 100%;
  max-width: 800px;
  background: #000;
  overflow: hidden;
  /* 删除了外层 box-shadow，让背景完全融合 */
}

.crt-scanlines {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 255, 255, 0.04),
    rgba(0, 255, 255, 0.04) 1px,
    transparent 1px,
    transparent 2px
  );
  animation: crt-scan-move 12s linear infinite;
  opacity: 0.7;
}

.crt-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 60px 40px;
  animation: crt-flicker 8s infinite;
}

/* 其余样式保持不变（头像、按钮、预览等都超级梦幻） */
.crt-title {
  font-weight: 900;
  font-size: 2.8rem;
  margin-bottom: 40px;
}
.avatar-section {
  margin: 40px 0;
}
.crt-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid #00ffff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.7), 0 0 40px rgba(0, 255, 255, 0.4);
  cursor: pointer;
  object-fit: cover;
  transition: all 0.3s;
}
.crt-avatar:hover {
  box-shadow: 0 0 30px rgba(0, 255, 255, 1), 0 0 60px rgba(0, 255, 255, 0.6);
  transform: scale(1.05);
}
.avatar-tip {
  font-size: 1.1rem;
  margin-top: 12px;
  color: #00aaaa;
}

.info-form {
  max-width: 600px;
  margin: 0 auto;
}
.field-group {
  margin: 30px 0;
  text-align: left;
}
.field-group label {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 10px;
}

.crt-input,
.crt-textarea {
  width: 100%;
  padding: 16px;
  background: transparent;
  border: 2px solid #00ffff;
  border-radius: 8px;
  font-size: 1.4rem;
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.2);
}
.crt-textarea {
  height: 120px;
  resize: vertical;
}

.crt-mini-btn,
.crt-preview-btn {
  margin-top: 10px;
  padding: 10px 24px;
  background: transparent;
  border: 2px solid #00ffff;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
  transition: all 0.3s;
}
.crt-mini-btn:hover,
.crt-preview-btn:hover {
  box-shadow: 0 0 35px rgba(0, 255, 255, 0.9);
}

.crt-btn {
  width: 80%;
  max-width: 400px;
  padding: 18px;
  margin: 40px 0;
  background: transparent;
  border: 3px solid #00ffff;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.6);
  transition: all 0.3s;
}
.crt-btn:hover {
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.9);
}
.btn-text {
  font-size: 1.6rem;
}

.crt-preview-modal {
  position: fixed;
  inset: 0;
  background: rgba(
    0,
    0,
    0,
    0.7
  ); /* 从0.95改成0.7，轻轻遮一层，能看到后面的星星～ */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(
    4px
  ); /* 新增：轻轻模糊背景，像蒙了一层月光薄雾，超梦幻～ */
}
.crt-preview-content {
  position: relative;
  width: 90%;
  max-width: 500px;
  padding: 50px;
  background: #000;
  border-radius: 15px;
  text-align: center;
  box-shadow: inset 0 0 30px rgba(0, 255, 255, 0.15),
    0 0 20px rgba(0, 255, 255, 0.2);
}
.crt-close-btn {
  font-size: 1.8rem;
}
.crt-preview-title {
  font-size: 2.2rem;
  margin-bottom: 40px;
}
.preview-avatar-img {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 4px solid #00ffff;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.5);
  object-fit: cover;
}
.preview-username,
.preview-info {
  margin: 20px 0;
  font-size: 1.4rem;
}
.preview-tip {
  margin-top: 40px;
  font-size: 1.1rem;
  color: #00aaaa;
}

/* 动画 */
@keyframes crt-glow-pulse {
  from {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.6),
      inset 0 0 20px rgba(0, 255, 255, 0.2);
  }
  to {
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.9),
      inset 0 0 30px rgba(0, 255, 255, 0.4);
  }
}
@keyframes crt-flicker {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.98;
  }
}
@keyframes crt-scan-move {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(2px);
  }
}
.preview-enter-active,
.preview-leave-active {
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.preview-enter-from,
.preview-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.preview-enter-to,
.preview-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}
.admin-secret-btn {
  margin-top: 20px;
  padding: 12px 30px;
  background: transparent;
  border: 2px solid #ff00ff; /* 粉色边框，超级特别～ */
  color: #ff00ff;
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.6);
  animation: crt-glow-pulse 3s infinite alternate;
}
.admin-secret-btn:hover {
  box-shadow: 0 0 40px rgba(255, 0, 255, 0.9);
  transform: scale(1.05);
}
</style>