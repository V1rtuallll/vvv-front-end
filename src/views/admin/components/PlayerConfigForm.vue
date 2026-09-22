<template>
  <section class="admin-section">
    <h3 class="section-title">播放器曲目</h3>

    <div class="field-group">
      <label>曲库（已选 {{ checked.length }} / 共 {{ candidates.length }}）</label>
      <p class="field-hint">只勾这里的曲子，侧栏播放器才放。一首都不勾时播放器不可用。</p>

      <ul class="track-list">
        <li v-for="name in candidates" :key="name" class="track-item">
          <label class="track-label">
            <input v-model="checked" type="checkbox" :value="name" class="track-check" />
            <span class="track-name">{{ formatTrackName(name) }}</span>
          </label>
        </li>
      </ul>

      <div class="track-actions">
        <button class="crt-mini-btn track-check-all" type="button" @click="checked = [...candidates]">全选</button>
        <button class="crt-mini-btn track-clear-all" type="button" @click="checked = []">全不选</button>
      </div>

      <p v-if="staleNames.length" class="field-hint stale-hint">
        这些曲子已经不在 public/music 里，保存后会被清掉：{{ staleNames.join("、") }}
      </p>
    </div>

    <button class="crt-btn" :disabled="saving || !loaded" @click="submit">保存</button>
  </section>
</template>

<script setup>
import { ref, watch } from "vue";

import { usePlayerConfig } from "@/modules/admin/composables/usePlayerConfig";
import { formatTrackName } from "@/modules/player/trackName";

// 读取由 usePlayerConfig 自己负责，这里只消费结果
const { candidates, selected, staleNames, saving, loaded, save } = usePlayerConfig();

// 表单改的是本地副本，点保存才交出去。加载回来的选择可能含已删文件的条目，
// 这里只收下目录里还在的那些 —— 失效条目自动不勾，保存时也就自然被清掉
const checked = ref([]);

watch(selected, (value) => {
  checked.value = value.filter((name) => candidates.value.includes(name));
});

/**
 * 发出的顺序按目录排，不按勾选先后。
 *
 * v-model 往数组里追加是按点击顺序来的 —— 同一批曲子勾的顺序不同就会存出两份内容
 * 不同、意思一样的配置。顺序在这里不表达任何意图，所以统一成目录顺序。
 * 过滤 candidates 而不是直接发 checked，顺手把目录里已经没有的条目摘掉。
 */
const submit = () => save(candidates.value.filter((name) => checked.value.includes(name)));
</script>

<style scoped>
.admin-section {
  margin: 50px 0;
  padding: 30px;
  background: #e9f2f9;
  border: 1px solid #b9c4cc;
  border-radius: 12px;
}

.field-hint {
  margin: 0;
  color: #54636f;
  font-size: 0.8rem;
  line-height: 1.6;
  word-break: break-word;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 420px;
  overflow-y: auto;
}

/* 触摸目标不小于 44px */
.track-label {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 4px 10px;
  background: #ffffff;
  border: 1px solid #b9c4cc;
  border-radius: 4px;
  cursor: pointer;
}

.track-label:hover {
  border-color: #0277bd;
}

.track-check {
  flex: none;
  width: 18px;
  height: 18px;
  accent-color: #0277bd;
}

.track-name {
  min-width: 0;
  overflow: hidden;
  color: #2f3b47;
  font-size: 0.95rem;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.track-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .admin-section {
    margin: 30px 0;
    padding: 18px 14px;
  }

  .track-name {
    white-space: normal;
    word-break: break-all;
  }
}
</style>
