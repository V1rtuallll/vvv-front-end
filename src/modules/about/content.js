/** About 内容的空形状。页面据此判断每一块要不要渲染。 */
export const emptyAboutContent = () => ({
  avatarSrc: "",
  displayName: "",
  tagline: "",
  bioHtml: "",
  links: [],
  tags: [],
});

/**
 * 把后端返回值收拢成完整形状。
 * 后端返回 null 的列表在这里就退化成空数组，调用方不必再判空。
 */
export const normalizeAboutContent = (data) => {
  const source = data || {};
  return {
    ...emptyAboutContent(),
    ...source,
    links: source.links || [],
    tags: source.tags || [],
  };
};
