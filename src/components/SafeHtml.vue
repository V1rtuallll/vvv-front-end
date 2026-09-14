<template>
  <div class="safe-html" v-html="safe"></div>
</template>

<script setup>
import { computed } from "vue";

import { sanitizeHtml } from "@/utils/sanitizeHtml";

// 全仓库唯一允许出现 v-html 的地方，有守卫测试盯着（components/safeHtmlGuard.test.js）。
// 过滤在这里做而不是在每个调用方 —— 调用方无从绕过。
const props = defineProps({
  html: { type: String, default: "" },
});

const safe = computed(() => sanitizeHtml(props.html));
</script>
