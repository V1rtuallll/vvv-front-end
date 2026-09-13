<template>
  <transition name="queue-slide">
    <section v-if="visible" class="queue-panel">
      <header class="queue-head">
        <span class="queue-summary">
          <template v-if="busy">进行中 {{ runningCount }} 个 · 总进度 {{ overallProgress }}%</template>
          <template v-else>{{ settledSummary }}</template>
        </span>
        <span class="queue-track">
          <span class="queue-fill overall" :style="{ width: overallProgress + '%' }"></span>
        </span>
        <button class="queue-btn" @click="collapsed = !collapsed">
          {{ collapsed ? "展开" : "收起" }}
        </button>
        <!-- 跑完之后才给关闭：传输中关掉会让用户以为任务没了 -->
        <button v-if="!busy" class="queue-btn" @click="$emit('clear')">关闭</button>
      </header>

      <ul v-if="!collapsed" class="queue-list">
        <li v-for="item in items" :key="item.key" class="queue-item">
          <span class="queue-kind">{{ KIND_LABEL[item.kind] || "任务" }}</span>
          <span class="queue-name" :title="item.name">{{ item.name || item.title || "未命名" }}</span>
          <span class="queue-track small">
            <span
              class="queue-fill"
              :class="'fill-' + item.status"
              :style="{ width: item.progress + '%' }"
            ></span>
          </span>
          <span class="queue-status">{{ statusText(item) }}</span>
          <button v-if="cancellable(item)" class="queue-btn" @click="$emit('cancel', item)">取消</button>
          <button v-else-if="retryable(item)" class="queue-btn" @click="$emit('retry', item)">重试</button>
        </li>
      </ul>
    </section>
  </transition>
</template>

<script setup>
import { computed, ref } from "vue";

import { TASK_KIND, UPLOAD_STATUS } from "@/modules/upload/composables/useUploadQueue";

const props = defineProps({
  /** useUploadQueue 的 items */
  items: { type: Array, default: () => [] },
  overallProgress: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  /** 真在跑（不是仅仅排着队） */
  busy: Boolean,
});

defineEmits(["cancel", "retry", "clear"]);

const collapsed = ref(false);

/**
 * 只有「真的开始过」或「已经有结果」的任务才值得弹出面板。
 * 仅仅选好文件、还没点确认时不该冒出来 —— 那是弹窗里的事。
 */
const visible = computed(() =>
  props.items.some((item) => item.started || item.status !== UPLOAD_STATUS.QUEUED),
);

const settledSummary = computed(() => {
  const cancelled = props.items.filter((item) => item.status === UPLOAD_STATUS.CANCELLED).length;
  const parts = [`成功 ${props.successCount}`];
  if (props.failedCount) parts.push(`失败 ${props.failedCount}`);
  if (cancelled) parts.push(`取消 ${cancelled}`);
  return `已完成（${parts.join("，")}）`;
});

const KIND_LABEL = {
  [TASK_KIND.UPLOAD]: "上传",
  [TASK_KIND.EDIT]: "编辑",
  [TASK_KIND.REPLACE]: "换文件",
};

const runningCount = computed(
  () => props.items.filter((item) => item.status === UPLOAD_STATUS.UPLOADING).length,
);

const cancellable = (item) =>
  item.status === UPLOAD_STATUS.UPLOADING || item.status === UPLOAD_STATUS.QUEUED;

const retryable = (item) =>
  item.status === UPLOAD_STATUS.FAILED || item.status === UPLOAD_STATUS.CANCELLED;

const STATUS_TEXT = {
  [UPLOAD_STATUS.QUEUED]: "等待中",
  [UPLOAD_STATUS.SUCCESS]: "已完成",
  [UPLOAD_STATUS.FAILED]: "失败",
  [UPLOAD_STATUS.CANCELLED]: "已取消",
};

const statusText = (item) => {
  if (item.status === UPLOAD_STATUS.UPLOADING) return `${item.progress}%`;
  return STATUS_TEXT[item.status] || item.status;
};
</script>

<style scoped>
/* 页面内的普通区块，不是浮层：放在页面顶部、用户头像下面 */
.queue-panel {
  box-sizing: border-box;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto 24px;
  color: #00ffff;
  background: rgba(0, 0, 20, 0.9);
  border: 2px solid #00ffff;
  border-radius: 12px;
  box-shadow: 0 0 24px rgba(0, 255, 255, 0.35);
}

.queue-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 0.92rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.queue-summary {
  flex: 0 0 auto;
  white-space: nowrap;
}

.queue-track {
  flex: 1;
  height: 8px;
  overflow: hidden;
  background: rgba(0, 255, 255, 0.15);
  border-radius: 4px;
}

.queue-track.small {
  flex: 1;
  min-width: 60px;
  height: 6px;
}

.queue-fill {
  display: block;
  width: 0;
  height: 100%;
  background: #00ffff;
  transition: width 0.2s ease;
}

.queue-fill.overall {
  background: #ff69b4;
}

.fill-success {
  background: #00ffff;
}

.fill-failed {
  background: #ff69b4;
}

.fill-cancelled {
  background: #888;
}

.queue-list {
  margin: 0;
  padding: 6px 14px 10px;
  list-style: none;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 0.88rem;
}

.queue-kind {
  flex: 0 0 auto;
  padding: 1px 8px;
  color: #000;
  font-weight: bold;
  background: #00ffff;
  border-radius: 10px;
}

.queue-name {
  flex: 0 1 42%;
  overflow: hidden;
  color: #cceeff;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.queue-status {
  flex: 0 0 auto;
  min-width: 48px;
  color: #ffaae6;
  text-align: right;
}

.queue-btn {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 4px 14px;
  color: #00ffff;
  font-size: 0.85rem;
  background: rgba(0, 255, 255, 0.12);
  border: 1px solid #00ffff;
  border-radius: 20px;
  cursor: pointer;
}

.queue-btn:hover {
  background: rgba(0, 255, 255, 0.25);
}

.queue-slide-enter-active,
.queue-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.queue-slide-enter-from,
.queue-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@media (max-width: 768px) {
  .queue-panel {
    margin-bottom: 16px;
  }

  .queue-head {
    flex-wrap: wrap;
  }

  .queue-summary {
    flex: 1 1 100%;
  }

  .queue-item {
    flex-wrap: wrap;
  }

  .queue-name {
    flex: 1 1 100%;
    white-space: normal;
    word-break: break-all;
  }

  /* 触摸目标不小于 44px */
  .queue-btn {
    min-height: 44px;
  }
}
</style>
