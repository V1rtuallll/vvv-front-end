<template>
  <div class="crt-admin-wrapper">
    <div class="crt-screen">
      <div class="crt-scanlines"></div>

      <div class="crt-content">
        <h2 class="crt-title">✦ 管理员控制室 ✦</h2>
        <p class="admin-welcome">欢迎回来，我的最特别的V1rtual酱～❤️</p>

        <!-- 快速操作区 -->
        <div class="admin-section quick-actions">
          <h3 class="section-title">快速资源管理</h3>

          <div class="action-buttons">
            <button
              @click="syncOssToDb"
              class="crt-btn sync-btn"
              :disabled="syncing"
            >
              {{ syncing ? "同步中...✧" : "一键同步 OSS → 数据库" }}
            </button>

            <div class="upload-area">
              <label class="crt-file-label">
                <span>批量上传文件（自动识别类型，支持多选）</span>
                <input
                  type="file"
                  multiple
                  @change="handleFileUpload"
                  accept="image/*,video/*,.gif,.mp3,.wav"
                  class="hidden-file-input"
                  :disabled="uploading"
                />
                <span
                  class="crt-mini-btn upload-btn"
                  :class="{ disabled: uploading }"
                >
                  {{ uploading ? "上传中..." : "选择文件（可多选）" }}
                </span>
              </label>

              <!-- 上传进度总览 -->
              <p v-if="uploading" class="upload-status">
                正在处理 {{ uploadTotal }} 个文件，已完成
                {{ uploadCompleted }} / {{ uploadTotal }}...
              </p>

              <!-- 上传结果列表 -->
              <div v-if="uploadedFiles.length > 0" class="upload-results">
                <h4>本次上传结果</h4>
                <ul>
                  <li v-for="(item, index) in uploadedFiles" :key="index">
                    <span class="status-icon" :class="item.status">
                      {{
                        item.status === "success"
                          ? "✓"
                          : item.status === "error"
                          ? "✗"
                          : "→"
                      }}
                    </span>
                    <span class="file-name">{{ item.fileName }}</span>
                    <span v-if="item.url">
                      <a :href="item.url" target="_blank">{{ item.url }}</a>
                    </span>
                    <span v-else-if="item.error" class="error-msg">{{
                      item.error
                    }}</span>
                  </li>
                </ul>
                <button @click="clearUploadResults" class="crt-mini-btn">
                  清空结果
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Home 配置区 -->
        <div class="admin-section">
          <h3 class="section-title">Home 页面配置</h3>

          <!-- 大展示 -->
          <div class="field-group">
            <label>类型</label>
            <select v-model="homeConfig.main.type" class="crt-input">
              <option value="image">图片/动图</option>
              <option value="video">视频</option>
            </select>
          </div>

          <div class="field-group">
            <label>随机从数据库取</label>
            <input
              type="checkbox"
              :checked="homeConfig.main.random === 1"
              @change="homeConfig.main.random = $event.target.checked ? 1 : 0"
            />
          </div>

          <!-- 指定 URL（只在非随机时显示） -->
          <div class="field-group" v-if="homeConfig.main.random !== 1">
            <label>指定 URL</label>
            <input
              v-model="homeConfig.main.src"
              class="crt-input"
              placeholder="https://..."
            />
          </div>

          <div class="field-group">
            <label>标题</label>
            <input v-model="homeConfig.main.title" class="crt-input" />
          </div>

          <div class="field-group">
            <label>描述</label>
            <textarea
              v-model="homeConfig.main.desc"
              class="crt-input"
            ></textarea>
          </div>

          <!-- 随机模式下回显所有可用资源 -->
          <div v-if="homeConfig.main.random" class="field-group">
            <label
              >数据库可用资源（随机源，{{ availableFiles.length }} 条）</label
            >
            <ul class="file-list">
              <li v-for="(file, i) in availableFiles" :key="i">
                <a :href="file" target="_blank" class="file-link">{{ file }}</a>
                <button @click="setAsMain(file)" class="crt-mini-btn small">
                  设为主展示
                </button>
              </li>
            </ul>
          </div>

          <!-- Gallery -->
          <div class="field-group">
            <label>拼图列表</label>
            <div
              v-for="(item, i) in homeConfig.gallery"
              :key="i"
              class="gallery-item-edit"
            >
              <select v-model="item.type" class="crt-input small">
                <option value="image">图片/动图</option>
                <option value="video">视频</option>
              </select>
              <input v-model="item.src" class="crt-input" placeholder="URL" />
              <input
                v-model="item.alt"
                class="crt-input small"
                placeholder="描述"
              />
              <button
                @click="homeConfig.gallery.splice(i, 1)"
                class="crt-mini-btn danger"
              >
                删除
              </button>
            </div>
            <button @click="addGalleryItem" class="crt-mini-btn">+ 添加</button>
          </div>

          <!-- 置顶 Blog -->
          <div class="field-group">
            <label>置顶 Blog ID（右半部分）</label>
            <input
              v-model="homeConfig.pinnedBlogId"
              class="crt-input"
              placeholder="输入 Blog ID"
            />
          </div>

          <button @click="saveHomeConfig" class="crt-mini-btn">
            保存 Home 配置
          </button>
        </div>

        <!-- 用户列表（占位） -->
        <div class="admin-section">
          <h3 class="section-title">用户列表（待扩展）</h3>
          <p class="coming-soon">更多功能慢慢来哦～现在先管理Home数据❤️</p>
        </div>

        <button @click="backToProfile" class="crt-btn">返回个人中心</button>
      </div>
    </div>

    <!-- 用户列表（占位） -->
    <div class="admin-section">
      <h3 class="section-title">用户列表（待扩展）</h3>
      <p class="coming-soon">更多功能慢慢来哦～现在先管理Home数据❤️</p>
    </div>

    <button @click="backToProfile" class="crt-btn">返回个人中心</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import request from "@/utils/request";

