<template>
  <div class="about-page">
    <p v-if="loading" class="about-loading">Loading...</p>

    <AboutContent v-else :content="content" />
  </div>
</template>

<script setup>
import AboutContent from "./components/AboutContent.vue";
import { useAboutPage } from "@/modules/about/composables/useAboutPage";

const { content, loading } = useAboutPage();
</script>

<style scoped src="./index.css"></style>
