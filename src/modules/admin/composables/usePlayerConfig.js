import { computed, onMounted, ref } from "vue";

import { savePlayerConfig } from "@/modules/admin/api/adminApi";
import { getPlayerPlaylist } from "@/modules/player/api/playerApi";
import { buildTimeTracks } from "@/modules/player/playlist";

/** 后台播放器曲目配置表单的加载与保存。这份状态只有那个表单用，所以不放进 useAdminPage。 */
export function usePlayerConfig() {
  /** 构建期扫到的全部候选，顺序即目录排序 */
  const candidates = ref([...buildTimeTracks]);
  /** 库里存着的选择。可能含已经不在目录里的文件名 */
  const selected = ref([]);
  const saving = ref(false);
  // 只在成功读到载荷后才置 true。加载失败时 selected 是空的，此时保存会把库里
  // 已有的配置清空，所以要有这个标记来挡住保存
  const loaded = ref(false);

  /** 配置里有、但 public/music 里已经没有的文件名。加载后保存一次就会被清掉 */
  const staleNames = computed(() =>
    selected.value.filter((name) => !buildTimeTracks.includes(name)));

  const load = async () => {
    loaded.value = false;
    try {
      const res = await getPlayerPlaylist();
      selected.value = Array.isArray(res?.data) ? res.data : [];
      loaded.value = true;
    } catch {
      // 提示由 request.js 负责
    }
  };

  const save = async (tracks) => {
    if (!loaded.value) return;
    saving.value = true;
    try {
      await savePlayerConfig(tracks);
      window.$vmessage.success("播放器曲目已保存");
      await load();
    } catch {
      // 提示由 request.js 负责，这里只收尾
    } finally {
      saving.value = false;
    }
  };

  // 挂载即读取，表单不必自己再拉一次 —— 与 useAboutConfig 的做法一致
  onMounted(load);

  return { candidates, selected, staleNames, saving, loaded, load, save };
}
