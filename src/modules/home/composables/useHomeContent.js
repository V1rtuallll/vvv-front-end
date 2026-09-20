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
  /**
   * 配置里选的类型，可能是 photo / gif / video，也可能是 all（全类型）。
   *
   * ⚠️ 必须与 `mainItem.type` 分开存。全类型模式下后端会在回包里带上**具体**类型，
   * applyMainItem 会把它并进 mainItem.type（前端要靠它决定渲染 img 还是 video）。
   * 如果拿 mainItem.type 去请求下一次，类型就被钉死在那一条的实际类型上了 ——
   * 「换一个」只会在同一类型里打转，全类型形同虚设。
   */
  const pickType = ref(null);
  const galleryItems = ref([]);
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

  /**
   * 主展示要避开的 src 列表，两类合在一起：
   *
   *   1. **下方 Random Gallery 正在展示的那些** —— 不排的话同一条会同时出现在
   *      上下两处。实测过：画廊只有 5 条时下面那栏把它们全列出来，
   *      而主展示的池子又包含它们，60 次抽样撞车 4 次。
   *   2. **当前正在展示的这一条** —— 不排的话「换一个」可能原样返回同一条。
   *      这条是原有行为，改动时差点被覆盖掉。
   *
   * 拼成逗号分隔的一组传给后端：后端按集合比对，只排一条挡不住上面任意一类。
   */
  const mainExclude = () => {
    const srcs = galleryItems.value.map((item) => item.src);
    if (mainItem.value?.src) srcs.push(mainItem.value.src);
    return srcs.join(",");
  };

  const loadRandomMain = async () => {
    try {
      const res = await getRandomMain({ type: pickType.value, exclude: mainExclude() });
      applyMainItem(res.data);
    } catch (err) {
      console.warn("随机主资源加载失败，使用配置值", err);
    }
  };

  const loadHome = async () => {
    try {
      const configRes = await getHomeConfig();
      const data = configRes.data;
      pickType.value = data.main.type;
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

      const galleryRes = await getRandomGalleries();
      // 接口按「八条随机」设计，首页只陈列前四条：再多整块面板就拉得太长
      galleryItems.value = (galleryRes.data || [])
        .slice(0, 4)
        .map((item) => ({ ...item, showInfo: false }));

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
    if (!pickType.value) return;
    try {
      const res = await getRandomMain({ type: pickType.value, exclude: mainExclude() });
      applyMainItem(res.data);
    } catch (err) {
      // 不提交新状态；错误提示由 request.js 统一负责
      console.warn("随机主资源切换失败", err);
    }
  };

  onMounted(loadHome);

  return {
    pickType, mainItem, galleryItems, showInfo, formatShortDate, changeRandom };
}
