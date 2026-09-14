<template>
  <div class="about-page">
    <p v-if="loading" class="about-loading">Loading...</p>

    <p v-else-if="isEmpty" class="about-empty">这里还没有内容</p>

    <AboutContent v-else :content="content" />
  </div>
</template>

<script setup>
import { computed } from "vue";

import AboutContent from "./components/AboutContent.vue";
import { useAboutPage } from "@/modules/about/composables/useAboutPage";

const { content, loading } = useAboutPage();

// 身份区永远有内容（来自站点账号），所以空态只看正文、标签、链接
const isEmpty = computed(() =>
  !content.value.bioHtml
  && content.value.tags.length === 0
  && content.value.links.length === 0);
</script>

<style scoped src="./index.css"></style>
