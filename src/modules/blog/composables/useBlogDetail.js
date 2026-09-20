import { computed, ref } from "vue";

import { deleteBlog, getBlogDetail } from "@/modules/blog/api/blogApi";
import { isOwner } from "@/shared/auth/owner";
import { useAuthStore } from "@/stores/auth";

// 后端 ID 是 Long，序列化后可能是数字或字符串，统一按字符串比较
const isSameId = (left, right) => left != null && right != null && String(left) === String(right);

/**
 * 详情页的文章状态。
 *
 * 刻意不自己 onMounted：详情页之间互相跳转时组件会被复用，要跟着路由参数变化重新加载，
 * 加载时机由页面用 watch 驱动（见 views/blog/detail/index.vue）。
 *
 * @param {import('vue').Ref} idRef 路由里的文章 id
 */
export function useBlogDetail(idRef) {
  const authStore = useAuthStore();
  const blog = ref(null);
  const loading = ref(true);

  // 入口隐藏只是显示逻辑：后端在 PATCH / DELETE 上独立校验作者与 owner
  const canManage = computed(() => isOwner(authStore.user)
    || isSameId(blog.value?.authorId, authStore.user?.id));

  // 失败时不提交状态：半截数据（有标题没正文）比空页面更难排查
  const load = async () => {
    const id = idRef.value;
    if (!id) return;
    loading.value = true;
    try {
      const res = await getBlogDetail(id);
      blog.value = res.data || null;
    } catch {
      // 提示由 request.js 负责（404 与「草稿对非作者不可见」的 403 都用后端文案）
    } finally {
      loading.value = false;
    }
  };

  /**
   * 删除文章。
   *
   * 只做删除本身：确认框由页面持有（项目自己的弹窗，不是 window.confirm）——
   * 与 gallery 的删除流程同一口径，否则「先问一次」这件事会在两处长得不一样。
   *
   * @returns {Promise<boolean>} true 表示已删除，页面据此跳回列表
   */
  const remove = async () => {
    if (!blog.value) return false;
    try {
      await deleteBlog(blog.value.id);
      window.$vmessage.success("已删除");
      return true;
    } catch {
      // 提示由 request.js 负责
      return false;
    }
  };

  return { authStore, blog, loading, canManage, load, remove };
}
