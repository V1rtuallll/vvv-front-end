import { onMounted, ref } from "vue";

import { getGalleryPage } from "@/modules/gallery/api/galleryApi";

/**
 * 右栏的「最新 N 条画廊」。挂在 DefaultLayout 上，因此每个页面都会请求一次。
 *
 * 直接复用画廊列表接口的第一页，不另开接口：后端那条件分页 SQL 是
 * `ORDER BY created_at DESC`（见 GalleryMapper.selectPage），所以第 1 页的前 3 条就是最新的 3 条。
 */
export function useLatestGallery() {
  const items = ref([]);

  // 失败时不提交状态，右栏就是个空网格。提示由 request.js 负责 ——
  // 这里自己再弹一次的话，任何页面的右栏出错都会多出一条重复提示。
  const load = async () => {
    try {
      const res = await getGalleryPage({ page: 1, limit: 3 });
      items.value = res.data?.list || [];
    } catch {
      // 提示由 request.js 负责
    }
  };

  onMounted(load);

  return { items, load };
}
