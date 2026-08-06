<template>
  <div v-if="item" class="edit-modal-overlay" @click="$emit('cancel')">
    <div class="edit-modal" @click.stop>
      <h3>编辑 {{ item.type.toUpperCase() }} (ID: {{ item.id }})</h3>
      <div class="field-group"><label>标题</label><input v-model="item.filename" class="crt-input" /></div>
      <div class="field-group"><label>描述</label><textarea v-model="item.description" class="crt-input"></textarea></div>
      <div v-if="item.type === 'photo'" class="field-group">
        <label>Alt</label><input v-model="item.alt" class="crt-input" />
        <label>分类</label><input v-model="item.category" class="crt-input" />
      </div>
      <div v-if="item.type === 'video' || item.type === 'music'" class="field-group">
        <label>时长（秒）</label><input v-model.number="item.duration" type="number" class="crt-input" />
      </div>
      <div class="field-group"><label>标签</label><input v-model="item.tags" class="crt-input" /></div>
      <div class="modal-actions">
        <button @click="$emit('save')" class="crt-btn">保存</button>
        <button @click="$emit('cancel')" class="crt-mini-btn danger">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ item: { type: Object, default: null } });
defineEmits(["save", "cancel"]);
</script>

<style scoped>
.edit-modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 999; }
.edit-modal { width: 90%; max-width: 700px; background: rgba(0, 0, 20, 0.9); padding: 35px; border-radius: 15px; border: 2px solid #00ffff; box-shadow: 0 0 30px #00ffff88; }
.modal-actions { margin-top: 25px; display: flex; gap: 15px; justify-content: center; }
</style>
