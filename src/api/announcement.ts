import request from '@/utils/request'

export interface Announcement {
  id: number
  title: string
  content: string
  type: string
  status: string
  priority: number
  publish_time: string
  expire_time: string
  platforms: string[]
  target_users: string
  show_type: string
  creator_id: number
  views: number
  clicks: number
  created_at: string
  updated_at: string
  creator_username: string
  creator_nickname: string | null
}

export interface CreateAnnouncementData {
  title: string
  content: string
}

export interface UpdateAnnouncementData {
  title: string
  content: string
}

interface GetAnnouncementsParams {
  page?: number
  limit?: number
  status?: 'draft' | 'published' | 'expired'
  type?: string
  keyword?: string
}

interface AnnouncementListResult {
  announcements: Announcement[]
  total: number
  current: number
  pageSize: number
  totalPages: number
}

// 获取公告列表
export const getAnnouncements = (params?: any) => {
  return request<{
    code: number
    message: string
    data: AnnouncementListResult
    success: boolean
  }>({
    url: '/api/admin/announcements',
    method: 'get',
    params
  })
}

// 创建公告
export const createAnnouncement = (data: CreateAnnouncementData) => {
  return request<{
    code: number
    message: string
    data: Announcement
    success: boolean
  }>({
    url: '/api/admin/announcements',
    method: 'post',
    data
  })
}

// 更新公告
export const updateAnnouncement = (id: number, data: UpdateAnnouncementData) => {
  return request<{
    code: number
    message: string
    data: Announcement
    success: boolean
  }>({
    url: `/api/admin/announcements/${id}`,
    method: 'put',
    data
  })
}

// 删除公告
export const deleteAnnouncement = (id: number) => {
  return request<{
    code: number
    message: string
    success: boolean
  }>({
    url: `/api/admin/announcements/${id}`,
    method: 'delete'
  })
} 