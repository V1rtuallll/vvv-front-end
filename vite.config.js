import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET

  return {
    plugins: [
      vue(),
      vueDevTools(),
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

    base: '',  // 打包时静态资源路径正确
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
