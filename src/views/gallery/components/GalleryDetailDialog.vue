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
          <h3>Comments({{ totalComments }})</h3>
          <div class="comment-composer">
            <!-- 进入回复态时先亮出回复对象，用户可以随时取消 -->
            <div v-if="replyTo" class="reply-banner">
              <span>回复 @{{ replyTo.username }}</span>
              <button class="reply-cancel" @click="$emit('cancel-reply')">取消</button>
            </div>
            <div class="comment-input">
              <textarea :value="comment" placeholder="Say something..." rows="3" @input="$emit('update:comment', $event.target.value)"></textarea>
              <button @click="$emit('post-comment')" :disabled="!comment.trim()" class="crt-mini-btn send-btn">发送</button>
            </div>
          </div>
          <div class="comment-list">
            <article
              v-for="entry in displayComments"
              :key="entry.id"
              class="comment-item"
              :class="{ 'comment-reply-item': entry.isReply }"
            >
              <div class="comment-header">
                <span class="comment-author">
                  <strong>@{{ entry.username }}</strong>
                  <span v-if="entry.isReply" class="comment-reply-to">回复 @{{ entry.replyToName }}</span>
                </span>
                <span class="comment-time">{{ formatShortDate(entry.createdAt) }}</span>
              </div>
              <p class="comment-content">{{ entry.content }}</p>
              <div class="comment-footer">
                <div class="comment-actions">
                  <button class="comment-reply-btn" @click.stop="$emit('reply', entry)">回复</button>
                  <!-- 回复默认折叠：评论一多，一屏全被回复占满就看不到别的了 -->
                  <button
                    v-if="entry.replies?.length"
                    class="comment-replies-toggle"
                    @click.stop="$emit('toggle-replies', entry.id)"
                  >{{ isExpanded(entry.id) ? "收起回复" : `展开回复 (${entry.replies.length})` }}</button>
                </div>
                <div class="comment-like-area" @click.stop="$emit('like-comment', entry)"><span class="comment-like-count" :class="{ 'eternal-liked': entry.isLiked }">❤️ {{ entry.likes || entry.likeCount || 0 }}</span></div>
                <button
                  v-if="canManageComment(entry)"
                  class="comment-delete-btn"
                  @click.stop="$emit('delete-comment', entry)"
                >删除</button>
              </div>
            </article>
            <div v-if="displayComments.length === 0" class="no-comment">There's no comment.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { useGalleryBgm } from "@/modules/gallery/composables/useGalleryBgm";

// canManage / canManageComment 由页面注入：编辑、删除入口只在作者本人或管理员处显示，
// 组件自身不判断身份，保持纯展示。
const props = defineProps({
  item: { type: Object, default: null },
  /** 已按父子关系排好的评论：顶层评论各自带 replies，层级不在弹窗里算 */
  threads: { type: Array, default: () => [] },
  comment: { type: String, default: "" },
  /** 正在回复的评论；为空表示发的顶层评论 */
  replyTo: { type: Object, default: null },
  /** 展开了回复的根评论 id 集合；展开状态由页面持有 */
  expandedThreads: { type: Object, default: () => new Set() },
  formatDate: { type: Function, required: true },
  formatShortDate: { type: Function, required: true },
  canManage: { type: Function, default: () => () => false },
  canManageComment: { type: Function, default: () => () => false },
});

defineEmits(["close", "show-user", "toggle-like", "resize-start", "update:comment", "post-comment", "like-comment", "edit", "delete", "delete-comment", "reply", "cancel-reply", "toggle-replies"]);
const description = ref(null);

const { play: playBgm, stop: stopBgm } = useGalleryBgm();

// 打开就播、关闭就停。
//
// 用 watch 而不是 onMounted：item 由父组件控制，同一次挂载里会反复变化，
// onMounted 只在第一次打开时生效。immediate 把「父组件已经带着 item 挂上来」
// 这条路径也一并覆盖 —— 弹窗是被 v-if 直接摘挂还是常驻，这里都不用管。
//
// 监听的是 (id, bgmSrc, bgmType) 这一组值，**不是 item 对象本身**：页面保存
// 编辑时是就地改这一条（useGalleryPage 的 applyEditedFields 用 Object.assign），
// 引用不变 —— 按对象比对就永远不触发，详情开着清空背景音乐时界面显示「未设置」
// 而声音继续响到弹窗关闭。
watch(
  () => [props.item?.id, props.item?.bgmSrc, props.item?.bgmType],
  () => {
    const item = props.item;
    // 只给「自己声明了 BGM」的项起隐藏元素。
    //
    // **音乐/视频项不能进这一支**：上面几行就是它们自己的可见播放器，
    // 再起一个隐藏元素就是同一个文件两路解码 —— 视频项两边都 autoplay，
    // 用户听到的是叠音，而且隐藏那个没有控件、停不掉。
    // （这不是 G7 那个场景：给图片挑一段视频当 BGM 时 `bgmSrc` 在、
    // 可见元素是 `<img>`，行为是正确的。）
    //
    // ⚠️ 别把这条判断挪进 `resolveBgm` —— 选择器要靠它对音乐/视频**候选**
    // 返回「它自己的 src」才能取到地址，去掉会直接打坏选曲。
    if (item?.bgmSrc) playBgm(item);
    else stopBgm();
  },
  { immediate: true },
);

