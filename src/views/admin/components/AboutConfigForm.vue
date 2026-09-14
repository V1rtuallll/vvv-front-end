<template>
  <section class="admin-section">
    <h3 class="section-title">About 页面配置</h3>

    <div class="field-group">
      <label>头像 URL</label>
      <div class="avatar-row">
        <input
          v-model="form.avatarSrc"
          class="crt-input about-avatar-input"
          maxlength="512"
          placeholder="/stickers/xxx.gif 或 https://..."
        />
        <img v-if="form.avatarSrc" :src="form.avatarSrc" alt="" class="avatar-preview" />
      </div>
    </div>

    <div class="field-group">
      <label>昵称</label>
      <input v-model="form.displayName" class="crt-input about-name-input" maxlength="100" />
    </div>

    <div class="field-group">
      <label>一句话签名</label>
      <input v-model="form.tagline" class="crt-input about-tagline-input" maxlength="255" />
    </div>

    <div class="field-group">
      <label>正文</label>
      <div class="bio-row">
        <textarea v-model="form.bioHtml" class="crt-textarea about-bio-input"></textarea>
        <div class="bio-preview">
          <SafeHtml class="about-bio" :html="form.bioHtml" />
        </div>
      </div>
      <p class="field-hint">放行的标签：{{ allowedTagList }}</p>
    </div>

    <div class="field-group">
      <label>链接</label>
      <ul class="link-list">
        <li v-for="(link, index) in form.links" :key="index" class="link-item">
          <input v-model="link.name" class="crt-input link-name" placeholder="名称" />
          <input v-model="link.url" class="crt-input link-url" placeholder="https://..." />
          <button class="crt-mini-btn about-link-up" :disabled="index === 0" @click="moveLink(index, -1)">↑</button>
          <button
            class="crt-mini-btn about-link-down"
            :disabled="index === form.links.length - 1"
            @click="moveLink(index, 1)"
          >↓</button>
          <button class="crt-mini-btn about-link-remove" @click="form.links.splice(index, 1)">×</button>
        </li>
      </ul>
      <button class="crt-mini-btn about-link-add" @click="form.links.push({ name: '', url: '' })">+ 添加一条</button>
    </div>

    <div class="field-group">
      <label>标签（逗号分隔）</label>
      <input v-model="tagsText" class="crt-input about-tags-input" placeholder="Vue, Java, 摄影" />
    </div>

    <button class="crt-btn about-save" :disabled="saving || !loaded" @click="submit">保存</button>
  </section>
</template>

<script setup>
import { computed, reactive, watch } from "vue";

import SafeHtml from "@/components/SafeHtml.vue";
import { useAboutConfig } from "@/modules/about/composables/useAboutConfig";
import { ALLOWED_TAGS } from "@/utils/sanitizeHtml";

// 正文的渲染样式与 About 页面共用同一份非 scoped 的 about-bio.css，
// 这样预览与访客看到的完全一致。
import "@/views/about/about-bio.css";

// 读取由 useAboutConfig 自己负责，这里只消费结果
const { content, saving, loaded, save } = useAboutConfig();

// 表单改的是本地副本，提交时才把结果交出去
const form = reactive({
  avatarSrc: "",
  displayName: "",
  tagline: "",
  bioHtml: "",
  links: [],
  tags: [],
});

watch(
  () => content.value,
  (value) => {
    form.avatarSrc = value.avatarSrc || "";
    form.displayName = value.displayName || "";
    form.tagline = value.tagline || "";
    form.bioHtml = value.bioHtml || "";
    form.links = (value.links || []).map((link) => ({ ...link }));
    form.tags = [...(value.tags || [])];
  },
  { immediate: true },
);

// 提示与实际白名单同源，不会各写一份然后对不上
const allowedTagList = computed(() => [...ALLOWED_TAGS].join(" "));

// 中英文逗号都认，空白项丢掉
const tagsText = computed({
  get: () => form.tags.join(", "),
  set: (value) => {
    form.tags = value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
  },
});

const moveLink = (index, offset) => {
  const target = index + offset;
  if (target < 0 || target >= form.links.length) return;
  const [item] = form.links.splice(index, 1);
  form.links.splice(target, 0, item);
};

const submit = () => {
  save({
    avatarSrc: form.avatarSrc.trim(),
    displayName: form.displayName.trim(),
    tagline: form.tagline.trim(),
    bioHtml: form.bioHtml,
    // 名称和地址都为空的条目直接丢掉，避免往库里塞一堆空行；
    // 库里的旧条目可能缺字段，先补成空串再 trim，否则 trim 会抛错
    links: form.links
      .map((link) => ({ name: link.name || "", url: link.url || "" }))
      .filter((link) => link.name.trim() || link.url.trim())
      .map((link) => ({ name: link.name.trim(), url: link.url.trim() })),
    tags: form.tags,
  });
};
</script>

<style scoped>
.admin-section {
  margin: 50px 0;
  padding: 30px;
  background: rgba(5, 5, 20, 0.6);
  border: 1px solid #00ffff44;
  border-radius: 12px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar-preview {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid #00ffff66;
  flex-shrink: 0;
}

.bio-row {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.about-bio-input {
  flex: 1;
  min-height: 220px;
}

.bio-preview {
  flex: 1;
  min-height: 220px;
  max-height: 320px;
  overflow-y: auto;
  padding: 10px 14px;
  background: rgba(10, 0, 20, 0.6);
  border: 1px solid #00ffff33;
  border-radius: 8px;
}

.field-hint {
  margin: 8px 0 0;
  color: #7a7a95;
  font-size: 0.8rem;
  line-height: 1.6;
  word-break: break-word;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.link-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.link-name {
  flex: 0 0 140px;
}

.link-url {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .admin-section {
    margin: 30px 0;
    padding: 18px 14px;
  }

  .bio-row {
    flex-direction: column;
  }

  .bio-preview {
    max-height: 200px;
  }

  .link-item {
    flex-wrap: wrap;
  }

  .link-name,
  .link-url {
    flex: 1 1 100%;
  }
}
</style>
