import { onMounted, ref } from "vue";

import { getGalleryPage } from "@/modules/gallery/api/galleryApi";

/** 右栏列表显示的条数 */
const VISIBLE_COUNT = 5;

/**
 * 一次取回多少条再筛。列表接口的 type 只有「等于」没有「不等于」，
 * 想在客户端跳过音乐就只能多取一窗。窗口要盖得住「最新的 VISIBLE_COUNT 条非音乐」。
 */
const FETCH_LIMIT = 12;

/**
 * 右栏的「最新 N 条画廊」。挂在 DefaultLayout 上，因此每个页面都会请求一次。
 *
 * 直接复用画廊列表接口的第一页，不另开接口：后端那条件分页 SQL 是
 * `ORDER BY created_at DESC`（见 GalleryMapper.selectPage），所以第 1 页就是最新的。
 *
 * 音乐被筛掉：它没有能当缩略图的画面（thumbnail 列从不写入），放进来只是一格类型名。
 * 注意画廊页按 `?id=` 找这些条目时，要求它们落在列表第一页内 ——
 * 侧栏的窗口 FETCH_LIMIT 比画廊页最小的页大小（4）大，音乐占多数时会够不着。
 */
export function useLatestGallery() {
  const items = ref([]);

  // 失败时不提交状态，右栏就是个空网格。提示由 request.js 负责 ——
  // 这里自己再弹一次的话，任何页面的右栏出错都会多出一条重复提示。
  const load = async () => {
    try {
      const res = await getGalleryPage({ page: 1, limit: FETCH_LIMIT });
      items.value = (res.data?.list || [])
        .filter((item) => item.type !== "music")
        .slice(0, VISIBLE_COUNT);
    } catch {
      // 提示由 request.js 负责
    }
  };

  onMounted(load);

  return { items, load };
}
