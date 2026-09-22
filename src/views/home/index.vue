<template>
  <div class="home-wrapper">
    <span class="ht1">Random Memory</span>
    <!-- 大展示：和拼图区同一套卡面（点阵底板 + 近白卡片 + 灰蓝描边），
         只是整块只陈列一条、尺寸放大。主展示没有数据库主键，
         徽章位置改放真实的随机状态位 -->
    <div v-if="mainItem" class="memory-plate">
      <div class="main-showcase">
        <div class="memory-head">
          <span class="memory-head-title">{{
            mainItem.title || "V1rtual时刻"
          }}</span>
          <span class="memory-head-badge">{{
            mainItem.random ? "RANDOM" : "FIXED"
          }}</span>
        </div>
        <!-- 视频/图片 -->
        <div ref="mediaBox" class="showcase-media-wrapper">
          <!--
            **带声音自动播放**（按用户要求，不静音）。
            ⚠️ 已知代价，两条都是真实存在的：
              1. 用户在本站交互之前，浏览器会拦下这次 autoplay，首屏是静止的；
                 一旦用户点过任何东西，之后每次挂载（进出首页、换随机项、开新标签页）
                 它都会真的满音量起播。
              2. 侧栏播放器是独立的一路音频、不会让位，两路会同时响。
            真要根治第 2 条，得像详情弹窗的 BGM 那样，在起播时调
            pauseForBgm() 把侧栏按下去 —— 那是另一处改动，没做。
          -->
          <video
            v-if="mainItem.type === 'video'"
            ref="showcaseEl"
            :src="mainItem.src"
            autoplay
            loop
            playsinline
            controls
            class="showcase-media"
            @loadedmetadata="onMediaReady"
            @play="videoPlaying = true"
            @pause="videoPlaying = false"
          />
          <img
            v-else
            :src="mainItem.src"
            :alt="mainItem.alt"
            class="showcase-media"
            @load="onMediaReady"
          />
        </div>

        <!-- 信息栏：常显，不再依赖 hover。左上传信息 + 右标题描述，连同「换一个」都排在一行 -->
        <div class="showcase-info-bottom">
          <div class="info-container">
            <!-- 左半边：上传人信息 + 换一个按钮。
                 这里是「服务端说了什么就显示什么」：配置里的 src 定位不到素材时
                 （兜底 URL / 已删除）服务端不下发上传者，只显示占位符。
                 占位符读起来就是占位符，不能换成具体的人名和时间 —— 那是替服务端断言事实 -->
            <div class="uploader-left">
              <img
                :src="mainItem.uploaderAvatar || '/default-avatar.gif'"
                alt="上传者头像"
                class="uploader-avatar"
              />
              <div class="uploader-text">
                <span class="uploader-name"
                  >@{{ mainItem.uploaderUsername || "神秘人" }}</span
                >
                <span class="upload-time">{{
                  mainItem.uploadTime || "未知时间"
                }}</span>
              </div>
              <!-- 动作区：换一个 / 播停 / 进详情 -->
              <div class="memory-actions">
                <!-- 判断更宽松，只要 random 为真值就显示 -->
                <button
                  v-if="mainItem.random"
                  @click="onChangeRandom"
                  class="change-btn"
                >
                  换一个
                </button>

                <!-- 一个开关管两路声音：视频原声与这条作品的背景音乐。
                     曲子的媒体元素是脱离 DOM 建的，没有任何原生控件，
                     视频虽然有原生 controls，这里也留一个顺手的入口。
                     图标与判据都只看「这一块有没有在响」，不区分是哪一路 -->
                <button
                  v-if="mainItem.type === 'video' || activeBgm"
                  class="icon-btn"
                  :aria-label="playing ? '暂停' : '播放'"
                  @click="togglePlayback"
                >
                  <span
                    class="ui-icon"
                    :class="playing ? 'ui-icon-pause' : 'ui-icon-play'"
                  ></span>
                </button>

                <!-- 只在「这条资源确实在画廊里」时才给入口。
                     类型表里有些素材从没进过画廊，点进去也打不开详情 -->
                <button
                  v-if="detailQuery && mainItem.inGallery"
                  class="change-btn detail-btn"
                  @click="goDetail"
                >
                  详情
                </button>
              </div>
            </div>

            <!-- 右半边：标题 + 描述（多行完整显示） -->
            <div class="content-right">
              <h2 class="showcase-title">
                {{ mainItem.title || "V1rtual时刻" }}
              </h2>
              <p class="showcase-desc">
                {{ mainItem.description || mainItem.alt || "欢迎" }}
              </p>
            </div>
          </div>
        </div>

        <!-- 底部标签条 -->
        <div class="memory-foot">
          {{ (mainItem.type || "photo").toUpperCase() }}
        </div>
      </div>
    </div>
    <span class="ht2">Random Gallery</span>
    <!-- 2. 随机拼图区，整体铺在一块点阵底板上 -->
    <div class="gallery-plate">
      <div class="gallery-masonry">
        <div
          v-for="(item, index) in galleryItems"
          :key="index"
          class="masonry-item"
          role="button"
          tabindex="0"
          @click="openItemDetail(item)"
          @keydown.enter="openItemDetail(item)"
          @keydown.space.prevent="openItemDetail(item)"
        >
          <!-- 顶部条：左边标题、右边编号。版式取自 00 年代设计门户的卡片。
               编号用后端下发的真实主键，不用列表序号 —— 随机列表每次重排，
               序号会跟着乱跳，对不回条目 -->
          <div class="masonry-head">
            <span class="masonry-head-title">{{ item.title || "未命名" }}</span>
            <span class="masonry-head-id"
              >ID #{{ String(item.id).padStart(3, "0") }}</span
            >
          </div>

          <!-- 媒体 -->
          <video
            v-if="item.type === 'video'"
            :src="item.src"
            autoplay
            loop
            muted
            playsinline
            class="masonry-media"
          />
          <img
            v-else
            :src="item.src"
            :alt="item.title || '未知'"
            class="masonry-media"
          />

          <!-- 信息栏。以前是悬浮才出现，现在常显 -->
          <div class="gallery-info-bottom">
            <div class="info-container">
              <div class="uploader-left">
                <img
                  :src="item.uploaderAvatar || '/default-avatar.gif'"
                  alt="上传者头像"
                  class="uploader-avatar small"
                />
                <div class="uploader-text">
                  <!-- 用户名与画廊、博客同一套占位符：服务端没给就是未知，不填具体人名 -->
                  <span class="uploader-name"
                    >@{{ item.uploaderUsername || "神秘人" }}</span
                  >
                  <span class="upload-time">{{
                    formatShortDate(item.createdAt)
                  }}</span>
                </div>
              </div>
              <div class="content-right">
                <h2 class="showcase-title">{{ item.title || "未知" }}</h2>
                <p class="showcase-desc">
                  {{ item.description || "暂无描述" }}
                </p>
              </div>
            </div>
          </div>

          <!-- 底部标签条 -->
          <div class="masonry-foot">
            {{ (item.type || "photo").toUpperCase() }}
          </div>
        </div>

        <div v-if="galleryItems.length === 0" class="empty-masonry">
          暂无Gallery
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { useHomeContent } from "@/modules/home/composables/useHomeContent";
import { useGalleryBgm } from "@/modules/gallery/composables/useGalleryBgm";
import {
  registerMediaElement,
  unregisterMediaElement,
} from "@/modules/player/composables/mediaVolume";

