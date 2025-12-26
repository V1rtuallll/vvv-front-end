import { defineStore } from 'pinia'
import request from '@/utils/request'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null  // { username, avatar, description, sex, createTime, ... }
  }),
  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    username: (state) => state.user?.username || '',
    avatar: (state) => state.user?.avatar || '/default-avatar.gif'
  },
  actions: {
    async login(token, username) {
      this.token = token
      // 不需要手动 localStorage，插件会自动持久化整个 state
      await this.fetchUserInfo()  // 登录后立即拉取完整信息
    },
    async fetchUserInfo() {
      try {
        const res = await request.get('/user/info')

        // 严格判断后端是否成功
        if (res.code !== 200) {
          throw new Error(res.msg || "获取用户信息失败")
        }
        // 正确取出真正的用户对象
        this.user = res.data
        // 可选：调试用，正式版可删
        // console.log("🌙 月光花园完整绽放～user:", this.user)
      } catch (e) {
        window.$vmessage.error(e.message || "无法加载～先登出再试试？")
        this.logout()
      }
    },
    logout() {
      this.token = null
      this.user = null
      // 插件自动清 localStorage
    }
  },
  persist: true  // 关键！整个 store（token + user）都持久化～刷新不丢！
})