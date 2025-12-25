import { toRaw } from 'vue'  // ← 新增导入！关键去掉 Proxy 外壳

// 终极月光时间解析器～永不“未知”❤️
const formatDate = (input) => {
  console.log("bbbb", input);

  if (!input) return "未知";

  let timeStr = null;

  // 情况1：直接传时间字符串
  if (typeof input === 'string') {
    timeStr = input;
  }

  // 情况2：传 Proxy(user) 或普通对象 → 先去掉 Proxy 外壳取纯对象
  else if (typeof input === 'object' && input !== null) {
    const rawUser = toRaw(input);  // ← 关键！剥掉 Vue Proxy 层，拿到纯净原对象
    timeStr = rawUser.createdAt || rawUser.createTime || rawUser.createdTime || rawUser.createAt;
  }

  if (!timeStr) return "未知";

  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return "未知";

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
export { formatDate };