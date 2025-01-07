import request from '@/utils/request'
import type { SearchResult, SongInfo } from '@/types/music-api'

// 搜索音乐
export const searchMusic = (params: {
  keyword: string
  limit: number
  page: number
  vendor: string
  type?: string
}) => {
  return request<{
    code: number
    message: string
    data: {
      list: SongInfo[]
      total: number
      current: number
      pageSize: number
    }
    success: boolean
  }>({
    url: '/api/admin/music/search',
    method: 'get',
    params: {
      ...params,
      type: 'song'
    }
  })
}

// 获取音乐播放链接
export const getMusicUrl = (params: {
  id: number
  vendor: string
  br: number
}) => {
  return request<{
    code: number
    message: string
    data: {
      url: string
    }
    success: boolean
  }>({
    url: '/api/admin/music/url',
    method: 'get',
    params
  })
}

// 获取音乐详情
export const getMusicDetail = (params: {
  id: number
  vendor: string
}) => {
  return request<{
    code: number
    message: string
    data: SongInfo
    success: boolean
  }>({
    url: '/api/admin/music/detail',
    method: 'get',
    params
  })
} 