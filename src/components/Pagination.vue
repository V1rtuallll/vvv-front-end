<template>
  <nav class="bottom-pagination" aria-label="分页">
    <button class="crt-mini-btn page-step" :disabled="page <= 1" @click="go(page - 1)">上一页</button>

    <ol class="page-numbers">
      <li v-for="(entry, index) in entries" :key="`${entry}-${index}`">
        <span v-if="entry === GAP" class="page-gap" aria-hidden="true">{{ GAP }}</span>
        <button
          v-else
          class="crt-mini-btn page-number"
          :class="{ 'is-active': entry === page }"
          :aria-current="entry === page ? 'page' : undefined"
          @click="go(entry)"
        >{{ entry }}</button>
      </li>
    </ol>

    <button class="crt-mini-btn page-step" :disabled="page >= totalPages" @click="go(page + 1)">下一页</button>

    <!-- 页码按钮只能翻到附近几页，几十页开外的地方要靠这个下拉直达。
         它替掉的就是原来那个「当前页」数字，读起来仍然是「第 6 / 20 页」 -->
    <span class="page-info">
      第
      <span class="page-jump">
        <select :value="page" aria-label="跳转到第几页" @change="jump">
          <option v-for="n in totalPages" :key="n" :value="n">{{ n }}</option>
        </select>
      </span>
      / {{ totalPages }} 页（共 {{ total }} {{ unit }}）
    </span>
  </nav>
</template>

<script setup>
import { computed } from "vue";

import { pageNumbers } from "@/utils/pagination";

/**
 * 列表页共用的页码条：上一页 / 页码 / 下一页 / 说明。
 *
 * 只负责渲染与派发意图，不持有任何状态 —— 当前页、总数都由调用方给，
 * 翻页后要不要写地址栏、要不要重新拉数据由调用方决定。这样它才能在两个页面
 * （blog 与 gallery）之间共用，而不把某一页的路由逻辑带进另一页。
 *
 * `change` 只在目标页真的不同、且落在合法范围内时才发出：越界与重复点击在这里
 * 就挡掉，调用方不必再判一次。
 */
const props = defineProps({
  /** 当前页，从 1 开始 */
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  /** 总条数，只用于说明文案 */
  total: { type: Number, default: 0 },
  /** 说明文案里的量词，blog 是「篇」、gallery 是「条」 */
  unit: { type: String, default: "条" },
});

const emit = defineEmits(["change"]);

/** 折叠处的占位，与 utils/pagination.js 的 GAP 是同一个字符 */
const GAP = "…";

const entries = computed(() => pageNumbers(props.page, props.totalPages));

const go = (target) => {
  if (target < 1 || target > props.totalPages || target === props.page) return;
  emit("change", target);
};

/** 下拉框给的是字符串，转成数字再走同一道闸 —— 越界与同值都挡在 go 里 */
const jump = (event) => go(Number(event.target.value));
</script>

<style scoped>
/* 只放布局：外边距、配色、字号留给调用方 —— 两个页面的间距与配色本来就不同，
   组件写死了调用方要么改不动，要么得跟组件自己的规则抢优先级 */
.bottom-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.page-numbers {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 数字比「上一页」窄：固定最小宽度让个位数与两位数对齐，页码不会随位数跳动 */
.page-number {
  box-sizing: border-box;
  min-width: 38px;
  padding: 8px 10px;
  text-align: center;
}

/* 当前页实心。悬停色要单独压住，否则鼠标移上去时当前页和别的页长得一样 */
.page-number.is-active,
.page-number.is-active:hover {
  color: #ffffff;
  background: #0277bd;
  border-color: #0277bd;
  cursor: default;
}

.page-gap {
  padding: 0 2px;
  color: #5a5a78;
}

/* 说明单独占一行：页码铺开后按钮行本身就很长，挤在同行窄屏必折行 */
.page-info {
  flex: 1 1 100%;
  color: inherit;
  font-size: 0.9em;
  text-align: center;
}

/* 下拉比两侧文字高，不居中会把这行文字顶得往下沉 */
.page-jump select {
  min-height: 36px;
  margin: 0 4px;
  padding: 4px 8px;
  color: #2f3b47;
  background: #ffffff;
  border: 1px solid #b9c4cc;
  border-radius: 4px;
  font-family: inherit;
  font-size: inherit;
  vertical-align: middle;
}

/* ==== 窄屏适配 ==== */
@media (max-width: 768px) {
  .bottom-pagination {
    gap: 8px;
  }

  /* 触摸目标不小于 44px */
  .page-step,
  .page-number,
  .page-jump select {
    min-height: 44px;
  }
}
</style>
