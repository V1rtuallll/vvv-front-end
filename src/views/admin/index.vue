<template>
  <div class="crt-admin-wrapper">
    <div class="crt-screen">
      <div class="crt-scanlines"></div>
      <div class="crt-content">
        <h2 class="crt-title">✦ 最高指挥中心 ✦</h2>
        <p class="admin-welcome">欢迎回来，最特别的V1rtual～❤️</p>

        <!-- 快速资源管理 -->
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

              <p v-if="uploading" class="upload-status">
                正在处理 {{ uploadTotal }} 个文件，已完成
                {{ uploadCompleted }} / {{ uploadTotal }}...
              </p>

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
                    <span v-if="item.url"
                      ><a :href="item.url" target="_blank">{{
                        item.url
                      }}</a></span
                    >
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
          <div class="field-group">
            <label>大展示 Alt（无障碍描述）</label>
            <input
              v-model="homeConfig.main.alt"
              class="crt-input"
              placeholder="月光温柔洒落～"
            />
          </div>
          <div v-if="homeConfig.main.random" class="field-group">
            <!-- <label
              >数据库可用资源（随机源，{{ availableFiles.length }} 条）</label
            > -->
            <ul class="file-list">
              <li v-for="(file, i) in availableFiles" :key="i">
                <a :href="file" target="_blank" class="file-link">{{ file }}</a>
                <button @click="setAsMain(file)" class="crt-mini-btn small">
                  设为主展示
                </button>
              </li>
            </ul>
          </div>

          <!-- <div class="field-group">
            <label>拼图列表（首页下方拼图）</label>
            <button @click="openGalleryEditor" class="crt-btn gallery-edit-btn">
              修改拼图（查看/编辑/预览）
            </button> -->

          <!-- 显示当前拼图数量
            <span class="gallery-count">
              当前拼图数量：{{ homeConfig.gallery.length }} 个
            </span>
          </div> -->
          <!-- 
          <div class="field-group">
            <label>置顶 Blog ID（右半部分）</label>
            <input
              v-model="homeConfig.pinnedBlogId"
              class="crt-input"
              placeholder="输入 Blog ID"
            />
          </div> -->

          <button @click="saveHomeConfig" class="crt-btn">
            保存 Home 配置
          </button>
        </div>

        <!-- 只替换资源浏览器这整块（从 <div class="admin-section resource-browser"> 开始到结束） -->
        <div class="admin-section resource-browser">
          <h3 class="section-title">
            媒体资源浏览器 ✨（共 {{ resourceTotal }} 条）
          </h3>

          <div class="filter-bar">
            <label>类型：</label>
            <select
              v-model="resourceFilter.type"
              @change="fetchResources(1)"
              class="crt-input small"
            >
              <option value="">全部</option>
              <option value="photo">图片</option>
              <option value="gif">动图</option>
              <option value="video">视频</option>
              <option value="music">音乐</option>
            </select>
            <!-- 顶部控制栏：分页 + 每页数量选择 -->
            <div class="top-controls">
              <div class="pagination top">
                <button
                  @click="fetchResources(resourcePage - 1)"
                  :disabled="resourcePage <= 1"
                  class="crt-mini-btn"
                >
                  上一页
                </button>
                <span class="page-info">
                  第 {{ resourcePage }} / {{ totalPages }} 页
                </span>
                <button
                  @click="fetchResources(resourcePage + 1)"
                  :disabled="resourcePage >= totalPages"
                  class="crt-mini-btn"
                >
                  下一页
                </button>
              </div>

              <div class="page-size-selector">
                <label>每页显示：</label>
                <select
                  v-model="pageSize"
                  @change="onPageSizeChange"
                  class="crt-input small"
                >
                  <option value="3">3 条</option>
                  <option value="5">5 条</option>
                  <option value="10">10 条</option>
                  <option value="20">20 条</option>
                </select>
              </div>
            </div>
          </div>

          <div class="resource-list-horizontal">
            <div
              v-for="item in resourceList"
              :key="item.id"
              class="resource-row"
            >
              <!-- 左侧：预览 -->
              <div class="preview-col">
                <img
                  v-if="item.type === 'photo' || item.type === 'gif'"
                  :src="item.url"
                  class="preview-img"
                />
                <video
                  v-else-if="item.type === 'video'"
                  :src="item.url"
                  controls
                  class="preview-media"
                ></video>
                <audio
                  v-else-if="item.type === 'music'"
                  :src="item.url"
                  controls
                  class="preview-media"
                ></audio>
              </div>

              <!-- 中间：核心信息 + SRC复制 -->
              <div class="info-col">
                <div class="header-info">
                  <span class="type-tag" :class="item.type">{{
                    item.type.toUpperCase()
                  }}</span>
                  <span class="meta">ID: {{ item.id }}</span>
                  <span class="meta">{{ formatDate(item.created_at) }}</span>
                  <span class="meta">{{
                    item.uploader_username || "V1rtual"
                  }}</span>
                </div>

                <div class="src-row">
                  <input
                    type="text"
                    :value="item.url"
                    readonly
                    class="src-input"
                    @click="$event.target.select()"
                  />
                  <button
                    @click="copyToClipboard(item.url)"
                    class="crt-mini-btn copy-btn"
                  >
                    复制 SRC
                  </button>
                </div>

                <div class="details">
                  <p><strong>标题：</strong>{{ item.filename || "未设置" }}</p>
                  <p><strong>描述：</strong>{{ item.description || "无" }}</p>
                  <p v-if="item.type === 'photo'">
                    <strong>Alt：</strong>{{ item.alt || "无" }}
                  </p>
                  <p v-if="item.type === 'photo'">
                    <strong>分类：</strong>{{ item.category || "无" }}
                  </p>
                  <p v-if="item.type === 'video' || item.type === 'music'">
                    <strong>时长：</strong
                    >{{ item.duration ? item.duration + "秒" : "未知" }}
                  </p>
                  <p><strong>标签：</strong>{{ item.tags || "无" }}</p>
                </div>
              </div>

              <!-- 右侧：操作按钮 -->
              <div class="action-col">
                <button
                  @click="openEditModal(item)"
                  class="crt-mini-btn edit-btn"
                >
                  修改信息
                </button>
              </div>
            </div>

            <div v-if="resourceList.length === 0" class="empty-tip">
              暂无资源
            </div>
          </div>
        </div>

        <button @click="backToProfile" class="crt-btn back-btn">
          返回个人中心
        </button>

        <!-- 编辑弹窗 -->
        <div
          v-if="editingItem"
          class="edit-modal-overlay"
          @click="editingItem = null"
        >
          <div class="edit-modal" @click.stop>
            <h3>
              编辑 {{ editingItem.type.toUpperCase() }} (ID:
              {{ editingItem.id }})
            </h3>
            <div class="field-group">
              <label>标题</label
              ><input v-model="editingItem.filename" class="crt-input" />
            </div>
            <div class="field-group">
              <label>描述</label
              ><textarea
                v-model="editingItem.description"
                class="crt-input"
              ></textarea>
            </div>
            <div class="field-group" v-if="editingItem.type === 'photo'">
              <label>Alt</label
              ><input v-model="editingItem.alt" class="crt-input" />
              <label>分类</label
              ><input v-model="editingItem.category" class="crt-input" />
            </div>
            <div
              class="field-group"
              v-if="
                editingItem.type === 'video' || editingItem.type === 'music'
              "
            >
              <label>时长（秒）</label
              ><input
                v-model.number="editingItem.duration"
                type="number"
                class="crt-input"
              />
            </div>
            <div class="field-group">
              <label>标签</label
              ><input v-model="editingItem.tags" class="crt-input" />
            </div>
            <div class="modal-actions">
              <button @click="saveEdit" class="crt-btn">保存</button>
              <button @click="editingItem = null" class="crt-mini-btn danger">
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import request from "@/utils/request";

