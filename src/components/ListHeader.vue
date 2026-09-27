<template>
  <header class="list-header">
    <div class="header-content">
      <h1 class="list-title">{{ title }}</h1>
      <p v-if="subtitle" class="list-subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="user" class="header-right">
      <div class="current-user">
        <img :src="user.avatar || '/default-avatar.gif'" alt="头像" class="user-avatar" />
        <span class="user-name">@{{ user.username }}</span>
        <RouterLink v-if="actionTo" :to="actionTo" class="crt-btn list-action">{{ actionLabel }}</RouterLink>
        <button v-else-if="actionLabel" class="crt-btn list-action" @click="$emit('action')">{{ actionLabel }}</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from "vue-router";

/**
 * 列表页共用的页头：左边标题与小字说明，右边当前用户与主操作按钮。
 *
 * 抽成组件而不是两个页面各写一份，是因为各写一份的结果就是它俩会长出不一样的字号、
 * 间距与头像尺寸 —— blog 与 gallery 原先正是这样，看着不像同一个站。共用之后
 * 「两边一致」由结构保证，不用靠人记得同步。
 *
 * 未登录时右侧整块不渲染，主操作按钮也在里面：入口隐藏只是显示逻辑，
 * 接口自己校验权限，不靠前端挡。
 */
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  /** 当前登录用户。为空表示未登录，右侧整块不出现 */
  user: { type: Object, default: null },
  /** 主操作上的文字。为空表示这一页没有主操作 */
  actionLabel: { type: String, default: "" },
  /** 主操作是跳转时给地址；不给则渲染成按钮并派发 action */
  actionTo: { type: String, default: "" },
});

defineEmits(["action"]);
</script>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 60px;
  padding: 0 20px;
  /* 必须自己定文字色，不能靠继承：外层 .vf-main 是白面板却没设 color，
     颜色一路继承自 .vf-layout 的 #fff —— 不写这一句标题就是白字印在白底上 */
  color: #2f3b47;
  /* 面板边带的点阵会盖住标题文字，抬一层压住它 */
  position: relative;
  z-index: 1;
}

.header-content {
  text-align: left;
}

.list-title {
  margin: 0 0 15px 0;
  font-size: 3.2rem;
}

.list-subtitle {
  margin: 0;
  color: #54636f;
  font-size: 1.3rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-top: 20px;
}

.current-user {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-avatar {
  width: 120px;
  height: 120px;
  border: 1px solid #ff69b4;
  object-fit: cover;
  object-position: center;
  flex-shrink: 0;
}

.user-name {
  color: #c2185b;
  font-size: 1.3rem;
  font-weight: bold;
}

/* 比 .crt-btn 的默认尺寸大一档：它是这一页唯一的主操作，要和页头的大标题配得上 */
.list-action {
  padding: 15px 38px;
  font-size: 1.4rem;
}

/* ==== 窄屏适配 ==== */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
    margin-bottom: 36px;
  }

  .list-title {
    font-size: 2.2rem;
  }

  .list-subtitle {
    font-size: 1.1rem;
  }

  .header-right {
    margin-top: 0;
  }

  .current-user {
    flex-wrap: wrap;
    gap: 12px;
  }

  .user-avatar {
    width: 72px;
    height: 72px;
  }

  .list-action {
    /* 触摸目标不小于 44px */
    min-height: 44px;
    padding: 12px 28px;
    font-size: 1.2rem;
  }
}

@media (max-width: 480px) {
  .list-header {
    margin-bottom: 24px;
    padding: 0 12px;
  }

  .list-title {
    font-size: 1.8rem;
  }

  .user-avatar {
    width: 56px;
    height: 56px;
  }

  .user-name {
    font-size: 1.1rem;
  }
}
</style>
