import { defineStore } from 'pinia'
import { login, logout } from '@/api/auth'
import { message } from 'ant-design-vue'

interface UserState {
  token: string | null
  username: string | null
  role: string | null
  email: string | null
  id: number | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
    role: localStorage.getItem('role'),
    email: localStorage.getItem('email'),
    id: Number(localStorage.getItem('id')) || null
  }),
  
  getters: {
    roleLabel(): string {
      switch (this.role) {
        case 'admin':
          return '管理员'
        case 'superadmin':
          return '超级管理员'
        default:
          return this.role || ''
      }
    }
  },
  
  actions: {
    async login(username: string, password: string) {
      try {
        const res = await login({ username, password })
        if (res.success) {
          this.token = res.data.token
          this.username = res.data.user.username
          this.role = res.data.user.role
          this.email = res.data.user.email
          this.id = res.data.user.id

          localStorage.setItem('token', res.data.token)
          localStorage.setItem('username', res.data.user.username)
          localStorage.setItem('role', res.data.user.role)
          localStorage.setItem('email', res.data.user.email)
          localStorage.setItem('id', String(res.data.user.id))

          message.success(res.message || '登录成功')
          return true
        }
        return false
      } catch (error) {
        message.error('登录失败')
        return false
      }
    },
    
    async logout() {
      try {
        await logout()
        this.clearUserInfo()
      } catch (error) {
        message.error('退出失败')
      }
    },

    clearUserInfo() {
      this.token = null
      this.username = null
      this.role = null
      this.email = null
      this.id = null
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('role')
      localStorage.removeItem('email')
      localStorage.removeItem('id')
    }
  }
}) 