const router = useRouter();
const authStore = useAuthStore();

// === 原有所有变量和方法保持不变 ===
const syncing = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadedFiles = ref([]);
const uploadTotal = ref(0);
const uploadCompleted = ref(0);

const homeConfig = ref({
  main: { type: "video", src: "", title: "", desc: "", random: false },
  gallery: [],
  pinnedBlogId: null,
});
const availableFiles = ref([]);

const addGalleryItem = () => {
  homeConfig.value.gallery.push({ type: "image", src: "", alt: "" });
};

const saveHomeConfig = async () => {
  try {
    const payload = {
      ...homeConfig.value,
      main: {
        ...homeConfig.value.main,
        random: homeConfig.value.main.random ? 1 : 0,
      },
    };
    await request.post("/admin/home/config", payload);
    window.$vmessage.success("Home 配置保存成功～✞");
    await loadHomeConfig();
  } catch (err) {
    window.$vmessage.error("保存失败...");
  }
};
const loadHomeConfig = async () => {
  try {
    const res = await request.get("/admin/home/config");
    homeConfig.value = res.data;
    availableFiles.value = res.data.availableFiles || [];
    if (typeof homeConfig.value.main.random === "boolean") {
      homeConfig.value.main.random = homeConfig.value.main.random ? 1 : 0;
    }
  } catch (e) {
    console.log("加载 Home 配置失败，使用默认");
  }
};

