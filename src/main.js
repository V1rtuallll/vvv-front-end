import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'
import App from './App.vue'
import router from "./router/index.js";
// import {createPinia} from "pinia"

const app = createApp(App)

app.use(createPinia())
app.use(router)
// main.js 或 App.vue onMounted
const authStore = useAuthStore()
if (authStore.token) {
  authStore.fetchUserInfo() // 刷新页面时自动拉取用户信息
}


app.mount('#app')