const isExpanded = (threadId) => props.expandedThreads.has(String(threadId));

/**
 * 顶层评论与它的回复铺平成一串：回复紧跟在自己的根评论后面，
 * 只有展开的线程才会带上回复。这样只有一套评论模板，不必把整块标记复制两遍。
 */
const displayComments = computed(() =>
  props.threads.flatMap((thread) => [
    { ...thread, isReply: false },
    ...(isExpanded(thread.id)
      ? (thread.replies || []).map((reply) => ({ ...reply, isReply: true }))
      : []),
  ]));

/** 标题里的评论数含折叠中的回复 */
const totalComments = computed(() =>
  props.threads.reduce((sum, thread) => sum + 1 + (thread.replies?.length ?? 0), 0));

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

// 组件被摘掉也要停：父组件用 v-if 关掉弹窗是常见做法，
// 那时 watch 不一定还来得及跑
onBeforeUnmount(() => stopBgm());
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
/* 回复条与输入框属于同一条输入流，所以放进同一个纵向容器 */
.comment-composer { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.comment-input { display: flex; gap: 12px; }
.comment-input textarea { flex: 1; padding: 16px; color: #00ffff; background: rgba(0, 0, 0, 0.6); border: 1px solid #00ffff88; border-radius: 15px; resize: vertical; }
.send-btn { align-self: flex-end; }
.reply-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 14px; color: #ffaae6; font-size: 0.95rem; background: rgba(255, 105, 180, 0.12); border-left: 3px solid #ff69b4; border-radius: 8px; }
.reply-cancel { min-height: 32px; padding: 4px 14px; color: #ff69b4; font-size: 0.85rem; background: transparent; border: 1px solid #ff69b4; border-radius: 20px; cursor: pointer; }
.comment-list { flex: 1; padding-right: 8px; overflow-y: auto; }
.comment-item { padding: 18px; margin-bottom: 18px; background: rgba(255, 255, 255, 0.05); border-radius: 15px; }
/* 回复缩进一格，并用一条竖线连回所属的根评论 */
.comment-reply-item { margin-left: 28px; border-left: 2px solid rgba(255, 105, 180, 0.45); border-radius: 0 15px 15px 0; }
.comment-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #ff69b4; }
.comment-author { display: flex; align-items: center; gap: 10px; }
.comment-reply-to { color: #ffaae6; font-size: 0.85rem; font-weight: normal; }
.comment-content { color: #cceeff; line-height: 1.6; }
.comment-footer { display: flex; align-items: center; justify-content: flex-end; gap: 16px; margin-top: 12px; }
/* 回复与展开靠左，点赞与删除留在右边 */
.comment-actions { display: flex; align-items: center; gap: 12px; margin-right: auto; }
.comment-reply-btn { min-height: 32px; padding: 4px 14px; color: #00ffff; font-size: 0.9rem; background: rgba(0, 255, 255, 0.12); border: 1px solid #00ffff; border-radius: 20px; cursor: pointer; }
.comment-replies-toggle { min-height: 32px; padding: 4px 14px; color: #ffaae6; font-size: 0.9rem; background: rgba(255, 105, 180, 0.12); border: 1px solid #ff69b4; border-radius: 20px; cursor: pointer; }
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
  .comment-composer { gap: 8px; margin-bottom: 14px; }
  .comment-input { flex-direction: column; gap: 8px; }
  .comment-input textarea { box-sizing: border-box; min-width: 0; padding: 12px; font-size: 1rem; }
  .send-btn { align-self: stretch; min-height: 44px; }
  .reply-cancel { min-height: 44px; }
  .comment-reply-btn,
  .comment-replies-toggle { min-height: 44px; }
  .comment-item { padding: 12px; margin-bottom: 12px; }
  .comment-reply-item { margin-left: 14px; }
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