// 同步、上传等原有方法完全不动（直接复制你原来的）
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
const clearUploadResults = () => {
  uploadedFiles.value = [];
};
const backToProfile = () => {
  router.push("/profile");
};

// === 新增：媒体资源浏览器相关 ===
const resourceFilter = ref({ type: "" });
const resourceList = ref([]);
const resourceTotal = ref(0);
const resourcePage = ref(1);
const resourceLoading = ref(false);

// totalPages 也需要动态计算
const totalPages = computed(() =>
  Math.ceil(resourceTotal.value / pageSize.value)
);
// 修改 fetchResources 方法，支持动态 limit
const fetchResources = async (page = 1) => {
  resourcePage.value = page;
  resourceLoading.value = true;
  try {
    const params = {
      page: resourcePage.value,
      limit: pageSize.value, // 动态使用 pageSize
      type: resourceFilter.value.type || undefined,
    };
    const res = await request.get("/admin/resources", { params }); // 注意路径是你后端的 /api/admin/resources
    resourceList.value = res.data.list || [];
    resourceTotal.value = res.data.total || 0;
  } catch (err) {
    window.$vmessage.error("加载资源失败啦～月光暂时被云遮住了QAQ");
    resourceList.value = [];
    resourceTotal.value = 0;
  } finally {
    resourceLoading.value = false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const openUrl = (url) => {
  window.open(url, "_blank");
};

// === onMounted ===
onMounted(async () => {
  if (
    !authStore.user ||
    authStore.user.username !== "V1rtual" ||
    authStore.user.id !== 0
  ) {
    router.push("/profile");
    window.$vmessage.error("这扇银门只为你一人敞开哦～🖤");
    return;
  }
  await loadHomeConfig();
  await fetchResources(1); // 初始加载资源列表
});

// 新增：编辑相关
const editingItem = ref(null);
const openEditModal = (item) => {
  editingItem.value = { ...item };
};
const saveEdit = async () => {
  if (!editingItem.value) return;

  try {
    const payload = {
      id: editingItem.value.id,
      type: editingItem.value.type,
      filename: editingItem.value.filename,
      description: editingItem.value.description,
      alt: editingItem.value.alt,
      category: editingItem.value.category,
      duration: editingItem.value.duration,
      tags: editingItem.value.tags,
    };

    await request.post("/admin/resource/update", payload);

    // 本地更新列表
    const idx = resourceList.value.findIndex(
      (i) => i.id === editingItem.value.id
    );
    if (idx !== -1) resourceList.value[idx] = { ...editingItem.value };

    window.$vmessage.success("资源信息已温柔保存到数据库～✞");
  } catch (err) {
    window.$vmessage.error("保存失败啦QAQ…月光抖了一下");
  } finally {
    editingItem.value = null;
  }
};
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    window.$vmessage.success("SRC 已复制～❤️");
  } catch {
    window.$vmessage.error("复制失败QAQ");
  }
};

