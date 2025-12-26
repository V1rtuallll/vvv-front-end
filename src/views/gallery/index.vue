<template>
  <div class="gallery-wrapper">
    <!-- 头部：简洁优雅，不重叠 -->
    <div class="gallery-header">
      <div class="header-content">
        <h1 class="gallery-title">Gallery</h1>
        <p class="gallery-subtitle">Share ur memory.</p>
      </div>

      <div class="header-right">
        <div v-if="authStore.isLoggedIn" class="current-user">
          <img
            :src="authStore.user.avatar || '/default-avatar.gif'"
            alt="头像"
            class="user-avatar"
          />
          <span class="user-name">@{{ authStore.user.username }}</span>
          <br />
          <button @click="openUploadModal" class="crt-btn upload-btn">
            Upload
          </button>
        </div>
      </div>
    </div>

    <!-- 资源网格：一行两个，更宽松不瘦长 -->
    <div class="gallery-grid">
      <div
        v-for="item in galleryList"
        :key="item.id"
        class="gallery-card"
        @click="openDetailModal(item)"
      >
        <div class="media-preview-wrapper">
          <img
            v-if="item.type === 'photo' || item.type === 'gif'"
            :src="item.src"
            class="media-preview"
          />
          <video
            v-else-if="item.type === 'video'"
            :src="item.src"
            loop
            muted
            class="media-preview"
          ></video>
          <audio
            v-else-if="item.type === 'music'"
            :src="item.src"
            controls
            class="media-audio-preview"
          ></audio>
          <div class="type-badge" :class="item.type">
            {{ item.type.toUpperCase() }}
          </div>
        </div>

        <div class="card-body">
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-desc">{{ item.description || "无描述～" }}</p>

          <div
            class="card-meta"
            @click.stop="
              openUserProfile(
                item.userId || item.uploaderId,
                item.uploaderUsername
              )
            "
          >
            <img
              :src="
                item.uploaderAvatar ||
                item.uploader_avatar ||
                '/default-avatar.gif'
              "
              alt="上传者头像"
              class="card-avatar"
            />
            <div class="meta-text">
              <span class="uploader"
                >@{{ item.uploaderUsername || "神秘人" }}</span
              >
              <span class="time">{{ formatShortDate(item.createdAt) }}</span>
            </div>
          </div>

          <div class="interactions">
            <span class="like-count">❤️ {{ item.likes }}</span>
            <span class="comment-count">💬 {{ item.commentCount || 0 }}</span>
          </div>
        </div>
      </div>

      <div v-if="galleryList.length === 0" class="empty-state">
        <p>There's empty...</p>
        <button @click="openUploadModal" class="crt-btn">立即上传</button>
      </div>
    </div>

    <!-- 底部分页 -->
    <div class="bottom-pagination" v-if="total > 0">
      <select v-model="limit" @change="changeLimit" class="page-size-select">
        <option value="4">4 条</option>
        <option value="6">6 条</option>
        <option value="8">8 条</option>
        <option value="10">10 条</option>
      </select>

      <button
        @click="changePage(page - 1)"
        :disabled="page <= 1"
        class="crt-mini-btn"
      >
        上一页
      </button>
      <span class="page-info"
        >第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 条）</span
      >
      <button
        @click="changePage(page + 1)"
        :disabled="page >= totalPages"
        class="crt-mini-btn"
      >
        下一页
      </button>
    </div>
    <!-- 上传弹窗（完整还原你原来的样式） -->
    <div
      v-if="showUploadModal"
      class="modal-overlay"
      @click="showUploadModal = false"
    >
      <div class="upload-modal" @click.stop>
        <h2>上传到Gallery</h2>
        <div class="upload-area">
          <label class="file-label">
            <span>选择文件（支持多选，一次只能上传同种类型）</span>
            <input
              type="file"
              multiple
              @change="handleFiles"
              accept="image/*,video/*,.gif,audio/*"
              class="hidden-input"
            />
            <span class="select-btn">选择文件</span>
          </label>
        </div>

        <div v-if="pendingFiles.length > 0" class="preview-list">
          <div v-for="(file, i) in pendingFiles" :key="i" class="preview-item">
            <div class="thumb-wrapper">
              <img
                v-if="file.preview && file.type.startsWith('image')"
                :src="file.preview"
                class="thumb"
              />
              <video
                v-else-if="file.type.startsWith('video')"
                :src="file.preview"
                class="thumb"
              ></video>
              <audio
                v-else-if="file.type.startsWith('audio')"
                :src="file.preview"
                controls
                class="thumb"
              ></audio>
              <div v-else class="thumb-placeholder">{{ file.name }}</div>
            </div>
            <input
              v-model="file.title"
              placeholder="标题（默认文件名）"
              class="title-input"
            />
            <textarea
              v-model="file.description"
              placeholder="写点描述吧～"
              class="desc-input"
            ></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button
            @click="uploadAll"
            :disabled="uploading || pendingFiles.length === 0"
            class="crt-btn"
          >
            {{ uploading ? "上传中..." : "确认上传" }}
          </button>
          <button @click="showUploadModal = false" class="crt-mini-btn danger">
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗：左70%大媒体 + 右30%评论 + 详情固定评论滚动 -->
    <div v-if="currentItem" class="modal-overlay" @click="closeDetail">
      <div class="detail-modal" @click.stop>
        <!-- 右上角关闭按钮 -->
        <button @click="closeDetail" class="close-btn">×</button>

        <!-- 左边：70%超级大媒体，无空隙，等高 -->
        <div class="detail-left">
          <img
            v-if="currentItem.type === 'photo' || currentItem.type === 'gif'"
            :src="currentItem.src"
            class="detail-media"
          />
          <video
            v-else-if="currentItem.type === 'video'"
            :src="currentItem.src"
            controls
            autoplay
            loop
            class="detail-media"
          ></video>
          <audio
            v-else-if="currentItem.type === 'music'"
            :src="currentItem.src"
            controls
            class="detail-audio"
          ></audio>
        </div>

        <!-- 右边：30%评论区 -->
        <div class="detail-right">
          <!-- 详情信息固定在上 -->
          <div class="detail-info-fixed">
            <h2>{{ currentItem.title }}</h2>
            <p class="detail-desc" ref="descRef">
              {{ currentItem.description || "无描述～" }}
            </p>
            <div
              class="detail-meta"
              @click.stop="
                openUserProfile(
                  currentItem.userId || currentItem.uploaderId,
                  currentItem.uploaderUsername
                )
              "
            >
              <img
                :src="currentItem.uploaderAvatar || '/default-avatar.gif'"
                alt="上传者头像"
                class="detail-uploader-avatar"
              />
              <span class="uploader-name"
                >@{{ currentItem.uploaderUsername || "神秘人" }}</span
              >
              <div class="meta-info">
                <span>{{ formatDate(currentItem.createdAt) }}</span>
                <span class="click-tip"> 点击头像查看用户</span>
              </div>

              <br />
            </div>
            <button
              @click.stop="toggleLike(currentItem)"
              class="like-btn"
              :class="{ liked: currentItem.isLiked }"
            >
              ❤️ {{ currentItem.likes }}
            </button>
          </div>
          <!-- 新增：可拖拽的分隔条 -->
          <div class="resize-handle" @mousedown="startResize">
            <span class="resize-tip">拖拽调整上下高度占比！</span>
          </div>
          <!-- 评论区可滚动 -->
          <div class="comments-scrollable">
            <h3>Comments({{ comments.length }})</h3>
            <div class="comment-input">
              <textarea
                v-model="newComment"
                placeholder="Say something..."
                rows="3"
              ></textarea>
              <button
                @click="postComment"
                :disabled="!newComment.trim()"
                class="crt-mini-btn send-btn"
              >
                发送
              </button>
            </div>

            <div class="comment-list">
              <div v-for="c in comments" :key="c.id" class="comment-item">
                <div class="comment-header">
                  <strong>@{{ c.username }}</strong>
                  <span class="comment-time">{{
                    formatShortDate(c.createdAt)
                  }}</span>
                </div>
                <p class="comment-content">{{ c.content }}</p>
                <div class="comment-like-area" @click.stop="likeComment(c)">
                  <span
                    class="comment-like-count"
                    :class="{ 'eternal-liked': c.isLiked }"
                  >
                    ❤️ {{ c.likes || c.likeCount || 0 }}
                  </span>
                </div>
              </div>
              <div v-if="comments.length === 0" class="no-comment">
                There's no comment.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- 用户详情弹窗 -->
  <div
    v-if="showUserProfile"
    class="crt-profile-modal"
    @click.self="showUserProfile = false"
  >
    <div class="crt-profile-content" @click.stop>
      <div class="crt-screen">
        <div class="crt-scanlines"></div>
        <div class="crt-content">
          <h2 class="crt-title">{{ selectedUser?.username || "?" }}</h2>

          <!-- 头像 -->
          <div class="avatar-section">
            <img
              :src="selectedUser?.avatar || '/default-avatar.gif'"
              alt="头像"
              class="crt-avatar"
            />
          </div>

          <!-- 用户信息展示 -->
          <div class="info-display">
            <p class="user-info">ID：{{ selectedUser?.id }}</p>
            <p class="user-info">
              性别：{{ displayGender(selectedUser?.sex) }}
            </p>
            <p class="user-info">
              描述：{{ selectedUser?.description || "未设置～" }}
            </p>
            <p class="user-info">
              创建时间：{{
                formatDate(selectedUser?.createdAt || selectedUser?.createTime)
              }}
            </p>
          </div>

          <button
            @click="showUserProfile = false"
            class="crt-mini-btn close-profile-btn"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import request from "@/utils/request";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

