import { onBeforeUnmount, ref, watch } from "vue";

import { isNarrowViewport } from "@/utils/responsive";

/**
 * 移动端抽屉的开合状态。
 *
 * 抽屉只在 <=768px 存在：宽屏下两个触发按钮被 CSS 隐藏，状态不会被打开。
 * 单值设计让同一时刻最多只有一个抽屉展开。视口回到宽屏时必须主动关闭 ——
 * 否则会残留遮罩与 body 滚动锁，而那时按钮不可见，用户无法自救。
 *
 * 显隐由 CSS transform 完成，元素始终留在 DOM 中 —— 播放器在 onMounted 里
 * 直接对 refs 取属性，元素一旦被 v-if 摘除，播放器会在所有分辨率下失效。
 *
 * 设计依据见 components/layout/doc/设计说明.md。
 */

const resolveWindow = () => (typeof window === "undefined" ? null : window);

export function useDrawer(win = resolveWindow()) {
  const openDrawer = ref(null);

  const closeDrawer = () => {
    openDrawer.value = null;
  };

  const toggleDrawer = (name) => {
    openDrawer.value = openDrawer.value === name ? null : name;
  };

  const onKeydown = (event) => {
    if (event.key === "Escape") closeDrawer();
  };

  const onResize = () => {
    if (!isNarrowViewport(win)) closeDrawer();
  };

  if (win) {
    win.addEventListener("keydown", onKeydown);
    win.addEventListener("resize", onResize);
  }

  watch(openDrawer, (value) => {
    const body = win?.document?.body;
    if (body) body.style.overflow = value ? "hidden" : "";
  });

  onBeforeUnmount(() => {
    if (win) {
      win.removeEventListener("keydown", onKeydown);
      win.removeEventListener("resize", onResize);
    }
    const body = win?.document?.body;
    if (body) body.style.overflow = "";
  });

  return { openDrawer, closeDrawer, toggleDrawer };
}
