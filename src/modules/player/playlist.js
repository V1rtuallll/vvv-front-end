// eslint-disable-next-line import/no-unresolved -- 由 vite.config.js 的 musicManifest 插件提供
import manifest from "virtual:music-manifest";

/**
 * 构建期扫 public/music 得到的清单。虚拟模块只在这一层露面，
 * 其余地方都从 buildTimeTracks 拿 —— 测试里 vi.mock 一个虚拟模块 id 不可靠，
 * 包成普通模块才拦得住。
 */
export const buildTimeTracks = Array.isArray(manifest) ? manifest : [];

/**
 * 把后端配置的曲目表收敛成实际能播的那一份。
 *
 * **只做减法**：配置里没有的不加（配置严格决定放什么），配置里有但文件已经不在
 * 目录里的丢掉（那是一首永远不响的死曲目）。两边顺序都以配置为准。
 */
export function playableTracks(configured, available = buildTimeTracks) {
  const pool = Array.isArray(available) ? available : [];
  return (Array.isArray(configured) ? configured : []).filter((name) => pool.includes(name));
}
