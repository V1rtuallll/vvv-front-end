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
      // 开启代理 让前端的所有/api请求，都转发到后端
      '/api': {
        target: 'http://127.0.0.1:8080', // 你的Spring Boot后端地址
        changeOrigin: true,             // 允许跨域
        secure: false,                  // 如果后端是http，不验证https
        // rewrite: (path) => path.replace(/^\/api/, '') // /api/xxx → /xxx 完美匹配后端路径
      }
    }
  },

  base: '',  // 打包时静态资源路径正确
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // @ 指向 src
    },
  },
})