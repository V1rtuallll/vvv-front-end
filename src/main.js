import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'
import App from './App.vue'
import router from "./router/index.js";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
// CRT 主题：全局引入一次。它原本只存在于 profile 的 scoped 样式里，
// 导致后台用到同名类却没有任何样式——详见该文件头部说明。
import '@/styles/crt-theme.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')

// 必须在 mount 之后调用。
// window.$vmessage 是 VMessage.vue 在 onMounted 里挂到 window 上的，而 VMessage 由 App.vue 渲染。
// 早于 mount 发起请求时，一旦失败，request.js 会因为取不到 window.$vmessage 而只打 console，
// 用户看不到任何提示。
const authStore = useAuthStore()
if (authStore.token) {
  authStore.fetchUserInfo() // 刷新页面时自动拉取用户信息
}
