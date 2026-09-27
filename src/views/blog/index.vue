<template>
  <div class="blog-wrapper">
    <!-- 与 gallery 同一套页头：标题、小字说明、当前用户与主操作都由 ListHeader 管，
         两个页面因此不会各长各的。未登录时右侧整块不渲染，接口自己校验权限 -->
    <ListHeader
      title="Blog"
      subtitle="Share ur opinion."
      :user="authStore.user"
      action-label="Write something"
      action-to="/blog/editor"
    />

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

    <Pagination
      v-if="total > 0"
      :page="page"
      :total-pages="totalPages"
      :total="total"
      unit="篇"
      @change="changePage"
    />
  </div>
</template>

<script setup>
import ListHeader from "@/components/ListHeader.vue";
import Pagination from "@/components/Pagination.vue";
import { useBlogList } from "@/modules/blog/composables/useBlogList";
import BlogCard from "@/views/blog/components/BlogCard.vue";

const { authStore, page, total, totalPages, blogs, loading, changePage } = useBlogList();
</script>

<style src="./index.css" scoped></style>
