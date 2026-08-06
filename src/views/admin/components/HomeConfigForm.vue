<template>
  <section class="admin-section">
    <h3 class="section-title">Home 页面配置</h3>

    <div class="field-group">
      <label>类型</label>
      <select v-model="config.main.type" class="crt-input">
        <option value="image">图片/动图</option>
        <option value="video">视频</option>
      </select>
    </div>

    <div class="field-group">
      <label>随机从数据库取</label>
      <input
        type="checkbox"
        :checked="config.main.random === 1"
        @change="config.main.random = $event.target.checked ? 1 : 0"
      />
    </div>

    <div v-if="config.main.random !== 1" class="field-group">
      <label>指定 URL</label>
      <input v-model="config.main.src" class="crt-input" placeholder="https://..." />
    </div>

    <div class="field-group">
      <label>标题</label>
      <input v-model="config.main.title" class="crt-input" />
    </div>

    <div class="field-group">
      <label>描述</label>
      <textarea v-model="config.main.desc" class="crt-input"></textarea>
    </div>

    <div class="field-group">
      <label>大展示 Alt（无障碍描述）</label>
      <input v-model="config.main.alt" class="crt-input" placeholder="月光温柔洒落～" />
    </div>

    <div v-if="config.main.random" class="field-group">
      <ul class="file-list">
        <li v-for="(file, index) in availableFiles" :key="index">
          <a :href="file" target="_blank" class="file-link">{{ file }}</a>
          <button @click="$emit('set-main', file)" class="crt-mini-btn small">设为主展示</button>
        </li>
      </ul>
    </div>

    <button @click="$emit('save')" class="crt-btn">保存 Home 配置</button>
  </section>
</template>

<script setup>
defineProps({
  config: { type: Object, required: true },
  availableFiles: { type: Array, default: () => [] },
});

defineEmits(["save", "set-main"]);
</script>

<style scoped>
.admin-section {
  margin: 50px 0;
  padding: 30px;
  background: rgba(5, 5, 20, 0.6);
  border: 1px solid #00ffff44;
  border-radius: 12px;
}
</style>
