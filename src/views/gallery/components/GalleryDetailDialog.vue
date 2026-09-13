<template>
  <div v-if="item" class="modal-overlay" @click="$emit('close')">
    <div class="detail-modal" @click.stop>
      <button @click="$emit('close')" class="close-btn">×</button>
      <div class="detail-left">
        <img v-if="item.type === 'photo' || item.type === 'gif'" :src="item.src" class="detail-media" />
        <video v-else-if="item.type === 'video'" :src="item.src" controls autoplay loop class="detail-media"></video>
        <audio v-else-if="item.type === 'music'" :src="item.src" controls class="detail-audio"></audio>
      </div>

      <div class="detail-right">
        <div class="detail-info-fixed">
          <h2>{{ item.title }}</h2>
          <p ref="description" class="detail-desc">{{ item.description || "无描述" }}</p>
          <div class="detail-meta" @click.stop="$emit('show-user', item.userId || item.uploaderId, item.uploaderUsername)">
            <img :src="item.uploaderAvatar || '/default-avatar.gif'" alt="上传者头像" class="detail-uploader-avatar" />
            <span class="uploader-name">@{{ item.uploaderUsername || "神秘人" }}</span>
            <div class="meta-info"><span>{{ formatDate(item.createdAt) }}</span><span class="click-tip"> 点击头像查看用户</span></div>
          </div>
          <div class="detail-actions">
            <button @click.stop="$emit('toggle-like', item)" class="like-btn" :class="{ liked: item.isLiked }">❤️ {{ item.likes }}</button>
            <template v-if="canManage(item)">
              <button class="detail-action-btn detail-edit-btn" @click.stop="$emit('edit', item)">编辑</button>
              <button class="detail-action-btn detail-delete-btn" @click.stop="$emit('delete', item)">删除</button>
            </template>
          </div>
        </div>

        <!-- 桌面用鼠标拖拽，触屏用触摸拖拽，两者上下限一致 -->
        <div
          class="resize-handle"
          @mousedown="$emit('resize-start', $event, description)"
          @touchstart="startTouchResize"
        ><span class="resize-tip">拖动调整上下高度</span></div>
        <div class="comments-scrollable">
          <h3>Comments({{ comments.length }})</h3>
          <div class="comment-input">
            <textarea :value="comment" placeholder="Say something..." rows="3" @input="$emit('update:comment', $event.target.value)"></textarea>
            <button @click="$emit('post-comment')" :disabled="!comment.trim()" class="crt-mini-btn send-btn">发送</button>
          </div>
          <div class="comment-list">
            <article v-for="currentComment in comments" :key="currentComment.id" class="comment-item">
              <div class="comment-header"><strong>@{{ currentComment.username }}</strong><span class="comment-time">{{ formatShortDate(currentComment.createdAt) }}</span></div>
              <p class="comment-content">{{ currentComment.content }}</p>
              <div class="comment-footer">
                <div class="comment-like-area" @click.stop="$emit('like-comment', currentComment)"><span class="comment-like-count" :class="{ 'eternal-liked': currentComment.isLiked }">❤️ {{ currentComment.likes || currentComment.likeCount || 0 }}</span></div>
                <button
                  v-if="canManageComment(currentComment)"
                  class="comment-delete-btn"
                  @click.stop="$emit('delete-comment', currentComment)"
                >删除</button>
              </div>
            </article>
            <div v-if="comments.length === 0" class="no-comment">There's no comment.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue";

// canManage / canManageComment 由页面注入：编辑、删除入口只在作者本人或管理员处显示，
// 组件自身不判断身份，保持纯展示。
defineProps({
  item: { type: Object, default: null },
  comments: { type: Array, default: () => [] },
  comment: { type: String, default: "" },
  formatDate: { type: Function, required: true },
  formatShortDate: { type: Function, required: true },
  canManage: { type: Function, default: () => () => false },
  canManageComment: { type: Function, default: () => () => false },
});

defineEmits(["close", "show-user", "toggle-like", "resize-start", "update:comment", "post-comment", "like-comment", "edit", "delete", "delete-comment"]);
const description = ref(null);