const page = ref(1);
const limit = ref(6);
const total = ref(0);
const totalPages = computed(() => Math.ceil(total.value / limit.value));

const galleryList = ref([]);
const showUploadModal = ref(false);
const pendingFiles = ref([]);
const uploading = ref(false);

const currentItem = ref(null);
const comments = ref([]);
const newComment = ref("");
const showUserProfile = ref(false);
const selectedUser = ref(null);
const descRef = ref(null); // 新增 ref

const likeComment = async (comment) => {
  if (comment.isLiked) {
    window.$vmessage.info("不能重复点赞");
    return;
  }

  try {
    await request.post("/gallery/comment/like", { comment_id: comment.id });
    const res = await request.get(`/gallery/comments/${currentItem.value.id}`);
    comments.value = res.data.map((c) => ({
      ...c,
      isLiked: c.isLiked || false,
      likeCount: c.likeCount || c.likes || 0, // 兼容likes字段
    }));
  } catch (err) {
    window.$vmessage.error("点赞失败");
  }
};
const openUserProfile = async (userId, username) => {
  try {
    const res = await request.get(`/user/info/${username}`);
    selectedUser.value = res.data || { username };
    showUserProfile.value = true;
    console.log(selectedUser.value);
  } catch (err) {
    selectedUser.value = {
      username,
      avatar: "/default-avatar.gif",
      sex: "SECRET",
      description: "无",
      createdAt: new Date(),
    };
    showUserProfile.value = true;
  }
};
onMounted(() => {
  loadGallery();
});
const closeDetail = () => {
  currentItem.value = null;
  comments.value = [];
  newComment.value = "";
};
const loadGallery = async () => {
  try {
    const res = await request.get("/gallery/list", {
      params: { page: page.value, limit: limit.value },
    });
    galleryList.value = res.data.list || [];
    total.value = res.data.total || 0;
  } catch (err) {
    window.$vmessage.error("加载失败");
  }
};

