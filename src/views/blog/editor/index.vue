<template>
  <div class="blog-editor">
    <header class="editor-header">
      <h1 class="editor-title">{{ isEdit ? "编辑文章" : "写博客" }}</h1>
      <div class="editor-actions">
        <BlogMediaPicker label="插入图片 / 视频" @picked="insertMedia" />
        <BlogMediaPicker label="上传封面" accept="image/*" @picked="onCoverPicked" />
        <button class="crt-mini-btn editor-draft" :disabled="saving" @click="submit(0)">存草稿</button>
        <button class="crt-btn editor-publish" :disabled="saving" @click="submit(1)">发布</button>
      </div>
    </header>

    <div class="editor-row">
      <div class="editor-pane">
        <input
          v-model="form.title"
          class="crt-input editor-title-input"
          maxlength="200"
          placeholder="标题"
        />
        <textarea
          ref="contentEl"
          v-model="form.content"
          class="crt-textarea editor-content-input"
          placeholder="正文用 Markdown 写，图片与视频用上面的按钮插进来"
        ></textarea>

        <div v-if="form.coverImage" class="cover-preview">
          <img :src="form.coverImage" alt="封面" class="cover-image" />
          <button class="crt-mini-btn cover-clear" @click="clearCover">移除封面</button>
        </div>
      </div>

      <div class="preview-pane">
        <!-- 预览走与详情页同一条渲染链：作者看到的就是访客看到的 -->
        <SafeHtml class="blog-content" :html="form.content" markdown />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import SafeHtml from "@/components/SafeHtml.vue";
import { mediaSnippet, useBlogEditor } from "@/modules/blog/composables/useBlogEditor";
import BlogMediaPicker from "@/views/blog/components/BlogMediaPicker.vue";

import "@/views/blog/blog-content.css";

const route = useRoute();
const router = useRouter();

// 编辑复用同一个页面：/blog/editor?id=<id>
const id = computed(() => route.query.id ?? "");
const { form, saving, isEdit, load, save, setCover } = useBlogEditor(id);

onMounted(load);

const contentEl = ref(null);

/**
 * 把媒体片段插到光标处。
 * 上传期间编辑器可能已经失焦，所以插入位置取 textarea 上次的 selectionStart，
 * 插完把光标移到片段之后，用户可以接着往下写。
 */
const insertMedia = ({ kind, url, name }) => {
  const snippet = mediaSnippet({ kind, url, name });
  const el = contentEl.value;
  const start = el?.selectionStart ?? form.content.length;
  const end = el?.selectionEnd ?? start;

  form.content = `${form.content.slice(0, start)}${snippet}${form.content.slice(end)}`;

  nextTick(() => {
    if (!el) return;
    el.focus();
    el.selectionStart = start + snippet.length;
    el.selectionEnd = start + snippet.length;
  });
};

const onCoverPicked = ({ url }) => setCover(url);

const clearCover = () => setCover("");

const submit = async (status) => {
  const res = await save(status);
  if (res.ok && res.id != null) router.push(`/blog/detail/${res.id}`);
};
</script>

<style src="./index.css" scoped></style>
