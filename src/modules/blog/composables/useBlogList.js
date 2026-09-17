import { computed, onMounted, ref } from "vue";

import { getBlogList } from "@/modules/blog/api/blogApi";
import { useAuthStore } from "@/stores/auth";

/** 列表页的分页与数据。默认每页 10 条，与后端 BlogController.DEFAULT_PAGE_LIMIT 一致。 */
export function useBlogList() {
  const authStore = useAuthStore();
  const page = ref(1);
  const limit = ref(10);
  const total = ref(0);
  const blogs = ref([]);
  const loading = ref(false);
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

  // 失败时不提交任何新状态：新列表配旧总数会让分页显示成「第 1 / 3 页」而内容是旧的。
  // 提示由 request.js 负责。
  const load = async () => {
    loading.value = true;
    try {
      const res = await getBlogList({ page: page.value, limit: limit.value });
      blogs.value = res.data?.list || [];
      total.value = res.data?.total || 0;
    } catch {
      // 提示由 request.js 负责
    } finally {
      loading.value = false;
    }
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    page.value = nextPage;
    load();
  };

  onMounted(load);

  return { authStore, page, limit, total, totalPages, blogs, loading, load, changePage };
}
