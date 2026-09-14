<template>
  <header class="about-identity">
    <img
      v-if="content.avatarSrc"
      :src="content.avatarSrc"
      :alt="content.displayName || '头像'"
      class="about-avatar"
    />
    <div class="about-identity-text">
      <h1 v-if="content.displayName" class="about-name">{{ content.displayName }}</h1>
      <p v-if="content.tagline" class="about-tagline">{{ content.tagline }}</p>
    </div>
  </header>

  <p v-if="isEmpty" class="about-empty">这里还没有内容</p>

  <template v-else>
    <SafeHtml v-if="content.bioHtml" class="about-bio" :html="content.bioHtml" />

    <ul v-if="content.tags.length" class="about-tags">
      <li v-for="tag in content.tags" :key="tag" class="about-tag">{{ tag }}</li>
    </ul>

    <ul v-if="content.links.length" class="about-links">
      <li v-for="link in content.links" :key="link.url || link.name">
        <a class="about-link" :href="link.url" target="_blank" rel="noopener noreferrer">
          <img v-if="link.icon" class="about-link-icon" :src="link.icon" alt="" />
          » {{ link.name }} ↗
        </a>
      </li>
    </ul>
  </template>
</template>

<script setup>
import { computed } from "vue";

import SafeHtml from "@/components/SafeHtml.vue";

// 正文的样式不放在 scoped 块里：scoped 的样式靠 data 属性生效，
// 而 SafeHtml 注入的正文拿不到那个属性，规则对它完全无效。
// 后台预览要和这里长得完全一致，所以两边共用同一份 about-bio.css。
import "@/views/about/about-bio.css";

const props = defineProps({
  content: { type: Object, required: true },
});

// 身份区来自站点账号，任何情况下都渲染，不参与空态判定；
// 占位替换的是正文、标签、链接这三块，但判定看四个字段 —— 签名也算内容：
// 签名在身份区里，非空时页面已经有可看的内容，此时不出现占位。
const isEmpty = computed(() =>
  !props.content.bioHtml
  && props.content.tags.length === 0
  && props.content.links.length === 0
  && !props.content.tagline);
</script>

<style scoped>
.about-identity {
  display: flex;
  align-items: center;
  gap: 32px;
  padding-bottom: 28px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.18);
}

.about-avatar {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid rgba(0, 255, 255, 0.55);
  box-shadow:
    0 0 20px rgba(0, 255, 255, 0.4),
    0 0 40px rgba(255, 0, 255, 0.25);
  flex-shrink: 0;
}

.about-identity-text {
  min-width: 0;
}

.about-name {
  margin: 0 0 10px;
  font-family: "Monoton", "Orbitron", cursive;
  font-size: 2.2rem;
  font-weight: normal;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #ff00ff, #00ffff, #ff69b4, #ff00ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.about-tagline {
  margin: 0;
  color: #00ffff;
  font-family: "Rajdhani", "Courier New", monospace;
  font-size: 1.05rem;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.about-tagline::before {
  content: "▸ ";
  color: #ff69b4;
}

.about-empty {
  margin: 40px 0;
  color: #8a8aa0;
  font-family: "Rajdhani", "Courier New", monospace;
  text-align: center;
}

.about-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.about-tag {
  padding: 4px 14px;
  color: #00ffff;
  font-family: "Rajdhani", "Courier New", monospace;
  font-size: 0.85rem;
  border: 1px solid rgba(0, 255, 255, 0.35);
  border-radius: 999px;
  background: rgba(0, 255, 255, 0.06);
}

.about-links {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.about-link {
  color: #ff69b4;
  font-family: "Rajdhani", "Courier New", monospace;
  text-decoration: none;
  transition: color 0.2s ease, text-shadow 0.2s ease;
}

.about-link-icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  vertical-align: middle;
  object-fit: contain;
}

.about-link:hover {
  color: #00ffff;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.7);
}

@media (max-width: 768px) {
  .about-identity {
    flex-direction: column;
    align-items: center;
    gap: 18px;
    text-align: center;
  }

  .about-avatar {
    width: 110px;
    height: 110px;
  }

  .about-name {
    font-size: 1.6rem;
  }

  .about-tags,
  .about-links {
    justify-content: center;
  }
}
</style>