// 新增：每页显示数量
const pageSize = ref(5); // 默认10条

// 当选择每页数量改变时，重置到第一页并重新加载
const onPageSizeChange = () => {
  resourcePage.value = 1; // 切换每页数量时跳回第一页
  fetchResources(1);
};
</script>

<style scoped>
/* 只保留必要样式，去除所有冗余 */
.admin-section {
  margin: 50px 0;
  padding: 30px;
  background: rgba(5, 5, 20, 0.6);
  border: 1px solid #00ffff44;
  border-radius: 12px;
}
.quick-actions {
  background: rgba(20, 0, 30, 0.65);
  border-color: #ff00ff55;
}

.resource-browser {
  margin: 60px 0;
}
.filter-bar {
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.resource-list-horizontal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.resource-row {
  display: flex;
  align-items: stretch;
  background: rgba(0, 10, 25, 0.7);
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #00ffff33;
  gap: 20px;
  flex-wrap: wrap; /* 小屏幕自动折行 */
}

.preview-col {
  flex: 0 0 220px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.preview-img {
  max-height: 180px;
  max-width: 220px;
  border-radius: 8px;
  box-shadow: 0 0 15px #00ffff44;
  object-fit: contain;
}
.preview-media {
  max-width: 220px;
  max-height: 120px;
  border-radius: 8px;
}

.info-col {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.header-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  color: #00ffff;
  font-size: 0.95rem;
}
.header-info .meta {
  color: #00dddd;
}

.src-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.src-input {
  flex: 1;
  min-width: 280px;
  padding: 10px;
  background: #000;
  border: 1px solid #00ffff88;
  color: #00ffff;
  border-radius: 6px;
}
.copy-btn {
  background: linear-gradient(45deg, #ff69b4, #00ffff);
  color: #000;
  font-weight: bold;
  white-space: nowrap;
}

.details p {
  margin: 5px 0;
  color: #00dddd;
  font-size: 0.95rem;
}

.action-col {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  padding-top: 40px; /* 与src对齐 */
}
.edit-btn {
  padding: 10px 18px;
  white-space: nowrap;
}

.empty-tip {
  text-align: center;
  padding: 60px;
  color: #00aaaa;
  font-style: italic;
}

.pagination {
  margin: 40px 0;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 20px;
  align-items: center;
}
/* 编辑弹窗保持简洁 */
.edit-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}
.edit-modal {
  width: 90%;
  max-width: 700px;
  background: rgba(0, 0, 20, 0.9);
  padding: 35px;
  border-radius: 15px;
  border: 2px solid #00ffff;
  box-shadow: 0 0 30px #00ffff88;
}
.modal-actions {
  margin-top: 25px;
  display: flex;
  gap: 15px;
  justify-content: center;
}

.back-btn {
  margin: 40px auto 0;
  display: block;
}
.pagination.top {
  margin: 20px 0 30px 0;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 25px;
  font-size: 1.1rem;
  color: #ff69b4;
  font-style: italic;
}

.page-info {
  min-width: 180px;
  text-align: center;
}

/* 如果你想让按钮更梦幻～ */
.pagination.top .crt-mini-btn {
  padding: 10px 20px;
  background: linear-gradient(45deg, #ff00ff33, #00ffff33);
  border: 1px solid #00ffff88;
  box-shadow: 0 0 15px #00ffff44;
}
.top-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin: 20px 0 30px 0;
  padding: 15px;
  background: rgba(0, 0, 20, 0.4);
  border-radius: 10px;
  border: 1px solid #00ffff33;
}

.pagination.top {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 1.1rem;
  color: #ff69b4;
}

.page-info {
  min-width: 160px;
  text-align: center;
  font-style: italic;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #00ffff;
  font-size: 1rem;
}

.page-size-selector label {
  font-style: italic;
}
</style>