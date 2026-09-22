/**
 * 文件名 → 显示名。
 *
 * 曲库现在 mp3 与 flac 混着，扩展名要整段去掉，不能只 replace(".mp3")。
 * 「艺人 - 标题」取后半段；没有这个分隔符时把下划线换成空格。
 *
 * 播放器与画廊的选曲面板共用这一份 —— 两边各写一份的话，
 * 同一首歌在两个地方会显示成两个名字。
 */
export function formatTrackName(filename) {
  const name = String(filename ?? "").replace(/\.[^.]+$/, "");
  const dashIndex = name.lastIndexOf(" - ");
  return dashIndex !== -1 ? name.substring(dashIndex + 3).trim() : name.replace(/_/g, " ").trim();
}
