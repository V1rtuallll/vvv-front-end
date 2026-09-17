import { onMounted, ref } from "vue";

import { getLatestBlogs } from "@/modules/blog/api/blogApi";

/**
 * 右栏的「最新 N 条」。挂在 DefaultLayout 上，因此每个页面都会请求一次；
 * 后端只下发 id / title / summary / createdAt 四项，载荷很小。
 */
export function useLatestBlogs() {
  const blogs = ref([]);

  // 失败时不提交状态，右栏就是个空列表。提示由 request.js 负责 ——
  // 这里自己再弹一次的话，任何页面的右栏出错都会多出一条重复提示。
  const load = async () => {
    try {
      const res = await getLatestBlogs({ limit: 5 });
      blogs.value = res.data || [];
    } catch {
      // 提示由 request.js 负责
    }
  };

  onMounted(load);

  return { blogs, load };
}
