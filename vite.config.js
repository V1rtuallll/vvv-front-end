import fs from 'node:fs'

import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'

/**
 * 把 public/music/ 的曲库变成一个虚拟模块 `virtual:music-manifest`。
 *
 * 曲库原先是一份写死在 useAudioPlayer.js 里的数组 —— 往 public/music/ 丢新歌
 * 不生效，必须回来改代码。这里改成构建期扫目录，加歌只要放文件。
 *
 * ⚠️ 不要让插件往 public/ 里写 manifest.json 再让前端 fetch：
 * Vite 的 public 静态中间件在**服务启动时就快照了目录列表**，插件在启动之后
 * 写的文件它看不见，请求会落到 SPA 回退、返回 index.html，前端 res.json()
 * 直接抛错。虚拟模块走的是模块图，没有这个时序问题，也不用把清单塞进仓库。
 *
 * @returns {import('vite').Plugin}
 */
function musicManifest() {
  const virtualId = 'virtual:music-manifest'
  const resolvedId = `\0${virtualId}`
  const dir = path.resolve(__dirname, 'public/music')
  const exts = ['.mp3', '.flac', '.m4a', '.ogg', '.wav']

  const scan = () =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((name) => exts.includes(path.extname(name).toLowerCase()))
          .sort()
      : []

  return {
    name: 'music-manifest',
    resolveId: (id) => (id === virtualId ? resolvedId : null),
    load: (id) => (id === resolvedId ? `export default ${JSON.stringify(scan())}` : null),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET

  return {
    plugins: [
      vue(),
      vueDevTools(),
      musicManifest(),
    ],
    server: {
      port: Number(env.VITE_DEV_SERVER_PORT || 3001),
      host: '0.0.0.0',
      open: true, // 自动打开浏览器
      proxy: apiProxyTarget
        ? {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },

    // base 保持默认的 '/'，不要写成 '' —— 相对路径会生成 ./assets/…，
    // 在 /blog/detail/1 这类深层路由下被解析成 /blog/detail/assets/…，静态资源 404、整页白屏。
    // 首页与无尾斜杠的一级路由解析结果恰好正确，所以只有直接访问或刷新深层路由才会暴露。
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'), // @ 指向 src
      },
    },

    // Vitest 配置放在这里而不是单独的 vitest.config.js：
    // 本文件的 defineConfig 是「函数式」导出，mergeConfig 那种写法对它不可靠；
    // 放一起还能保证 @ 别名和插件只有一份定义。
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.{test,spec}.js'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{js,vue}'],
        exclude: ['src/main.js', 'src/test/**', 'src/**/*.test.js'],
      },
    },
  }
})
