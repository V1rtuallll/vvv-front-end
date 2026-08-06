import { onMounted, ref } from "vue";

import { getFullMediaItem, getHomeConfig, getRandomGalleries } from "@/modules/home/api/homeApi";

export function useHomeContent() {
  const mainItem = ref(null);
  const galleryItems = ref([]);
  const latestBlogs = ref([]);
  const pinnedBlog = ref(null);
  const showInfo = ref(false);
  const availableFiles = ref([]);

  const formatShortDate = (date) => date ? new Date(date).toLocaleDateString("zh-CN") : "未知";

  const fetchFullMainItem = async () => {
    if (!mainItem.value?.src || !mainItem.value?.type) return;
    try {
      const res = await getFullMediaItem({ src: mainItem.value.src, type: mainItem.value.type });
      if (res.data) {
        mainItem.value = { ...mainItem.value, ...res.data };
      }
    } catch (err) {
      console.warn("查询完整主展示失败，使用默认", err);
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
        alt: data.main.alt || "V1rtual的月光时刻～",
        uploaderAvatar: data.main.uploaderAvatar || "/default-avatar.gif",
        uploaderUsername: data.main.uploaderUsername || "V1rtual",
        uploadTime: data.main.uploadTime || "刚刚上传",
        random: data.main.random,
      };
      galleryItems.value = data.galleryItems || [];
      latestBlogs.value = data.latestBlogs || [];
      pinnedBlog.value = data.pinnedBlog || null;
      availableFiles.value = data.availableFiles || [];

      const galleryRes = await getRandomGalleries();
      galleryItems.value = (galleryRes.data || []).map((item) => ({ ...item, showInfo: false }));
      await fetchFullMainItem();
    } catch (err) {
      console.error("加载 Home 配置失败", err);
    }
  };

  const changeRandom = async () => {
    if (availableFiles.value.length === 0) {
      window.$vmessage.warning("暂无其他资源可换～");
      return;
    }
    let newSrc;
    do {
      newSrc = availableFiles.value[Math.floor(Math.random() * availableFiles.value.length)];
    } while (newSrc === mainItem.value.src && availableFiles.value.length > 1);
    mainItem.value.src = newSrc;
    await fetchFullMainItem();
  };

  onMounted(loadHome);

  return { mainItem, galleryItems, latestBlogs, pinnedBlog, showInfo, availableFiles, formatShortDate, changeRandom };
}
