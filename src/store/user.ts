import { defineStore } from 'pinia'
import { login, logout } from '@/api/auth'
import { removeToken, setToken, getToken } from '@/utils/auth'
import { wsService } from '@/utils/websocket'

interface UserInfo {
  token: string
  username: string
  role: string
  roleLabel: string
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    username: '',
    role: '',
    roleLabel: ''
  }),

  actions: {
    // 初始化用户状态
    initUserState() {
      const token = getToken()
      if (token) {
        const userInfo = localStorage.getItem('user_info')
        if (userInfo) {
          const { username, role, roleLabel } = JSON.parse(userInfo)
          this.token = token
          this.username = username
          this.role = role
          this.roleLabel = roleLabel
          // 只在没有连接时才连接 WebSocket
          if (!wsService.isConnected()) {
            wsService.connect(token)
          }
        }
      }
    },

    // 保存用户信息到本地存储
    saveUserInfo() {
      const userInfo: UserInfo = {
        token: this.token,
        username: this.username,
        role: this.role,
        roleLabel: this.roleLabel
      }
      localStorage.setItem('user_info', JSON.stringify(userInfo))
    },

    async login(username: string, password: string) {
      try {
        const res = await login({ username, password })

        if (res.success && res.data) {
          const { token, user } = res.data
          
          if (!token || !user) {
            return { 
              success: false, 
              message: '登录响应数据不完整' 
            }
          }

          this.token = token
          this.username = user.username
          this.role = (user.role || '').toLowerCase()
          this.roleLabel = this.getRoleLabel(user.role)
          setToken(token)
          this.saveUserInfo()
          wsService.connect(token)
          
          return { success: true }
        }
        return { success: false, message: res.message }
      } catch (error: any) {
        console.error('Login error:', error)
        return { 
          success: false, 
          message: error.message
        }
      }
    },

    getRoleLabel(role: string): string {
      if (!role) return '未知角色'
      
      const roleMap: Record<string, string> = {
        superadmin: '超级管理员',
        admin: '管理员',
        user: '普通用户'
      }
      return roleMap[role.toLowerCase()] || '未知角色'
    },

    async logout() {
      try {
        await logout()
      } finally {
        this.token = ''
        this.username = ''
        this.role = ''
        this.roleLabel = ''
        removeToken()
        localStorage.removeItem('user_info')  // 清除用户信息
        wsService.disconnect()  // 断开 WebSocket 连接
      }
    }
  },

  getters: {
    isSuperAdmin(): boolean {
      return (this.role || '').toLowerCase() === 'superadmin'
    },
    isAdmin(): boolean {
      return (this.role || '').toLowerCase() === 'admin'
    }
  }
}) 