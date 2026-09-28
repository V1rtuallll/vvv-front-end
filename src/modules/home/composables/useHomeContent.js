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
   * 最近一次随机抽中、并且已经落到屏幕上的那条 src；还没抽到过时是 `null`。
   *
   * **必须单独存一位状态，不能拿 `mainItem.value.src` 顶替。** 首次加载时它装的是
   * 配置里的兜底地址 —— 随机请求失败才会用到，此刻并没有显示在画面上。把它也排掉，
   * 等于让那一条永远抽不到。
   *
   * 实测（池子 6 条、下方陈列排掉 4 条，20 万次模拟）：配置的 src 落在池子里时，
   * 被误排的那一条中签率只有 6.44%，其余五条各 18.87%（公平值是 16.67%）——
   * 「每条等概率」直接不成立。不落在池子里时则各 16.5%~16.8%，是均等的。
   */
  const pickedMainSrc = ref(null);

  /**
   * 主展示要避开的 src —— **只有当前正在展示的那一条**。
   *
   * 不排它的话「换一个」会原样返回同一条。只认「真的抽到过」的那一条：
   * 首次加载时 pickedMainSrc 还是 null，主展示因此拿到一次干净的全池抽取。
   *
   * **不再排下方那一栏**（用户 2026-09-28 决定）：主展示与下面那 4 张允许重复。
   * 两边互排时主展示只在「别人挑剩的」里选，而用户要的是主展示这一路完全自由的随机；
   * 上下偶尔撞一条由它去。
   */
  const mainExclude = () => pickedMainSrc.value ?? "";

  /**
   * 随机模式下「抽签还没出结果」。
   *
   * 置位期间页面渲染占位，**不渲染配置里的兜底 src**。后者要等 1~2 秒才被真正抽中的
   * 那条顶掉，先把它画上去等于连闪带白拉一遍媒体；而且 `gallery` 模式下服务端定位不到
   * 这条非画廊的兜底素材，那 2 秒里上传者只能显示「神秘人 / 未知时间」。
   *
   * 只在**首次加载**置位：点「换一个」时当前这条还在画面上，把它换成占位反而更闪。
   */
  const mainPending = ref(false);

  /** 配置里的那一份主展示。随机模式下它是兜底值，抽签失败时要原样放回去 */
  let fallbackMain = null;

  const loadRandomMain = async () => {
    try {
      const res = await getRandomMain({ type: pickType.value, exclude: mainExclude() });
      applyMainItem(res.data);
      pickedMainSrc.value = res.data?.src ?? null;
    } catch (err) {
      // 抽不到就把配置里的兜底值放回画面上 —— 它存在的意义就是这一刻。
      // 不放回的话占位会一直挂着，用户看到的是一片空
      if (fallbackMain) mainItem.value = { ...fallbackMain };
      console.warn("随机主资源加载失败，使用配置值", err);
    } finally {
      mainPending.value = false;
    }
  };

  const loadHome = async () => {
    try {
      const configRes = await getHomeConfig();
      const data = configRes.data;
      pickType.value = data.main.type;
      // 上传者三项照搬服务端：配置里的 src 能定位到素材时服务端会给，定位不到就不给。
      // 这里不做兜底 —— 编造出来的是「具体的人名和时间」，首屏会先显示它们，
      // 第二次请求再失败的话还会一直留在页面上，等于替服务端断言了一件它没说过的事。
      // 缺省时由页面显示「未知」，那读起来是占位符而不是事实
      fallbackMain = {
        type: data.main.type,
        src: data.main.src,
        title: data.main.title,
        description: data.main.desc,
        alt: data.main.alt || "V1rtual",
        uploaderAvatar: data.main.uploaderAvatar,
        uploaderUsername: data.main.uploaderUsername,
        uploadTime: data.main.uploadTime,
        random: data.main.random,
      };
      // 随机模式下**从这里就把兜底 src 摘掉**，不能等到抽签前再摘：
      // 配置一回来它就会上屏，而中间还夹着一次「取下方卡片」的请求。
      // 实测把摘除放在那之后，兜底媒体照样先画了上去（209ms 出现、386ms 才换成占位）——
      // 等于连闪一下再白拉一遍媒体。摘得越早，这个窗口越短。
      //
      // 标题与描述照旧下发：它们是配置那条的事实，抽中后会被覆盖
      const isRandom = Boolean(fallbackMain.random);
      mainItem.value = isRandom ? { ...fallbackMain, src: null } : { ...fallbackMain };
      mainPending.value = isRandom;
      galleryItems.value = data.galleryItems || [];

      // ① 先定主展示。随机模式由后端挑一条（不再把全量 src 下发到前端）。
      //    此刻 pickedMainSrc 还是 null，排除表是空的 —— 主展示拿到的是一次
      //    干净的全池等概率抽取，跟下面那栏没有关系。
      //
      //    先抽它还有一个好处：占位只等这一次请求就能撤掉，不用等下面那栏。
      if (isRandom) {
        await loadRandomMain();
      } else {
        await fetchFullMainItem();
      }

      // ② 下方那 4 张再抽。接口按「八条随机」设计，首页只陈列前四条：
      //    再多整块面板就拉得太长。
      //
      //    **不排主展示**（用户 2026-09-28 决定）：上下允许重复，主展示那一路要是
      //    自由的。四条彼此之间天然不重复 —— 后端一条 gallery 行只出一行。
      const galleryRes = await getRandomGalleries();
      galleryItems.value = (galleryRes.data || [])
        .slice(0, 4)
        .map((item) => ({ ...item, showInfo: false }));
    } catch (err) {
      console.error("加载 Home 配置失败", err);
      // 占位不能留在画面上。但**主展示已经定下来时不许动它** —— 主展示先抽，
      // 走到这里还失败的多半是后面那步「取下方卡片」，那跟主展示无关；
      // 无脑退回兜底值反而会把一条抽好的随机结果换成配置里那条。
      mainPending.value = false;
      if (fallbackMain && !mainItem.value?.src) mainItem.value = { ...fallbackMain };
    }
  };

  const changeRandom = async () => {
    if (!pickType.value) return;
    try {
      const res = await getRandomMain({ type: pickType.value, exclude: mainExclude() });
      applyMainItem(res.data);
      pickedMainSrc.value = res.data?.src ?? null;
    } catch (err) {
      // 不提交新状态；错误提示由 request.js 统一负责
      console.warn("随机主资源切换失败", err);
    }
  };

  onMounted(loadHome);

  return {
    pickType, mainItem, galleryItems, showInfo, formatShortDate, changeRandom, mainPending };
}