const changePage = (newPage) => {
  if (newPage < 1 || newPage > totalPages.value) return;
  page.value = newPage;
  loadGallery();
};

const changeLimit = () => {
  page.value = 1;
  loadGallery();
};

const openUploadModal = () => {
  pendingFiles.value = [];
  showUploadModal.value = true;
};

const handleFiles = (e) => {
  const files = Array.from(e.target.files);
  pendingFiles.value = files.map((file, index) => ({
    file,
    name: file.name,
    type: file.type,
    preview: URL.createObjectURL(file),
    title:
      file.name.split(".").slice(0, -1).join(".") +
      (files.length > 1 ? ` (${index + 1})` : ""),
    description: "",
  }));
};

const uploadAll = async () => {
  if (pendingFiles.value.length === 0) return;
  uploading.value = true;

  const formData = new FormData();
  pendingFiles.value.forEach((f, i) => {
    formData.append("files", f.file);
    formData.append("titles", f.title);
    formData.append("descriptions", f.description);
  });

  try {
    await request.post("/gallery/upload", formData);
    window.$vmessage.success("上传成功");
    showUploadModal.value = false;
    pendingFiles.value = [];
    loadGallery();
  } catch (err) {
    window.$vmessage.error("上传失败");
  } finally {
    uploading.value = false;
  }
};
const toggleLike = async (item) => {
  if (item.isLiked) {
    window.$vmessage.info("不能重复点赞");
    return;
  }

  const originalLikes = item.likes || 0;

  try {
    const res = await request.get(`/gallery/isLiked/${item.id}`);
    const reallyLiked = res.data;

    if (reallyLiked) {
      item.isLiked = true;
      window.$vmessage.info("不能重复点赞");
      return;
    }

    // 4. 未赞 → 乐观更新UI
    item.isLiked = true;
    item.likes = originalLikes + 1;

    // 5. 调用点赞接口
    await request.post("/gallery/like", { id: item.id });
  } catch (err) {
    // 6. 失败回滚（前端后端永远一致）
    item.isLiked = false;
    item.likes = originalLikes;

    const msg = err.response?.data?.msg || "点赞失败";
    if (msg.includes("已经") || msg.includes("已")) {
      window.$vmessage.info(msg);
    } else {
      window.$vmessage.error(msg);
    }
  }
};

