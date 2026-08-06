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
          <p ref="description" class="detail-desc">{{ item.description || "无描述～" }}</p>
          <div class="detail-meta" @click.stop="$emit('show-user', item.userId || item.uploaderId, item.uploaderUsername)">
            <img :src="item.uploaderAvatar || '/default-avatar.gif'" alt="上传者头像" class="detail-uploader-avatar" />
            <span class="uploader-name">@{{ item.uploaderUsername || "神秘人" }}</span>
            <div class="meta-info"><span>{{ formatDate(item.createdAt) }}</span><span class="click-tip"> 点击头像查看用户</span></div>
          </div>
          <button @click.stop="$emit('toggle-like', item)" class="like-btn" :class="{ liked: item.isLiked }">❤️ {{ item.likes }}</button>
        </div>

        <div class="resize-handle" @mousedown="$emit('resize-start', $event, description)"><span class="resize-tip">拖拽调整上下高度占比！</span></div>
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
              <div class="comment-like-area" @click.stop="$emit('like-comment', currentComment)"><span class="comment-like-count" :class="{ 'eternal-liked': currentComment.isLiked }">❤️ {{ currentComment.likes || currentComment.likeCount || 0 }}</span></div>
            </article>
            <div v-if="comments.length === 0" class="no-comment">There's no comment.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  item: { type: Object, default: null },
  comments: { type: Array, default: () => [] },
  comment: { type: String, default: "" },
  formatDate: { type: Function, required: true },
  formatShortDate: { type: Function, required: true },
});

defineEmits(["close", "show-user", "toggle-like", "resize-start", "update:comment", "post-comment", "like-comment"]);
const description = ref(null);
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
.like-btn { padding: 14px 35px; margin-top: 14px; color: #ff69b4; font-size: 1.4rem; background: rgba(255, 105, 180, 0.3); border: 2px solid #ff69b4; border-radius: 40px; cursor: pointer; }
.liked { text-shadow: 0 0 40px #ff1493; }
.resize-handle { display: flex; align-items: center; justify-content: center; height: 8px; margin: 12px 0; background: rgba(255, 105, 180, 0.3); border-radius: 4px; cursor: ns-resize; user-select: none; }
.comments-scrollable { display: flex; flex: 1; flex-direction: column; min-height: 200px; overflow: hidden; }
.comment-input { display: flex; gap: 12px; margin-bottom: 20px; }
.comment-input textarea { flex: 1; padding: 16px; color: #00ffff; background: rgba(0, 0, 0, 0.6); border: 1px solid #00ffff88; border-radius: 15px; resize: vertical; }
.send-btn { align-self: flex-end; }
.comment-list { flex: 1; padding-right: 8px; overflow-y: auto; }
.comment-item { padding: 18px; margin-bottom: 18px; background: rgba(255, 255, 255, 0.05); border-radius: 15px; }
.comment-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #ff69b4; }
.comment-content { color: #cceeff; line-height: 1.6; }
.comment-like-area { margin-top: 12px; text-align: right; }
.comment-like-count { color: #ff69b4; cursor: pointer; }
.eternal-liked { color: #ff1493; cursor: default; }
.no-comment { padding: 60px 20px; color: #888; text-align: center; }
@media (max-width: 1100px) { .detail-modal { flex-direction: column; height: 96vh; } .detail-left { flex: 0 0 55%; height: 55%; } .detail-right { flex: 1; height: 45%; } }
</style>
