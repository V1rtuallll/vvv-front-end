import { onMounted, ref } from "vue";

import { saveAdminAbout } from "@/modules/admin/api/adminApi";
import { getAbout } from "@/modules/about/api/aboutApi";
import { emptyAboutContent, normalizeAboutContent } from "@/modules/about/content";

/** 后台 About 配置表单的加载与保存。这份状态只有那个表单用，所以不放进 useAdminPage。 */
export function useAboutConfig() {
  const content = ref(emptyAboutContent());
  const saving = ref(false);

  const load = async () => {
    try {
      const res = await getAbout();
      content.value = normalizeAboutContent(res.data);
    } catch {
      // 提示由 request.js 负责
    }
  };

  const save = async (payload) => {
    saving.value = true;
    try {
      await saveAdminAbout(payload);
      window.$vmessage.success("About 配置已保存");
      await load();
    } catch {
      // 提示由 request.js 负责，这里只收尾
    } finally {
      saving.value = false;
    }
  };

  // 挂载即读取，表单不必自己再拉一次 —— 与 useAboutPage 的做法一致
  onMounted(load);

  return { content, saving, load, save };
}