const openDetailModal = async (item) => {
  currentItem.value = { ...item, isLiked: false };
  try {
    const res = await request.get(`/gallery/comments/${item.id}`);
    comments.value = res.data.map((c) => ({
      ...c,
      isLiked: c.isLiked || false,
      likeCount: c.likeCount || 0,
    }));
  } catch (err) {
    comments.value = [];
  }
};
const postComment = async () => {
  if (!newComment.value.trim()) return;
  try {
    await request.post("/gallery/comment", {
      target_id: currentItem.value.id,
      content: newComment.value,
    });
    newComment.value = "";
    const res = await request.get(`/gallery/comments/${currentItem.value.id}`);
    comments.value = res.data || [];
    currentItem.value.commentCount = (currentItem.value.commentCount || 0) + 1;
  } catch (err) {}
};
const displayGender = (sex) => {
  if (!sex) return "未设置～";
  const s = sex.toString().toLowerCase().trim();
  switch (s) {
    case "male":
    case "m":
      return "男";
    case "female":
    case "f":
      return "女";
    case "secret":
    case "s":
    case "other":
      return "其他/秘密";
    default:
      return "未设置～";
  }
};
const isResizing = ref(false);
const startY = ref(0);
const initialDescHeight = ref(0);

const startResize = (e) => {
  e.preventDefault();
  isResizing.value = true;
  startY.value = e.clientY;

  if (!descRef.value) {
    console.error("descRef 还没绑定！");
    return;
  }

  initialDescHeight.value = descRef.value.getBoundingClientRect().height;
  console.log("初始高度:", initialDescHeight.value);

  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onMouseMove, { passive: false });
  document.addEventListener("mouseup", stopResize);
};

