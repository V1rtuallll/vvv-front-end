import { onMounted, ref } from "vue";

import { getAbout } from "@/modules/about/api/aboutApi";
import { emptyAboutContent, normalizeAboutContent } from "@/modules/about/content";

export function useAboutPage() {
  const content = ref(emptyAboutContent());
  const loading = ref(true);

  const loadAbout = async () => {
    loading.value = true;
    try {
      const res = await getAbout();
      content.value = normalizeAboutContent(res.data);
    } catch {
      // 提示由 request.js 负责，这里只把内容退回空版式
      content.value = emptyAboutContent();
    } finally {
      loading.value = false;
    }
  };

  onMounted(loadAbout);

  return { content, loading, loadAbout };
}
