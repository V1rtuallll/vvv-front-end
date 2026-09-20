<template>
  <div class="blog-wrapper">
    <header class="blog-header">
      <div class="header-content">
        <h1 class="blog-title">Blog</h1>
      </div>
      <div class="header-right">
        <!-- 与 gallery 的上传按钮同一条可见性规则：入口隐藏只是显示逻辑，接口自己校验权限 -->
        <router-link v-if="authStore.isLoggedIn" to="/blog/editor" class="crt-btn blog-write-btn">Write something</router-link>
      </div>
    </header>

    <main class="blog-list">
      <router-link
        v-for="blog in blogs"
        :key="blog.id"
        :to="`/blog/detail/${blog.id}`"
        class="blog-card-link"
      >
        <BlogCard :blog="blog" />
      </router-link>

      <p v-if="!loading && blogs.length === 0" class="blog-empty">暂无文章</p>
    </main>

    <nav v-if="total > 0" class="bottom-pagination">
      <button @click="changePage(page - 1)" :disabled="page <= 1" class="crt-mini-btn">上一页</button>
      <span class="page-info">第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 篇）</span>
      <button @click="changePage(page + 1)" :disabled="page >= totalPages" class="crt-mini-btn">下一页</button>
    </nav>
  </div>
</template>

<script setup>
import { useBlogList } from "@/modules/blog/composables/useBlogList";
import BlogCard from "@/views/blog/components/BlogCard.vue";

const { authStore, page, total, totalPages, blogs, loading, changePage } = useBlogList();
</script>

<style src="./index.css" scoped></style>
