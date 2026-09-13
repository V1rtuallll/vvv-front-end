import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'
import App from './App.vue'
import router from "./router/index.js";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

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
