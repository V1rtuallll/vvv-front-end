import { formatShortDate } from "@/utils/DateUtil";
import { onMounted, ref } from "vue";

import {
  getFullMediaItem,
  getHomeConfig,
  getRandomGalleries,
  getRandomMain,
} from "@/modules/home/api/homeApi";

export function useHomeContent() {
  const mainItem = ref(null);
  const galleryItems = ref([]);
  const latestBlogs = ref([]);
  const pinnedBlog = ref(null);
  const showInfo = ref(false);


  // 只在请求成功后合并：失败时不提交新状态，避免新 URL 配旧元数据
  const applyMainItem = (data) => {
    if (!data) return;
    mainItem.value = { ...mainItem.value, ...data };
  };

  const fetchFullMainItem = async () => {
    if (!mainItem.value?.src || !mainItem.value?.type) return;
    try {
      const res = await getFullMediaItem({ src: mainItem.value.src, type: mainItem.value.type });
      applyMainItem(res.data);
    } catch (err) {
      console.warn("查询完整主展示失败，使用默认", err);
    }
  };

  const loadRandomMain = async () => {
    try {
      const res = await getRandomMain({ type: mainItem.value.type });
      applyMainItem(res.data);
    } catch (err) {
      console.warn("随机主资源加载失败，使用配置值", err);
    }
  };

  const loadHome = async () => {
    try {
      const configRes = await getHomeConfig();
      const data = configRes.data;
      mainItem.value = {
        type: data.main.type,
        src: data.main.src,
        title: data.main.title,
        description: data.main.desc,
        alt: data.main.alt || "V1rtual",
        uploaderAvatar: data.main.uploaderAvatar || "/default-avatar.gif",
        uploaderUsername: data.main.uploaderUsername || "V1rtual",
        uploadTime: data.main.uploadTime || "刚刚上传",
        random: data.main.random,
      };
      galleryItems.value = data.galleryItems || [];
      latestBlogs.value = data.latestBlogs || [];
      pinnedBlog.value = data.pinnedBlog || null;

      const galleryRes = await getRandomGalleries();
      galleryItems.value = (galleryRes.data || []).map((item) => ({ ...item, showInfo: false }));

      // 随机模式由后端挑一条（不再把全量 src 下发到前端）
      if (mainItem.value.random) {
        await loadRandomMain();
      } else {
        await fetchFullMainItem();
      }
    } catch (err) {
      console.error("加载 Home 配置失败", err);
    }
  };

  const changeRandom = async () => {
    if (!mainItem.value?.type) return;
    try {
      const res = await getRandomMain({ type: mainItem.value.type, exclude: mainItem.value.src });
      applyMainItem(res.data);
    } catch (err) {
      // 不提交新状态；错误提示由 request.js 统一负责
      console.warn("随机主资源切换失败", err);
    }
  };

  onMounted(loadHome);

  return { mainItem, galleryItems, latestBlogs, pinnedBlog, showInfo, formatShortDate, changeRandom };
}
