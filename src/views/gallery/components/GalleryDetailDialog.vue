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
            <button @click.stop="$emit('toggle-like', item)" class="like-btn" :class="{ liked: item.isLiked }"><span class="ui-icon ui-icon-heart"></span> {{ item.likes }}</button>
            <template v-if="canManage(item)">
              <button class="detail-action-btn detail-edit-btn" @click.stop="$emit('edit', item)">编辑</button>
              <button class="detail-action-btn detail-delete-btn" @click.stop="$emit('delete', item)">删除</button>
            </template>
          </div>

          <!-- 背景音乐。曲子的媒体元素是用 document.createElement 建的、
               **从不插进 DOM**，所以既没有原生控件也没有现成的曲名可显示，
               开关和名字都得自己画。没有 BGM 的项也保留这一行，显示占位文案 -->
          <div class="bgm-row">
            <button
              v-if="activeBgm"
              class="bgm-toggle"
              :class="{ 'is-paused': paused }"
              @click.stop="toggleBgm"
            >
              <span
                class="ui-icon"
                :class="paused ? 'ui-icon-play' : 'ui-icon-pause'"
              ></span>
              {{ paused ? "播放" : "暂停" }}
            </button>
            <span class="bgm-name">{{ bgmName }}</span>
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
            <!-- 评论取不到时说明情况：空列表既可能是「确实没有评论」，也可能是这次没取到，
                 两者不能共用一句「没有评论」。上次取到的评论仍留在下面，不因刷新失败清掉 -->
            <div v-if="commentsLoadFailed" class="comment-error">评论加载失败</div>
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
                <div class="comment-like-area" @click.stop="$emit('like-comment', entry)"><span class="comment-like-count" :class="{ 'eternal-liked': entry.isLiked }"><span class="ui-icon ui-icon-heart"></span> {{ entry.likes || entry.likeCount || 0 }}</span></div>
                <button
                  v-if="canManageComment(entry)"
                  class="comment-delete-btn"
                  @click.stop="$emit('delete-comment', entry)"
                >删除</button>
              </div>
            </article>
            <div v-if="!commentsLoadFailed && displayComments.length === 0" class="no-comment">There's no comment.</div>
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

const { activeBgm, paused, play: playBgm, stop: stopBgm, toggle: toggleBgm } = useGalleryBgm();

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
 * OSS 上存的文件名是机器生成的标识：UUID、纯十六进制串或时间戳。
 * 这种名字原样显示对用户没有信息量，一律换中性占位。
 */
const isMachineName = (name) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)
  || /^[0-9a-f]{16,}$/i.test(name)
  || /^\d+$/.test(name);

/**
 * 当前背景音乐的曲名。
 *
 * 优先用后端算好的 `bgmTitle`（GalleryItemVO 上一直有这个字段，只是前端从没读过）；
 * 取不到时退回从地址末段还原文件名 —— 要去掉扩展名。
 *
 * ⚠️ 退路只对「文件名本身可读」的曲子管用。OSS 上存的是 UUID 文件名
 * （如 a18778e1-f6a9-....mp3），退回来读不出任何东西，此时显示占位而不是那串标识。
 */
const bgmName = computed(() => {
  if (!activeBgm.value) return "无背景音乐";
  if (props.item?.bgmTitle) return props.item.bgmTitle;
  const file = decodeURIComponent(activeBgm.value.src.split("/").pop() || "");
  const name = file.replace(/\.[^.]+$/, "");
  return !name || isMachineName(name) ? "背景音乐" : name;
});

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

/** 评论取不到。标记由页面放在 currentItem 上带进来，弹窗不自己判断请求结果 */
const commentsLoadFailed = computed(() => Boolean(props.item?.commentsLoadFailed));

/**
 * 标题里的评论数含折叠中的回复。
 * 评论取不到时列表本身就不可信，退回这一条自带的计数：顶着一个 0 去说「评论加载失败」，
 * 等于把「没取到」说成「没有」，也会和卡片上的评论数对不上。
 */