const { mainItem, galleryItems, formatShortDate, changeRandom } = useHomeContent();
const router = useRouter();

/* ---- 高度过渡 ---- */
const mediaBox = ref(null);
/** 换素材前记下的旧高度，作为过渡起点；null 表示这次不需要过渡 */
let pendingFromHeight = null;

/**
 * 换一个：先记下当前高度，再换素材。
 * 换完由 onMediaReady 把高度从旧值平滑推过去。
 */
const onChangeRandom = () => {
  pendingFromHeight = mediaBox.value?.offsetHeight ?? null;
  changeRandom();
};

/**
 * 新素材就位后把容器高度从旧值过渡到新值。
 *
 * `height: auto` 之间是不可过渡的，所以先把旧高度写成具体像素，
 * 下一帧再写新高度 —— 两端都是具体值，transition 才会真正走动画。
 * 过渡结束把行内 height 清掉，交还给自然高度，不长期钉死。
 */
const onMediaReady = () => {
  const el = mediaBox.value;
  if (!el) return;
  const to = el.offsetHeight;        // 此刻已是新素材撑开后的自然高度
  const from = pendingFromHeight;
  pendingFromHeight = null;
  if (from == null || from === to) return;
  el.style.transition = "none";
  el.style.height = `${from}px`;
  requestAnimationFrame(() => {
    el.style.transition = "";
    el.style.height = `${to}px`;
    el.addEventListener("transitionend", () => { el.style.height = ""; }, { once: true });
  });
};

/* ---- 视频播放/暂停 ---- */
// 状态跟着 video 自己的 play/pause 事件走，不自己维护
const videoPlaying = ref(false);