const onMouseMove = (e) => {
  if (!isResizing.value) return;
  e.preventDefault();

  const deltaY = e.clientY - startY.value;
  const newHeight = initialDescHeight.value + deltaY;

  if (descRef.value) {
    const min = 60;
    const max = window.innerHeight * 0.5;
    const safeHeight = Math.max(min, Math.min(max, newHeight));
    descRef.value.style.height = `${safeHeight}px`;
    console.log("设置高度:", safeHeight);
  }
};

const stopResize = () => {
  if (!isResizing.value) return;
  isResizing.value = false;
  document.body.style.userSelect = "";
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", stopResize);
  console.log("拖拽结束");
};
const formatDate = (date) => new Date(date).toLocaleString("zh-CN");
const formatShortDate = (date) => new Date(date).toLocaleDateString("zh-CN");
</script>

<style scoped>
/* 整体页面居中 */
.gallery-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 0px 40px;
  min-height: 100vh;
  background: #000;
  color: #00ffff;
}

/* 头部 */
.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 60px;
  padding: 0 20px;
}
.header-content {
  text-align: left;
}
.gallery-title {
  font-size: 3.2rem;
  text-shadow: 0 0 30px #ff69b4;
  margin: 0 0 15px 0;
}
.gallery-subtitle {
  font-size: 1.4rem;
  color: #cceeff;
  margin: 0;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-top: 20px;
}
.current-user {
  display: flex;
  align-items: center;
  gap: 15px;
}
.user-avatar {
  width: 120px;
  height: 120px;
  border: 2px solid #ff69b4;
  box-shadow: 0 0 18px #ff1493;
  object-fit: cover;
  object-position: center;
  flex-shrink: 0;
}
.user-name {
  font-size: 1.3rem;
  color: #ffaae6;
  font-weight: bold;
}
.upload-btn {
  padding: 15px 38px;
  font-size: 1.4rem;
  background: linear-gradient(45deg, #ff69b4, #00ffff);
  box-shadow: 0 0 35px rgba(255, 105, 180, 0.7);
  border: none;
  border-radius: 35px;
}

/* 网格：一行两个卡片 */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 70px;
  margin: 0 auto;
}
@media (max-width: 1000px) {
  .gallery-grid {
    grid-template-columns: 1fr;
    gap: 60px;
  }
}

/* 卡片 */
.gallery-card {
  background: rgba(10, 0, 30, 0.8);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
  transition: all 0.5s ease;
  cursor: pointer;
}
.gallery-card:hover {
  transform: translateY(-15px);
  box-shadow: 0 25px 60px rgba(255, 105, 180, 0.4);
}
.media-preview-wrapper {
  position: relative;
  height: 200px;
  overflow: hidden;
}
.media-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.gallery-card:hover .media-preview {
  transform: scale(1.12);
}
.media-audio-preview {
  width: 100%;
  padding: 40px;
  background: rgba(0, 0, 0, 0.6);
}
.type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 10px 20px;
  border-radius: 30px;
  font-size: 0.8rem;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}
.type-badge.photo {
  border: 2px solid #00ffff;
  color: #00ffff;
}
.type-badge.gif {
  border: 2px solid #ff00ff;
  color: #ff00ff;
}
.type-badge.video {
  border: 2px solid #ffff00;
  color: #ffff00;
}
.type-badge.music {
  border: 2px solid #00ff00;
  color: #00ff00;
}

.card-body {
  padding: 10px;
}
.card-title {
  font-size: 1.6rem;
  margin: 0 0 15px;
  color: #ffaae6;
  word-break: break-all;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  hyphens: auto;
}
.card-desc {
  font-size: 1.15rem;
  color: #cceeff;
  margin-bottom: 25px;
  opacity: 0.95;
  height: 1.4rem;
  word-break: break-all;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  hyphens: auto;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 25px;
}
.card-avatar {
  width: 45px;
  height: 45px;
  border: 2px solid #ff69b4;
  box-shadow: 0 0 15px #ff1493;
  object-fit: cover;
  object-position: center;
  flex-shrink: 0;
}
.meta-text {
  display: flex;
  flex-direction: column;
}
.uploader {
  color: #ffaae6;
  font-weight: bold;
  font-size: 1.1rem;
}
.time {
  font-size: 0.95rem;
  color: #aaa;
}

