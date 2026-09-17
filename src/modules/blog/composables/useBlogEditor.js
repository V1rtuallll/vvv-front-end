import { computed, reactive, ref } from "vue";

import { createBlog, getBlogDetail, updateBlog } from "@/modules/blog/api/blogApi";
import { useAuthStore } from "@/stores/auth";

/**
 * 媒体插进正文时用的文本。
 *
 * 图片走 Markdown 语法，视频走原生标签 —— markdown-it 开了 html: true，
 * 原生标签会原样穿过渲染，然后再过一遍白名单（<video> 已经在白名单里）。
 *
 * @param {{ kind: "image"|"video", url: string, name?: string }} media
 */
export function mediaSnippet({ kind, url, name }) {
  return kind === "video"
    ? `<video src="${url}" controls></video>`
    : `![${name || "图片"}](${url})`;
}

/**
 * 编辑器的表单与保存。
 *
 * @param {import('vue').Ref} idRef 路由查询串里的文章 id（新建时为空串）
 */
export function useBlogEditor(idRef) {
  const authStore = useAuthStore();
  const form = reactive({ id: null, title: "", content: "", coverImage: "", status: 0 });
  const loading = ref(false);
  const saving = ref(false);

  const isEdit = computed(() => form.id != null);

  // 失败时不提交状态：半截数据（有标题没正文）比空表单更难排查
  const load = async () => {
    if (!idRef.value) return;
    loading.value = true;
    try {
      const res = await getBlogDetail(idRef.value);
      const data = res.data;
      if (!data) return;
      form.id = data.id;
      form.title = data.title || "";
      form.content = data.content || "";
      form.coverImage = data.coverImage || "";
      form.status = data.status ?? 0;
    } catch {
      // 提示由 request.js 负责（草稿对非作者不可见时后端返回 403 文案）
    } finally {
      loading.value = false;
    }
  };

  const setCover = (url) => {
    form.coverImage = url || "";
  };

  /**
   * 保存。标题与正文的空值在本地就拦下 —— 后端也会拦，但本地拦能说清是哪一项。
   * @param {0|1} status 0 存草稿 / 1 发布
   * @returns {Promise<{ ok: boolean, id: number|null }>} 页面据此决定跳不跳详情页
   */
  const save = async (status) => {
    if (!form.title.trim()) {
      window.$vmessage.warning("标题不能为空");
      return { ok: false, id: null };
    }
    if (!form.content.trim()) {
      window.$vmessage.warning("正文不能为空");
      return { ok: false, id: null };
    }

    const payload = {
      title: form.title.trim(),
      content: form.content,
      coverImage: form.coverImage.trim(),
      status,
    };

    saving.value = true;
    try {
      const res = isEdit.value ? await updateBlog(form.id, payload) : await createBlog(payload);
      form.status = status;
      window.$vmessage.success(status === 1 ? "已发布" : "已存为草稿");
      return { ok: true, id: res.data?.id ?? form.id };
    } catch {
      // 提示由 request.js 负责；失败时不改 form，用户可以直接重试
      return { ok: false, id: null };
    } finally {
      saving.value = false;
    }
  };

  return { authStore, form, loading, saving, isEdit, load, save, setCover };
}
