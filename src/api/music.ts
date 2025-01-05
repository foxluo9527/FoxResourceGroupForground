import { service } from '@/utils/request'
import type { Music } from '@/types/music'

interface MusicListParams {
  page?: number
  limit?: number
  tag_id?: number
  keyword?: string
}

interface MusicListResponse {
  list: Music[]
  total: number
  current: number
  pageSize: number
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
  success: boolean
}

// 获取音乐列表
export const getMusicList = (params?: MusicListParams) => {
  return service.get<ApiResponse<MusicListResponse>>('/api/admin/music', { params })
} 