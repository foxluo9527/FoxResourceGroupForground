import request from '@/utils/request'

export interface Log {
  id: number
  admin_id: number
  action: 'create' | 'delete' | 'update' | 'batch_operation'
  target: string
  target_id: string
  details: Record<string, any>
  ip: string
  user_agent: string
  created_at: string
  admin_username: string
  admin_nickname: string | null
  admin_avatar: string | null
}

interface GetLogsParams {
  page?: number
  limit?: number
  admin_id?: number
  action?: 'create' | 'delete' | 'update' | 'batch_operation'
  target?: string
  start_date?: string
  end_date?: string
}

interface LogListResult {
  logs: Log[]
  total: number
  current: number
  pageSize: number
  totalPages: number
}

// 获取日志列表
export const getLogs = (params?: GetLogsParams) => {
  return request<{
    code: number
    message: string
    data: LogListResult
    success: boolean
  }>({
    url: '/api/admin/logs',
    method: 'get',
    params
  })
} 