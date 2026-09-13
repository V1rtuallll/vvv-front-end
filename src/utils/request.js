import axios from 'axios'
import { useAuthStore } from '@/stores/auth'  // 保留导入

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 1000000
})

// 请求拦截器：自动携带 token（关键：在这里调用 store！）
request.interceptors.request.use(config => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// 后端没有给出 msg 时按状态码兜底，避免用户只看到一句无信息量的提示
const STATUS_MESSAGE = {
  400: '请求参数不合法',
  401: '登录已过期，请重新登录',
  403: '没有权限执行该操作',
  404: '请求的资源不存在',
  409: '数据已存在，无法重复写入',
  413: '上传文件超过大小限制',
  500: '服务器内部错误'
}

// 响应拦截器
request.interceptors.response.use(
  response => {
    const data = response.data
    if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'code') && data.code !== 200) {
      const error = new Error(data.msg || '请求失败')
      error.response = response
      error.isBusinessError = true
      return Promise.reject(error)
    }
    return data  // { code, msg, data }
  },
  error => {
    const authStore = useAuthStore()
    const status = error.response?.status

    if (status === 401) {
      authStore.logout()
    }

    // 后端错误契约保证 4xx/5xx 的 msg 里是真实原因，优先透传
    let msg = error.response?.data?.msg

    if (!msg) {
      if (STATUS_MESSAGE[status]) {
        msg = STATUS_MESSAGE[status]
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        msg = '请求超时，请稍后重试'
      } else if (!error.response) {
        msg = '网络错误，请稍后重试'
      } else {
        msg = '请求失败'
      }
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
