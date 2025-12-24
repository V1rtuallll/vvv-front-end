// stores/auth.js ～你的月光用户守护者
import { defineStore } from 'pinia'
import request from '@/utils/request'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('v1rtual_token') || null,
    user: null // 完整用户信息：{ username, avatar, description, sex, ... }
  }),
  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    username: (state) => state.user?.username || '',
    avatar: (state) => state.user?.avatar || '/default-avatar.gif'
  },
  actions: {
    async login(token, username) {
      this.token = token
      localStorage.setItem('v1rtual_token', token)
      await this.fetchUserInfo() // 登录后立即拉完整信息
    },
    async fetchUserInfo() {
      try {
        const res = await request.get('/user/info')
        this.user = res.data.data
      } catch (e) {
        this.logout()
      }
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('v1rtual_token')
    }
  }
})