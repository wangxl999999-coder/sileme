import { defineStore } from 'pinia'
import request from '../utils/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: JSON.parse(localStorage.getItem('userInfo') || 'null')
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.userInfo?.isAdmin || false
  },

  actions: {
    async login(phone, password) {
      const data = await request.post('/auth/login', { phone, password })
      
      this.token = data.token
      this.userInfo = data.user
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('userInfo', JSON.stringify(data.user))
      
      return data
    },

    async getCurrentUser() {
      const data = await request.get('/auth/me')
      this.userInfo = data.user
      localStorage.setItem('userInfo', JSON.stringify(data.user))
      return data.user
    },

    logout() {
      this.token = ''
      this.userInfo = null
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
  }
})
