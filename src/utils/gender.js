/**
 * 性别的显示文案。
 *
 * 抽到 utils 里是因为两个地方要用：profile 页的表单回显、侧栏 ID 卡。
 * 写在任一个 composable 里，另一个就得复制一遍，改一处漏一处。
 *
 * 后端下发的是 "MALE" / "FEMALE" / "SECRET"，但历史数据里出现过
 * 单字母和大小写不一的情况，所以统一转小写再比。
 */
export function displayGender(sex) {
  const value = sex?.toString().toLowerCase().trim();
  if (["male", "m"].includes(value)) return "男";
  if (["female", "f"].includes(value)) return "女";
  if (["other", "secret", "s"].includes(value)) return "其他/秘密";
  return "未设置";
}