/* 互动区 */
.interactions {
  display: flex;
  justify-content: space-around;
  font-size: 1.2rem;
  padding-top: 10px;
  border-top: 1px dashed rgba(0, 255, 255, 0.4);
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor,
    0 0 30px currentColor;
}
.like-count {
  color: #ff69b4 !important;
  text-shadow: 0 0 15px #ff69b4, 0 0 30px #ff1493, 0 0 45px #ff69b4;
  animation: pulse-glow 2s infinite alternate;
}
.comment-count {
  color: #00ffff !important;
  text-shadow: 0 0 15px #00ffff, 0 0 30px #00ffff, 0 0 45px #00ffff;
  animation: pulse-glow 2s infinite alternate 0.5s;
}
@keyframes pulse-glow {
  from {
    text-shadow: 0 0 10px currentColor, 0 0 20px currentColor,
      0 0 30px currentColor;
  }
  to {
    text-shadow: 0 0 20px currentColor, 0 0 40px currentColor,
      0 0 60px currentColor;
  }
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 160px 20px;
  color: #888;
}
.empty-state p {
  font-size: 2rem;
  margin-bottom: 40px;
}

/* 底部分页 */
.bottom-pagination {
  margin: 80px auto 40px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 35px;
  font-size: 1.3rem;
  color: #ffaae6;
}
.page-size-select {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #00ffff88;
  color: #00ffff;
  padding: 12px 25px;
  border-radius: 30px;
  font-size: 1.1rem;
}

