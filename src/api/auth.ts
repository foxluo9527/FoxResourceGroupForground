import request from '@/utils/request'

export interface LoginData {
  username: string
  password: string
}

export interface LoginResult {
  code: number
  message: string
  data: {
    token: string
    user: {
      id: number
      username: string
      role: string
      email: string
    }
  }
  success: boolean
}

export const login = (data: LoginData) => {
  return request<LoginResult>({
    url: '/api/admin/auth/login',
    method: 'post',
    data
  })
}

export const logout = () => {
  return request({
    url: '/api/admin/auth/logout',
    method: 'post'
  })
}

export interface GrantAdminData {
  username: string
  password: string
  email: string
  phone: string
  role: 'admin'
}

export interface GrantAdminResult {
  code: number
  message: string
  data: string
  success: boolean
}

export const grantAdmin = (data: GrantAdminData) => {
  return request<GrantAdminResult>({
    url: '/api/admin/auth/grantAdmin',
    method: 'post',
    data
  })
} 