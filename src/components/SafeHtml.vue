<template>
  <div class="safe-html" v-html="safe"></div>
</template>

<script setup>
import { computed } from "vue";

import { renderMarkdown } from "@/utils/markdown";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

// 全仓库唯一允许出现 v-html 的地方，有守卫测试盯着（components/safeHtmlGuard.test.js）。
// 过滤在这里做而不是在每个调用方。
//
// 已知边界：本组件单根且未关闭 inheritAttrs，调用方写 <SafeHtml :innerHTML="..." />
// 会绕过过滤直接落到根元素的 innerHTML，守卫只搜字面量 v-html 也拦不到这种写法。
// 该风险已被裁决接受，不做结构性加固：这是刻意保留的边界，不是遗漏。
const props = defineProps({
  html: { type: String, default: "" },
  // 正文是 Markdown（博客）时置真。Markdown 先渲染成 HTML，然后和别的输入一样
  // 走同一个 sanitizeHtml —— 消毒点仍然只有这一个。
  markdown: { type: Boolean, default: false },
});

const safe = computed(() => sanitizeHtml(props.markdown ? renderMarkdown(props.html) : props.html));
</script>