// useGalleryPage 的 drag 逻辑只监听 mousemove / mouseup，触屏设备不会触发。
// 这里补一条触摸路径，调整方式与桌面端保持一致：最小 60px，最大不超过视口高度的一半。
let detachTouchListeners = null;

const stopTouchResize = () => {
  if (detachTouchListeners) {
    detachTouchListeners();
    detachTouchListeners = null;
  }
};

const startTouchResize = (event) => {
  const target = description.value;
  const touch = event.touches?.[0];
  if (!target || !touch) return;

  const startY = touch.clientY;
  const startHeight = target.getBoundingClientRect().height;

  const onTouchMove = (moveEvent) => {
    const current = moveEvent.touches?.[0];
    if (!current) return;
    moveEvent.preventDefault();
    const height = Math.max(
      60,
      Math.min(window.innerHeight * 0.5, startHeight + current.clientY - startY),
    );
    target.style.height = `${height}px`;
  };

  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", stopTouchResize);
  document.addEventListener("touchcancel", stopTouchResize);

  detachTouchListeners = () => {
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", stopTouchResize);
    document.removeEventListener("touchcancel", stopTouchResize);
  };
};

onBeforeUnmount(stopTouchResize);
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.96); backdrop-filter: blur(15px); }
.detail-modal { position: relative; display: flex; width: 96%; max-width: 1600px; height: 92vh; overflow: hidden; background: transparent; border-radius: 35px; box-shadow: 0 0 100px rgba(0, 255, 255, 0.4); }
.close-btn { position: absolute; top: 20px; right: 30px; z-index: 10; width: 50px; height: 50px; color: #ff69b4; font-size: 2rem; font-weight: bold; background: rgba(255, 105, 180, 0.2); border: 2px solid #ff69b4; border-radius: 50%; cursor: pointer; }
.detail-left { display: flex; flex: 0 0 70%; align-items: center; justify-content: center; height: 100%; background: #000; }
.detail-media { max-width: 100%; max-height: 100%; object-fit: contain; }
.detail-audio { width: 90%; max-width: 1000px; }
.detail-right { display: flex; flex: 0 0 30%; flex-direction: column; height: 100%; padding: 25px 20px; overflow: auto; box-sizing: border-box; background: rgba(0, 0, 20, 0.98); }
.detail-info-fixed { flex: 0 0 auto; overflow-y: auto; }
.detail-info-fixed h2 { margin-bottom: 12px; color: #ff69b4; font-size: 2.1rem; text-shadow: 0 0 15px #ff00ff; word-break: break-word; }
.detail-desc { min-height: 3.8em; height: 6.8em; padding-right: 8px; overflow-y: auto; color: #cceeff; font-size: 1.25rem; line-height: 1.7; word-break: break-word; }
.detail-meta { cursor: pointer; }
.detail-uploader-avatar { width: 70px; height: 70px; margin-right: 12px; object-fit: cover; border: 3px solid #ff69b4; box-shadow: 0 0 25px #ff1493; }
.uploader-name { color: #ffaae6; font-size: 1.6rem; font-weight: bold; }
.meta-info { margin-top: 6px; color: #aaa; }
.detail-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.like-btn { padding: 14px 35px; color: #ff69b4; font-size: 1.4rem; background: rgba(255, 105, 180, 0.3); border: 2px solid #ff69b4; border-radius: 40px; cursor: pointer; }
.liked { text-shadow: 0 0 40px #ff1493; }
.detail-action-btn { min-height: 44px; padding: 10px 24px; font-size: 1rem; border-radius: 40px; cursor: pointer; }
.edit-btn { color: #00ffff; background: rgba(0, 255, 255, 0.15); border: 2px solid #00ffff; }
.delete-btn { color: #ff69b4; background: rgba(255, 105, 180, 0.2); border: 2px solid #ff69b4; }
.resize-handle { display: flex; align-items: center; justify-content: center; height: 8px; margin: 12px 0; background: rgba(255, 105, 180, 0.3); border-radius: 4px; cursor: ns-resize; user-select: none; }
.comments-scrollable { display: flex; flex: 1; flex-direction: column; min-height: 200px; overflow: hidden; }
.comment-input { display: flex; gap: 12px; margin-bottom: 20px; }
.comment-input textarea { flex: 1; padding: 16px; color: #00ffff; background: rgba(0, 0, 0, 0.6); border: 1px solid #00ffff88; border-radius: 15px; resize: vertical; }
.send-btn { align-self: flex-end; }
.comment-list { flex: 1; padding-right: 8px; overflow-y: auto; }
.comment-item { padding: 18px; margin-bottom: 18px; background: rgba(255, 255, 255, 0.05); border-radius: 15px; }
.comment-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #ff69b4; }
.comment-content { color: #cceeff; line-height: 1.6; }
.comment-footer { display: flex; align-items: center; justify-content: flex-end; gap: 16px; margin-top: 12px; }
.comment-like-area { text-align: right; }
.comment-delete-btn { min-height: 32px; padding: 4px 14px; color: #ff69b4; font-size: 0.9rem; background: rgba(255, 105, 180, 0.2); border: 1px solid #ff69b4; border-radius: 20px; cursor: pointer; }
.comment-like-count { color: #ff69b4; cursor: pointer; }
.eternal-liked { color: #ff1493; cursor: default; }
.no-comment { padding: 60px 20px; color: #888; text-align: center; }
@media (max-width: 1100px) { .detail-modal { flex-direction: column; height: 96vh; } .detail-left { flex: 0 0 55%; height: 55%; } .detail-right { flex: 1; height: 45%; } }

/* ==== 窄屏适配 ====
   <=768px：弹窗改为近全屏纵向布局，媒体在上、信息与评论在下；评论区独立滚动，
   中间的信息区不再参与滚动。拖拽条加高到可触摸尺寸，并支持触摸拖动。
   <=480px：进一步压缩媒体区高度与字号。
*/
@media (max-width: 768px) {
  .modal-overlay { padding: 0; }
  .detail-modal { width: 100%; max-width: 100%; height: 100vh; height: 100dvh; max-height: 100vh; border-radius: 0; }
  .close-btn { top: 10px; right: 12px; width: 44px; height: 44px; font-size: 1.6rem; }
  .detail-left { flex: 0 0 42%; height: 42%; }
  .detail-right { flex: 1 1 58%; height: auto; min-height: 0; padding: 14px 12px; overflow: hidden; }
  .detail-info-fixed { flex: 0 0 auto; }
  .detail-info-fixed h2 { margin-bottom: 8px; font-size: 1.45rem; }
  .detail-desc { height: 4.2em; min-height: 2.6em; font-size: 1rem; }
  .detail-uploader-avatar { width: 48px; height: 48px; margin-right: 8px; border-width: 2px; }
  .uploader-name { font-size: 1.1rem; }
  .meta-info { font-size: 0.85rem; }
  .like-btn { min-height: 44px; margin-top: 10px; padding: 10px 24px; font-size: 1.1rem; }
  .resize-handle { height: 22px; margin: 10px 0; touch-action: none; }
  .comments-scrollable { min-height: 0; }
  .comments-scrollable h3 { margin-bottom: 8px; font-size: 1.1rem; }
  .comment-input { flex-direction: column; gap: 8px; margin-bottom: 14px; }
  .comment-input textarea { box-sizing: border-box; min-width: 0; padding: 12px; font-size: 1rem; }
  .send-btn { align-self: stretch; min-height: 44px; }
  .comment-item { padding: 12px; margin-bottom: 12px; }
  .comment-content { font-size: 0.95rem; }
  .no-comment { padding: 30px 12px; }
}

@media (max-width: 480px) {
  .detail-left { flex: 0 0 38%; height: 38%; }
  .detail-right { padding: 10px 10px 12px; }
  .detail-info-fixed h2 { font-size: 1.25rem; }
  .detail-desc { height: 3.4em; min-height: 2.2em; font-size: 0.95rem; }
  .detail-meta .uploader-name { font-size: 1rem; }
  .like-btn { padding: 8px 18px; font-size: 1rem; }
  .comment-like-count { font-size: 0.95rem; }
}
</style>