const router = useRouter();
const authStore = useAuthStore();

// 同步状态
const syncing = ref(false);

// 批量上传状态
const uploading = ref(false);
const uploadProgress = ref(0); // 整体进度（可选显示）
const uploadedFiles = ref([]); // 上传结果列表 [{ fileName, url, status, error }]
const uploadTotal = ref(0);
const uploadCompleted = ref(0);

onMounted(async () => {
  if (
    !authStore.user ||
    authStore.user.username !== "V1rtual" ||
    authStore.user.id !== 0
  ) {
    router.push("/profile");
    window.$vmessage.error("这扇银门只为你一人敞开哦～🖤");
  }
  // 加载配置（包括 availableFiles）
  await loadHomeConfig();
});

// 一键同步 OSS → 数据库（现在默认全量同步四个类型）
const syncOssToDb = async () => {
  if (syncing.value) return;

  if (
    !confirm(
      "确定要全量同步所有 OSS 资源（video / gif / music / photo）到数据库吗？\n（会跳过已存在的记录）"
    )
  ) {
    return;
  }

  syncing.value = true;
  try {
    // 直接发送 types 数组，包含全部四个类型
    const res = await request.post("/admin/sync-oss-to-db", {
      types: ["video", "gif", "music", "photo"], // 全量四个！（photo 对应 imgs/ 目录）
    });

    const count = res.data.data?.insertedCount ?? res.data.insertedCount ?? 0;
    window.$vmessage.success(
      `同步完成！新增 ${count} 条记录～✞ 月光更亮了哦～`
    );
  } catch (err) {
    window.$vmessage.error("同步失败...月光好像被乌云遮住了QAQ");
    console.error("同步错误详情:", err.response?.data || err);
  } finally {
    syncing.value = false;
  }
};

// 批量文件上传核心逻辑
const handleFileUpload = async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  uploading.value = true;
  uploadTotal.value = files.length;
  uploadCompleted.value = 0;
  uploadedFiles.value = []; // 清空上一次结果

  for (const file of files) {
    const fileName = file.name;
    const result = { fileName, status: "uploading", url: null, error: null };

    uploadedFiles.value.push(result); // 先加入列表显示“上传中”

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await request.post("/admin/upload-resource", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          // 可选：单个文件进度（这里显示整体简单）
          uploadProgress.value = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
        },
      });

      result.status = "success";
      result.url = res.data.url;
      window.$vmessage.success(
        `[${fileName}] 上传成功！已存入 ${res.data.type} 目录～✨`
      );
    } catch (err) {
      result.status = "error";
      result.error = err.response?.data?.msg || "上传失败";
      window.$vmessage.error(`[${fileName}] ${result.error}`);
      console.error(`上传 ${fileName} 失败:`, err);
    } finally {
      uploadCompleted.value++;
    }
  }

  uploading.value = false;
  uploadProgress.value = 0;
  e.target.value = ""; // 清空 input
};

// 清空上传结果
const clearUploadResults = () => {
  uploadedFiles.value = [];
};

// Home 配置
const homeConfig = ref({
  main: { type: "video", src: "", title: "", desc: "", random: false },
  gallery: [],
  pinnedBlogId: null,
});

const availableFiles = ref([]); // 新增：回显所有资源

const addGalleryItem = () => {
  homeConfig.value.gallery.push({ type: "image", src: "", alt: "" });
};

const setAsMain = (url) => {
  homeConfig.value.main.src = url;
  homeConfig.value.main.random = false; // 选定后关闭随机
  window.$vmessage.success("已设为主展示～随机模式已关闭");
};

const saveHomeConfig = async () => {
  try {
    const payload = {
      ...homeConfig.value,
      main: {
        ...homeConfig.value.main,
        random: homeConfig.value.main.random ? 1 : 0, // 确保是数字
      },
    };
    await request.post("/admin/home/config", payload);
    $vmessage.success("Home 配置保存成功～✞");
    await loadHomeConfig(); // 保存后立即刷新
  } catch (err) {
    $vmessage.error("保存失败...");
  }
};

const loadHomeConfig = async () => {
  try {
    const res = await request.get("/admin/home/config");
    homeConfig.value = res.data;
    availableFiles.value = res.data.availableFiles || [];
  } catch (e) {
    console.log("加载 Home 配置失败，使用默认");
  }
};