/* ---- 背景音乐 ---- */
// 复用详情弹窗那一套：同一个 composable，同一时刻全站只有一路出声
const {
  activeBgm,
  paused,
  play: playBgm,
  stop: stopBgm,
  pause: pauseBgm,
  resume: resumeBgm,
} = useGalleryBgm();

/**
 * 换了主展示就换曲，没有可播的就停 —— 与详情弹窗同一套规则。
 *
 * ⚠️ 只给「自己声明了 bgmSrc」的项起隐藏音频元素。**视频/音乐项不能进这一支**：
 * resolveBgm 对它们返回的是它们自己的 src，而它们已经有可见播放器了，
 * 再起一个隐藏元素就是同一个文件两路解码、两路出声，且隐藏那路没有控件、停不掉。
 *
 * ⚠️ 现状：主展示读的是类型表（photo/gif/video/music），
 * 而 bgm 列只存在于 gallery 表 —— 类型表一个 bgm 字段都没有。
 * 所以这一支目前**不会真的起播**，等后端把 gallery 的 bgm 按 src 关联进来才有数据。
 */
watch(
  () => [mainItem.value?.src, mainItem.value?.bgmSrc, mainItem.value?.bgmType],
  () => {
    const item = mainItem.value;
    if (item?.bgmSrc) playBgm(item);
    else stopBgm();
  },
  { immediate: true },
);

/**
 * 主展示这一块有没有在出声：视频原声与这条作品的背景音乐，任一路在响就算。
 *
 * 为什么合成一个判据：两者对用户是同一件事 ——「这条展示正在响」。
 * 分成两个开关时，想静音得先判断声音是从哪一路来的，而画面上这两路是同时响的。
 */
const playing = computed(() => videoPlaying.value || (activeBgm.value !== null && !paused.value));

/**
 * 主展示的视频元素。用 ref 而不是查文档：`.showcase-media` 图片那边也在用，
 * 而这里要的就是这一个元素，查全局还会连带依赖「组件挂到了文档上」。
 */
const showcaseEl = ref(null);

/**
 * 视频原声也跟全站音量走：与侧栏播放器、画廊的视频和 BGM 读同一个数字。
 *
 * 用 watch 而不是 onMounted：主展示的类型要等接口回来才知道，挂载时它往往还
 * 不是视频，而 `v-if` 换成视频那一刻不会有第二次 onMounted。
 * `flush: "post"` 是必须的 —— 默认的 pre 跑在补丁之前，那时 ref 还是旧元素。
 *
 * 换回图片、离开首页都要注销：登记表是模块级的、持有的是元素本身，
 * 交不回去的元素不会被回收，滑块每动一次还会去写它。
 */
watch(showcaseEl, (el, previous) => {
  unregisterMediaElement(previous);
  registerMediaElement(el);
}, { flush: "post" });

onBeforeUnmount(() => unregisterMediaElement(showcaseEl.value));

/**
 * 一个开关管两路声音：视频原声与这条作品的背景音乐。
 *
 * 合并的理由见 `playing` 上面那段。换 item 时按 bgmSrc 起播/停播的那段 watch
 * 不变，这里只管手动暂停/继续 —— 哪个开关在响就停哪个，两路都是。
 */
const togglePlayback = () => {
  const video = showcaseEl.value;
  if (playing.value) {
    if (video) video.pause();
    pauseBgm();
  } else {
    if (video) video.play().catch(() => {});
    resumeBgm();
  }
};

/* ---- 进详情 ---- */
/**
 * 主展示没有数据库主键（/home/random 只回 src/title/desc/alt/uploader*），
 * 所以详情页的跳转只能用 src 定位 —— gallery 页的深链因此同时认 id 和 src。
 *
 * 是否渲染按钮还要看 mainItem.inGallery：类型表里有些素材从没进过画廊，
 * 对它们来说这个链接是死的。
 */
const detailQuery = computed(() => (mainItem.value?.src ? { src: mainItem.value.src } : null));

const goDetail = () => {
  if (!detailQuery.value) return;
  router.push({ path: "/gallery", query: detailQuery.value });
};

/**
 * 拼图卡进详情：卡片带后端下发的真实主键，走侧栏「最新画廊」同一条 /gallery?id=N 深链。
 * 主展示那条没有主键、只能退到 src 定位，两者不共用。
 */
const openItemDetail = (item) => {
  router.push({ path: "/gallery", query: { id: item.id } });
};
</script>
<style src="./index.css" scoped></style>