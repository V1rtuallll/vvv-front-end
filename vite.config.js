import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    port: 3001,
    host: '0.0.0.0',
    open: true, // 自动打开浏览器
    proxy: {
      // '/api': {   不急
      //   target: 'http://127.0.0.1:8080',
      //   changeOrigin: true, // 允许跨域
      //   secure: false, // 允许https
      //   rewrite: (path) => path.replace(/^\/api/, '') // 重写路径
      // }
    }
  },

  // base: '',  // 解决打包后静态资源路径问题
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // 配置 @ 符号指向 src 目录
    },
  },
})