// 加载时兼容（万一后端返回 boolean）
onMounted(async () => {
  try {
    const res = await request.get("/admin/home/config");
    homeConfig.value = res.data;
    // 兼容处理
    if (typeof homeConfig.value.main.random === "boolean") {
      homeConfig.value.main.random = homeConfig.value.main.random ? 1 : 0;
    }
  } catch (e) {
    console.log("初次加载，使用默认");
  }
});
const backToProfile = () => {
  router.push("/profile");
};
</script>

<style scoped>
.crt-admin-wrapper {
  width: 100%;
  min-height: 100vh;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
  box-sizing: border-box;
  font-family: "Courier New", Courier, monospace;
  color: #00ffff;
}

.crt-screen {
  position: relative;
  width: 100%;
  max-width: 1200px;
  background: rgba(0, 0, 0, 0.85);
  border: 2px solid #00ffff33;
  border-radius: 15px;
  box-shadow: 0 0 40px #00ffff44;
  overflow: hidden;
}

.crt-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 2px,
    rgba(0, 255, 255, 0.08) 2px,
    rgba(0, 255, 255, 0.08) 4px
  );
  pointer-events: none;
}

.crt-content {
  position: relative;
  padding: 40px;
  z-index: 2;
}

.crt-title {
  font-size: 3.2rem;
  text-align: center;
  margin: 0 0 20px;
  text-shadow: 0 0 20px #00ffff;
}

.admin-welcome {
  font-size: 1.6rem;
  color: #ff00ff;
  text-shadow: 0 0 20px #ff1493;
  text-align: center;
  margin-bottom: 50px;
}

.admin-section {
  margin: 50px 0;
  padding: 30px;
  background: rgba(5, 5, 20, 0.6);
  border: 1px solid #00ffff44;
  border-radius: 12px;
}

.section-title {
  font-size: 2.2rem;
  color: #00ffff;
  text-shadow: 0 0 15px #00ffff;
  margin-bottom: 25px;
}

.field-group {
  margin: 20px 0;
}

.gallery-item-edit {
  display: flex;
  gap: 12px;
  margin: 15px 0;
  align-items: center;
}

.crt-input {
  flex: 1;
  padding: 10px 14px;
  background: #000;
  border: 1px solid #00ffff88;
  color: #00ffff;
  font-family: inherit;
}

.crt-input.small {
  width: 220px;
}

.crt-mini-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #00ffff;
  color: #00ffff;
  cursor: pointer;
  transition: all 0.3s;
}

.crt-mini-btn:hover {
  background: #00ffff22;
  box-shadow: 0 0 15px #00ffff88;
}

.crt-mini-btn.danger {
  border-color: #ff00ff;
  color: #ff00ff;
}

.crt-mini-btn.danger:hover {
  background: #ff00ff22;
}

.crt-btn {
  display: block;
  width: 100%;
  max-width: 400px;
  margin: 40px auto 0;
  padding: 14px;
  font-size: 1.3rem;
  background: linear-gradient(45deg, #ff00ff, #00ffff);
  color: #000;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 0 20px #ff00ff88;
}

/* 快速操作区专属样式 */
.quick-actions {
  background: rgba(20, 0, 30, 0.65);
  border-color: #ff00ff55;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
  margin: 30px 0;
}

.sync-btn {
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  color: #000;
  font-weight: bold;
  box-shadow: 0 0 25px #00ffffaa;
}

.sync-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.crt-file-label {
  cursor: pointer;
}

.hidden-file-input {
  display: none;
}

.upload-btn {
  background: #ff1493;
  border-color: #ff69b4;
  box-shadow: 0 0 15px #ff1493;
}

.upload-status,
.upload-result {
  color: #00ffff;
  font-style: italic;
  text-shadow: 0 0 10px #00ffff;
  text-align: center;
}

.upload-result a {
  color: #ff00ff;
  text-decoration: none;
}

.upload-result a:hover {
  text-decoration: underline;
}

.coming-soon {
  font-style: italic;
  color: #00aaaa;
  text-shadow: 0 0 10px #00ffff;
}
.upload-results {
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #00ffff44;
  border-radius: 10px;
}

.upload-results h4 {
  margin: 0 0 10px;
  color: #ff69b4;
  text-shadow: 0 0 10px #ff1493;
}

.upload-results ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.upload-results li {
  padding: 8px 0;
  border-bottom: 1px dashed #00ffff33;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #00ffff;
}

.status-icon {
  font-weight: bold;
  min-width: 20px;
}

.status-icon.success {
  color: #00ff00;
}
.status-icon.error {
  color: #ff0000;
}
.status-icon.uploading {
  color: #ffff00;
  animation: blink 1s infinite;
}

.file-name {
  font-weight: bold;
  color: #ff69b4;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-msg {
  color: #ff1493;
}

.upload-result a {
  color: #00ffff;
  text-decoration: underline;
}

@keyframes blink {
  50% {
    opacity: 0.5;
  }
}

/* 禁用状态 */
.upload-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>