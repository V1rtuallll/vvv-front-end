/**
 * 链接主机名到品牌图标的映射。
 *
 * 键是裸主机名，值对应 public/icons/ 下的文件名（不带扩展名）。
 * 这里只登记实际存在的图标，没有对应文件的站点不要凭空加进来。
 */
const HOST_ICONS = {
  "github.com": "github",
  "bilibili.com": "bilibili",
  "b23.tv": "bilibili",
  "weibo.com": "weibo",
  "weibo.cn": "weibo",
  "zhihu.com": "zhihu",
  "x.com": "x",
  "twitter.com": "x",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "t.me": "telegram",
  "telegram.org": "telegram",
  "discord.com": "discord",
  "discord.gg": "discord",
  "steamcommunity.com": "steam",
  "store.steampowered.com": "steam",
  "pixiv.net": "pixiv",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "douyin.com": "tiktok",
  "tiktok.com": "tiktok",
  "qq.com": "tencentqq",
  "music.163.com": "neteasecloudmusic",
};

/**
 * 逐级去掉主机名的前缀标签再查表，所以裸域名与任意层级的子域名都能命中：
 * github.com、www.github.com、gist.github.com 都归到 github。
 * 去掉标签是整段去掉，github.com.evil.com 这类拼接域名不会误判。
 */
const iconSlugForHost = (hostname) => {
  const labels = hostname.split(".");
  for (let start = 0; start < labels.length; start += 1) {
    const slug = HOST_ICONS[labels.slice(start).join(".")];
    if (slug) return slug;
  }
  return "";
};

/**
 * 按链接地址推断品牌图标路径，识别不出来时返回空串。
 *
 * 只处理 http/https 与 mailto:。站内相对路径（/gallery）没有主机名，
 * 解析会直接失败，这里不做任何猜测。
 * 不使用 window，便于在测试环境直接调用。
 */
export const brandIconFor = (url) => {
  if (typeof url !== "string" || !url) return "";

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }

  if (parsed.protocol === "mailto:") return "/icons/mail.svg";
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";

  const slug = iconSlugForHost(parsed.hostname);
  return slug ? `/icons/${slug}.svg` : "";
};