/* 详情弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.96);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  backdrop-filter: blur(15px);
}
.detail-modal {
  position: relative;
  width: 96%;
  max-width: 1600px;
  height: 92vh;
  display: flex;
  background: transparent;
  border-radius: 35px;
  overflow: hidden;
  box-shadow: 0 0 100px rgba(0, 255, 255, 0.4);
}
.close-btn {
  position: absolute;
  top: 20px;
  right: 30px;
  z-index: 10;
  width: 50px;
  height: 50px;
  background: rgba(255, 105, 180, 0.2);
  border: 2px solid #ff69b4;
  border-radius: 50%;
  color: #ff69b4;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.4s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover {
  background: rgba(255, 105, 180, 0.6);
  transform: scale(1.15);
  box-shadow: 0 0 30px rgba(255, 105, 180, 0.8);
}

/* 左边媒体 */
.detail-left {
  flex: 0 0 70%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.detail-audio {
  width: 90%;
  max-width: 1000px;
}

/* 右边评论区整体 */
.detail-right {
  flex: 0 0 30%;
  height: 100%;
  background: rgba(0, 0, 20, 0.98);
  display: flex;
  flex-direction: column;
  padding: 25px 20px;
  box-sizing: border-box;
  overflow: auto;
}

/* 固定在上方的信息区 */
.detail-info-fixed {
  flex: 0 0 auto;
  overflow-y: auto;
  margin-bottom: 0;
}
.detail-info-fixed h2 {
  font-size: 2.1rem;
  color: #ff69b4;
  margin-bottom: 12px;
  text-shadow: 0 0 15px #ff00ff;
  line-height: 1.3;
  word-break: break-word;
}
/* 描述区：默认高度短一点（约 4 行） */
.detail-desc {
  font-size: 1.25rem;
  line-height: 1.7;
  color: #cceeff;
  margin: 0 0 15px 0;
  word-break: break-word;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;

  /* 默认高度短，内容多时自己滚动 */
  height: 6.8em; /* ≈ 4 行（1.25rem * 1.7 * 4），可调成 5em ~ 8em */
  min-height: 3.8em; /* 防止拖拽后太小 */
  max-height: none; /* 允许无限拉大 */
}

.resize-handle {
  height: 15px; /* 固定高度，不会变 */
  background: linear-gradient(to right, transparent, #ff69b4 50%, transparent);
  cursor: ns-resize;
  margin: 10px 0;
  border-radius: 6px;
  position: relative; /* 让文字能定位 */
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
/* 评论区 */
.comments-scrollable {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}
.comment-input {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.comment-input textarea {
  flex: 1;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #00ffff88;
  color: #00ffff;
  border-radius: 15px;
  font-size: 1.1rem;
  resize: vertical;
}
.send-btn {
  align-self: flex-end;
  padding: 14px 28px;
}
.comment-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}
.comment-item {
  background: rgba(255, 255, 255, 0.05);
  padding: 18px;
  border-radius: 15px;
  margin-bottom: 18px;
}
.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #ff69b4;
}
.comment-content {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #cceeff;
}
.no-comment {
  text-align: center;
  color: #888;
  font-style: italic;
  padding: 60px 20px;
  font-size: 1.3rem;
}

/* 点赞按钮 */
.like-btn {
  align-self: flex-start;
  padding: 14px 35px;
  font-size: 1.4rem;
  background: rgba(255, 105, 180, 0.3);
  border: 2px solid #ff69b4;
  color: #ff69b4;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.4s;
  text-shadow: 0 0 15px #ff69b4;
}
.like-btn:hover {
  text-shadow: 0 0 30px #ff69b4;
}
.like-btn.liked {
  text-shadow: 0 0 40px #ff1493;
  animation: pulse-glow 1.5s infinite alternate;
}

/* 滚动条美化 */
.detail-right::-webkit-scrollbar,
.detail-desc::-webkit-scrollbar,
.comment-list::-webkit-scrollbar {
  width: 6px;
}
.detail-right::-webkit-scrollbar-thumb,
.detail-desc::-webkit-scrollbar-thumb,
.comment-list::-webkit-scrollbar-thumb {
  background: rgba(255, 105, 180, 0.5);
  border-radius: 3px;
}
.detail-right::-webkit-scrollbar-thumb:hover,
.detail-desc::-webkit-scrollbar-thumb:hover,
.comment-list::-webkit-scrollbar-thumb:hover {
  background: #ff69b4;
}

/* 小屏幕适配 */
@media (max-width: 1100px) {
  .detail-modal {
    flex-direction: column;
    height: 96vh;
  }
  .detail-left {
    flex: 0 0 55%;
    height: 55%;
  }
  .detail-right {
    flex: 1;
    height: 45%;
  }
}
/* 用户详情弹窗：CRT超梦幻风格～ */
.crt-profile-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.crt-profile-content {
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
}

.crt-screen {
  position: relative;
  background: #000;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 0 60px rgba(0, 255, 255, 0.6);
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
  padding: 60px 40px;
  text-align: center;
  animation: crt-flicker 8s infinite;
}

.crt-title {
  font-size: 2.8rem;
  color: #00ffff;
  text-shadow: 0 0 30px #00ffff;
  margin-bottom: 40px;
}

.avatar-section {
  margin: 40px 0;
}

.crt-avatar {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 4px solid #00ffff;
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.8);
  object-fit: cover;
}

.avatar-tip {
  margin-top: 20px;
  font-size: 1.3rem;
  color: #00aaaa;
}

.info-display {
  margin: 50px 0;
}

.user-info {
  font-size: 1.5rem;
  color: #00ffff;
  margin: 25px 0;
  text-shadow: 0 0 15px #00ffff;
}

.close-profile-btn {
  margin-top: 40px;
  padding: 15px 40px;
  font-size: 1.4rem;
}
/* 详情页上传者头像区域：可爱圆圆 + 点击手型 */
.detail-uploader {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 30px;
  cursor: pointer;
  padding: 12px;
  border-radius: 20px;
  transition: all 0.4s;
}

.detail-uploader:hover {
  background: rgba(255, 105, 180, 0.1);
  box-shadow: 0 0 20px rgba(255, 105, 180, 0.4);
}

.detail-uploader-avatar {
  width: 70px;
  height: 70px;
  border: 3px solid #ff69b4;
  box-shadow: 0 0 25px #ff1493;
  object-fit: cover;
  object-position: center;
  flex-shrink: 0;
}

.detail-uploader-text {
  display: flex;
  flex-direction: column;
  color: white;
}

.uploader-name {
  font-size: 1.6rem;
  color: #ffaae6;
  font-weight: bold;
  text-shadow: 0 0 12px #ff69b4;
  white-space: nowrap;
}

.upload-time {
  font-size: 1.1rem;
  color: #aaa;
  margin-top: 6px;
}
.comment-like-area {
  margin-top: 12px;
  text-align: right;
}

.comment-like-count {
  font-size: 1.2rem;
  color: #ff69b4;
  text-shadow: 0 0 10px #ff69b4;
  transition: all 0.6s;
  cursor: pointer;
}

.comment-like-count:hover:not(.eternal-liked) {
  text-shadow: 0 0 25px #ff69b4, 0 0 40px #ff1493;
  transform: scale(1.2);
}

.comment-like-count.eternal-liked {
  color: #ff1493;
  text-shadow: 0 0 25px #ff1493, 0 0 50px #ff69b4;
  animation: eternal-glow 2s infinite alternate;
  cursor: default;
}
.resize-handle {
  height: 8px;
  background: rgba(255, 105, 180, 0.3);
  cursor: ns-resize;
  margin: 12px 0;
  border-radius: 4px;
  transition: background 0.2s;
}

.resize-handle:hover,
.resize-handle:active {
  background: #ff69b4;
}

/* 描述区：默认高度 + 可滚动 */
.detail-desc {
  font-size: 1.25rem;
  line-height: 1.8;
  color: #cceeff;
  margin-bottom: 0;
  max-height: none;
  overflow-y: auto;
  overflow-x: hidden;
  word-break: break-word;
  padding-right: 8px;
}

/* 评论区：默认占剩余空间 + 可滚动 */
.comments-scrollable {
  flex: 1; /* 重要：占满剩余 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.comment-list {
  flex: 1;
  overflow-y: auto;
}
/* 预览列表整体：网格布局 + 滚动 */
.preview-list {
  max-height: 60vh;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
  padding: 10px;
}

/* 每个预览项：卡片风格 */
.preview-item {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 15px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 0 15px rgba(255, 105, 180, 0.3);
  transition: transform 0.3s;
}

.preview-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 0 25px rgba(255, 105, 180, 0.5);
}

/* 预览容器：固定大小 + 居中 + 溢出隐藏 */
.thumb-wrapper {
  width: 100%;
  height: 220px; /* 统一高度，可调 180px ~ 280px */
  background: rgba(0, 0, 0, 0.6);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* 图片/视频统一限制大小 + 保持比例 */
.thumb {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* 保持比例，不裁剪 */
  border-radius: 8px;
}

/* 音频特殊处理（更小点） */
.thumb-audio {
  width: 90%;
  max-height: 100px;
}

/* 占位符（非媒体文件） */
.thumb-placeholder {
  color: #00ffff;
  font-size: 1.2rem;
  text-align: center;
  padding: 20px;
}

/* 输入框美化 */
.title-input,
.desc-input {
  width: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #00ffff88;
  color: #00ffff;
  border-radius: 10px;
  font-size: 1rem;
}

.desc-input {
  height: 80px;
  resize: vertical;
}

/* 滚动条美化（可选，但更好看） */
.preview-list::-webkit-scrollbar {
  width: 8px;
}

.preview-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
}

.preview-list::-webkit-scrollbar-thumb {
  background: rgba(255, 105, 180, 0.6);
  border-radius: 10px;
}

.preview-list::-webkit-scrollbar-thumb:hover {
  background: #ff69b4;
}
</style>