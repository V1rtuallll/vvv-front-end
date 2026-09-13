const UNITS = ["B", "KB", "MB", "GB", "TB"];

/**
 * 把字节数格式化成人类可读的大小，用于提示后端配置的上传上限。
 * 传入非法值或非正数时返回空串，调用方据此决定要不要展示。
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${Math.round(value * 100) / 100} ${UNITS[unit]}`;
}