const totalComments = computed(() => {
  if (commentsLoadFailed.value) return props.item?.commentCount ?? 0;
  return props.threads.reduce((sum, thread) => sum + 1 + (thread.replies?.length ?? 0), 0);
});

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
.modal-overlay { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; background: rgba(1, 40, 70, 0.55); backdrop-filter: blur(6px); }
.detail-modal { position: relative; display: flex; width: 96%; max-width: 1600px; height: 92vh; overflow: hidden; background: #ffffff; border: 1px solid #b9c4cc; }
.close-btn { position: absolute; top: 20px; right: 30px; z-index: 10; width: 44px; height: 44px; color: #54636f; font-size: 1.6rem; font-weight: bold; background: #ffffff; border: 1px solid #b9c4cc; border-radius: 4px; cursor: pointer; }
.close-btn:hover { color: #c2185b; border-color: #ff69b4; }
.detail-left { display: flex; flex: 0 0 70%; align-items: center; justify-content: center; height: 100%; background: #e9f2f9; }
.detail-media { max-width: 100%; max-height: 100%; object-fit: contain; }
.detail-audio { width: 90%; max-width: 1000px; }
.detail-right { display: flex; flex: 0 0 30%; flex-direction: column; height: 100%; padding: 25px 20px; overflow: auto; box-sizing: border-box; background: #ffffff; border-left: 1px solid #b9c4cc; }
.detail-info-fixed { flex: 0 0 auto; overflow-y: auto; }
.detail-info-fixed h2 { margin-bottom: 12px; color: #2f3b47; font-size: 1.9rem; word-break: break-word; }
.detail-desc { min-height: 3.8em; height: 6.8em; padding-right: 8px; overflow-y: auto; color: #54636f; font-size: 1.15rem; line-height: 1.7; word-break: break-word; }
.detail-meta { cursor: pointer; }
.detail-uploader-avatar { width: 70px; height: 70px; margin-right: 12px; object-fit: cover; border: 2px solid #ff69b4; }
.uploader-name { color: #c2185b; font-size: 1.5rem; font-weight: bold; }
.meta-info { margin-top: 6px; color: #7b8fa1; }
.detail-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.bgm-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.bgm-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #000000; font-size: 0.9rem; }
.like-btn { color: #c2185b; border: 1px solid #ff69b4; }
/* 点赞 / 编辑 / 删除三个按钮等大、都不带底色，只靠描边和字色区分。
   写在一起是为了它们永远同高同宽 —— 分开写迟早会漂 */
.like-btn,
.detail-action-btn {
  box-sizing: border-box;
  min-width: 96px;
  min-height: 44px;
  padding: 10px 20px;
  font-size: 1rem;
  background: transparent;
  border-radius: 0;
  cursor: pointer;
}

/* ⚠️ 必须写成 .like-btn.liked 这种双类（优先级 0,2,0）。
   写成单类 .liked（0,1,0）会输给上面那条共享规则里的 background: transparent ——
   同优先级下后者在文件里更靠后，于是点赞后底色被清掉，
   而 color 还是白的，白字白底直接看不见 */
.like-btn.liked,
.like-btn:hover {
  color: #ffffff;
  background: #ff69b4;
}
/* 类名与模板一致（detail-edit-btn）。原先是 .edit-btn，选择器对不上，
   这两个按钮的样式从来没生效过，一直渲染成浏览器默认的灰按钮 */
.detail-edit-btn { color: #0277bd; border: 1px solid #0277bd; }
.detail-edit-btn:hover { background: #e9f2f9; }
.detail-delete-btn { color: #c2185b; border: 1px solid #ff69b4; }
.detail-delete-btn:hover { color: #ffffff; background: #ff69b4; }
.resize-handle { display: flex; align-items: center; justify-content: center; height: 8px; margin: 12px 0; background: #dbeaf5; border-radius: 4px; cursor: ns-resize; user-select: none; }
.comments-scrollable { display: flex; flex: 1; flex-direction: column; min-height: 200px; overflow: hidden; }
/* 回复条与输入框属于同一条输入流，所以放进同一个纵向容器 */
.comment-composer { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.comment-input { display: flex; gap: 12px; }
.comment-input textarea { flex: 1; padding: 16px; color: #2f3b47; background: #ffffff; border: 1px solid #b9c4cc; border-radius: 4px; resize: vertical; }
.comment-input textarea:focus { outline: none; border-color: #0277bd; box-shadow: 0 0 0 3px rgba(2, 119, 189, 0.18); }
.send-btn { align-self: flex-end; }
.reply-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 14px; color: #c2185b; font-size: 0.95rem; background: #e9f2f9; border-left: 3px solid #ff69b4; border-radius: 4px; }
.reply-cancel { min-height: 32px; padding: 4px 14px; color: #c2185b; font-size: 0.85rem; background: #ffffff; border: 1px solid #ff69b4; border-radius: 4px; cursor: pointer; }
.comment-list { flex: 1; padding-right: 8px; overflow-y: auto; }
.comment-item { padding: 18px; margin-bottom: 18px; background: #e9f2f9; border: 1px solid #b9c4cc; border-radius: 4px; }
/* 回复缩进一格，并用一条竖线连回所属的根评论 */
.comment-reply-item { margin-left: 28px; border-left: 2px solid #b9c4cc; border-radius: 0 4px 4px 0; }
.comment-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #5a5a78; }
.comment-author { display: flex; align-items: center; gap: 10px; }
.comment-reply-to { color: #c2185b; font-size: 0.85rem; font-weight: normal; }
.comment-content { color: #2f3b47; line-height: 1.6; }
.comment-footer { display: flex; align-items: center; justify-content: flex-end; gap: 16px; margin-top: 12px; }
/* 回复与展开靠左，点赞与删除留在右边 */
.comment-actions { display: flex; align-items: center; gap: 12px; margin-right: auto; }
.comment-reply-btn { min-height: 32px; padding: 4px 14px; color: #0277bd; font-size: 0.9rem; background: #ffffff; border: 1px solid #0277bd; border-radius: 4px; cursor: pointer; }
.comment-replies-toggle { min-height: 32px; padding: 4px 14px; color: #c2185b; font-size: 0.9rem; background: #ffffff; border: 1px solid #ff69b4; border-radius: 4px; cursor: pointer; }
.comment-like-area { text-align: right; }
.comment-delete-btn { min-height: 32px; padding: 4px 14px; color: #c2185b; font-size: 0.9rem; background: #ffffff; border: 1px solid #ff69b4; border-radius: 4px; cursor: pointer; }
.comment-like-count { color: #c2185b; cursor: pointer; }
.eternal-liked { color: #c2185b; cursor: default; }
.no-comment { padding: 60px 20px; color: #54636f; text-align: center; }
/* 评论取不到时的说明，与「确实没有评论」区分开：带边框的块，看起来是列表里的一条状态 */
.comment-error { padding: 16px; margin-bottom: 18px; color: #2f3b47; text-align: center; background: #e9f2f9; border: 1px solid #b9c4cc; border-radius: 4px; }
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
  /* 窄屏把右栏整体改成滚动容器：信息区（标题/描述/按钮/BGM）在桌面是固定不滚的，
     手机上内容一多就被 overflow: hidden 直接裁掉，且没有任何办法滚到下面 */
  .detail-right { flex: 1 1 58%; height: auto; min-height: 0; padding: 14px 12px; overflow-y: auto; }
  .comments-scrollable { overflow: visible; }
  .comment-list { overflow: visible; }
  .detail-info-fixed { flex: 0 0 auto; }
  .detail-info-fixed h2 { margin-bottom: 8px; font-size: 1.45rem; }
  .detail-desc { height: 4.2em; min-height: 2.6em; font-size: 1rem; }
  .detail-uploader-avatar { width: 48px; height: 48px; margin-right: 8px; border-width: 2px; }
  .uploader-name { font-size: 1.1rem; }
  .meta-info { font-size: 0.85rem; }
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
  .comment-like-count { font-size: 0.95rem; }
}
</style>
