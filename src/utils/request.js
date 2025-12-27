import axios from 'axios'
import { useAuthStore } from '@/stores/auth'  // 保留导入

const request = axios.create({
  baseURL: '/api', // Vite代理已处理，前端调用 /user/xxx
  timeout: 10000
})

// 请求拦截器：自动携带 token（关键：在这里调用 store！）
request.interceptors.request.use(config => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response.data  // { code, msg, data }
  },
  error => {
    const authStore = useAuthStore()
    let msg = "网络错误～再试一次好吗？"

    if (error.response?.data?.msg) {
      msg = error.response.data.msg
    } else if (error.response?.status === 401) {
      authStore.logout()
      msg = "登录已过期啦～"
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      msg = "请求超时了～✨"
    } else if (!error.response) {
      msg = "网络开小差了？"
    }

    if (window.$vmessage) {
      window.$vmessage.error(msg)
    } else {
      console.error('[Request Error]', msg)
    }

    return Promise.reject(error)
  }
)

export default request