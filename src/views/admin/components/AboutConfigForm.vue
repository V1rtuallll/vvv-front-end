<template>
  <section class="admin-section">
    <h3 class="section-title">About 页面配置</h3>

    <div class="field-group">
      <label>一句话签名</label>
      <input v-model="form.tagline" class="crt-input about-tagline-input" maxlength="255" />
    </div>

    <div class="field-group">
      <label>正文</label>
      <div class="bio-row">
        <textarea v-model="form.bioHtml" class="crt-textarea about-bio-input"></textarea>
        <div class="bio-preview preview-frame">
          <AboutContent :content="previewContent" />
        </div>
      </div>
      <p class="field-hint">放行的标签：{{ allowedTagList }}</p>
    </div>

    <div class="field-group">
      <label>链接</label>
      <ul class="link-list">
        <li v-for="(link, index) in form.links" :key="index" class="link-item">
          <input v-model="link.name" class="crt-input link-name" placeholder="名称" />
          <input v-model="link.icon" class="crt-input link-icon about-link-icon-input" placeholder="图标 URL（可选）" />
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

import { useAboutConfig } from "@/modules/about/composables/useAboutConfig";
import { ALLOWED_TAGS } from "@/utils/sanitizeHtml";
import AboutContent from "@/views/about/components/AboutContent.vue";

// 读取由 useAboutConfig 自己负责，这里只消费结果
const { content, saving, loaded, save } = useAboutConfig();

// 表单改的是本地副本，提交时才把结果交出去。
// 头像与昵称不在这里 —— 它们来自站点账号，表单不编辑，只在预览里显示。
const form = reactive({
  tagline: "",
  bioHtml: "",
  links: [],
  tags: [],
});

watch(
  () => content.value,
  (value) => {
    form.tagline = value.tagline || "";
    form.bioHtml = value.bioHtml || "";
    form.links = (value.links || []).map((link) => ({ ...link }));
    form.tags = [...(value.tags || [])];
  },
  { immediate: true },
);

// 保存与预览共用同一条链接整理规则：库里的旧条目可能缺字段，先补成空串再 trim，
// 否则 trim 会抛错；名称和地址都为空的条目丢掉，避免往库里塞一堆空行。
// 预览因此与保存结果一致，不会显示保存时会被丢掉的行。
const normalizedLinks = (links) => links
  .map((link) => ({ name: link.name || "", url: link.url || "", icon: link.icon || "" }))
  .filter((link) => link.name.trim() || link.url.trim())
  .map((link) => ({ name: link.name.trim(), url: link.url.trim(), icon: link.icon.trim() }));

// 预览用与 About 页面同一个组件，作者看到的就是访客看到的。
// 正文、签名、链接与标签取表单里的当前值，身份两项取加载回来的值。
const previewContent = computed(() => ({
  avatarSrc: content.value.avatarSrc,
  displayName: content.value.displayName,
  tagline: form.tagline,
  bioHtml: form.bioHtml,
  links: normalizedLinks(form.links),
  tags: form.tags,
}));

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
    tagline: form.tagline.trim(),
    bioHtml: form.bioHtml,
    links: normalizedLinks(form.links),
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
}

/* 预览面板模仿站点的 .vf-main，让作者看到的面板与访客看到的一致 */
.preview-frame {
  background: rgba(10, 0, 20, 0.85);
  border-radius: 20px;
  padding: 24px;
  max-height: 420px;
  overflow-y: auto;
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

.link-icon {
  flex: 0 0 160px;
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

  .preview-frame {
    padding: 16px;
  }

  .link-item {
    flex-wrap: wrap;
  }

  .link-name,
  .link-icon,
  .link-url {
    flex: 1 1 100%;
  }
}
</style>
