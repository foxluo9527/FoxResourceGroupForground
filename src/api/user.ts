import request from '@/utils/request'

export interface User {
  id: number
  username: string
  nickname: string | null
  email: string
  phone: string | null
  avatar: string | null
  role: string
  status: string
  signature: string | null
  last_login: string | null
  created_at: string
  updated_at: string
  is_online: boolean
  connection_count: number
}

interface GetUsersParams {
  page?: number
  limit?: number
  keyword?: string
  role?: string
  status?: 'active' | 'inactive' | 'banned'
}

interface UserListResult {
  users: User[]
  total: number
  current: number
  pageSize: number
  totalPages: number
}

interface UserDetail extends User {
  active_connections: {
    connection_id: string
    client_info: {
      ip?: string
      userAgent?: string
      device?: string
      browser?: string
      os?: string
    }
  }[]
}

interface UpdateUserStatusData {
  status: 'active' | 'inactive' | 'banned'
}

// 获取用户列表
export const getUsers = (params?: GetUsersParams) => {
  return request<{
    code: number
    message: string
    data: UserListResult
    success: boolean
  }>({
    url: '/api/admin/users',
    method: 'get',
    params
  })
}

// 获取用户详情
export const getUserDetail = (id: number) => {
  return request<{
    code: number
    message: string
    data: UserDetail
    success: boolean
  }>({
    url: `/api/admin/users/${id}`,
    method: 'get'
  })
}

// 更新用户状态
export const updateUserStatus = (id: number, data: UpdateUserStatusData) => {
  return request<{
    code: number
    message: string
    success: boolean
  }>({
    url: `/api/admin/users/${id}/status`,
    method: 'put',
    data
  })
} 