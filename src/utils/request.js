import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api', // Vite代理已处理
  timeout: 10000
})

// 请求拦截器：每次携带token
request.interceptors.request.use(config => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// 响应拦截器：token失效提示
request.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      ElMessage.warning('登录已过期哦～')
    }
    return Promise.reject(error)
  }
)

export default request