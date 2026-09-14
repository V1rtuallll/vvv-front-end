<template>
  <div class="about-page">
    <p v-if="loading" class="about-loading">Loading...</p>

    <p v-else-if="isEmpty" class="about-empty">这里还没有内容</p>

    <template v-else>
      <header v-if="hasIdentity" class="about-identity">
        <img
          v-if="content.avatarSrc"
          :src="content.avatarSrc"
          :alt="content.displayName || '头像'"
          class="about-avatar"
        />
        <div class="about-identity-text">
          <h1 v-if="content.displayName" class="about-name">{{ content.displayName }}</h1>
          <p v-if="content.tagline" class="about-tagline">{{ content.tagline }}</p>
        </div>
      </header>

      <SafeHtml v-if="content.bioHtml" class="about-bio" :html="content.bioHtml" />

      <ul v-if="content.tags.length" class="about-tags">
        <li v-for="tag in content.tags" :key="tag" class="about-tag">{{ tag }}</li>
      </ul>

      <ul v-if="content.links.length" class="about-links">
        <li v-for="link in content.links" :key="link.url">
          <a class="about-link" :href="link.url" target="_blank" rel="noopener noreferrer">
            » {{ link.name }} ↗
          </a>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";

import SafeHtml from "@/components/SafeHtml.vue";
import { useAboutPage } from "@/modules/about/composables/useAboutPage";

// 正文的样式不放在 scoped 的 index.css 里：scoped 的样式靠 data 属性生效，
// 而 SafeHtml 注入的正文拿不到那个属性，规则对它完全无效。
// 后台预览要和这里长得完全一致，所以两边共用同一份 about-bio.css。
import "./about-bio.css";

const { content, loading } = useAboutPage();

const hasIdentity = computed(() =>
  Boolean(content.value.avatarSrc || content.value.displayName || content.value.tagline));

const isEmpty = computed(() =>
  !hasIdentity.value
  && !content.value.bioHtml
  && content.value.tags.length === 0
  && content.value.links.length === 0);
</script>

<style scoped src="./index.css"></style>
