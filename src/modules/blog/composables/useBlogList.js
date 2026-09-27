import { computed, onMounted, ref } from "vue";

import { getBlogList } from "@/modules/blog/api/blogApi";
import { useAuthStore } from "@/stores/auth";
import { usePageQuery } from "@/utils/usePageQuery";

/** 每页条数。博客卡片较大，一页 6 条约合一屏；后端 PageParams 的上限是 100 */
const PAGE_LIMIT = 6;

/** 列表页的分页与数据。当前页跟着地址栏的 ?page= 走 */
export function useBlogList() {
  const authStore = useAuthStore();
  const total = ref(0);
  const blogs = ref([]);
  const loading = ref(false);
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_LIMIT)));

  // load 用函数声明写的：它要用到下面的 page 与 goTo，而这一行又要先把 load 交给它。
  // 这里只是把调用延后，真正取数发生在挂载与翻页时，那时两个绑定都已经就位
  const { page, goTo } = usePageQuery(() => load());

  // 失败时不提交任何新状态：新列表配旧总数会让分页显示成「第 1 / 3 页」而内容是旧的。
  // 提示由 request.js 负责。
  async function load() {
    loading.value = true;
    try {
      const res = await getBlogList({ page: page.value, limit: PAGE_LIMIT });
      blogs.value = res.data?.list || [];
      total.value = res.data?.total || 0;
      // 地址里的页码超出现有页数（手改地址，或文章删到不够页了）时退到最后一页再取一次，
      // 否则页面会停在一张空白列表上。收敛后的页码必然落在范围内，不会再递归。
      // 放在 try 里面：取数失败时总数还是上一轮的，据此改页码可能改错
      if (page.value > totalPages.value) goTo(totalPages.value, { replace: true });
    } catch {
      // 提示由 request.js 负责
    } finally {
      loading.value = false;
    }
  }

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    goTo(nextPage);
  };

  onMounted(load);

  return { authStore, page, total, totalPages, blogs, loading, load, changePage };
}
