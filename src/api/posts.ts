import { service } from '@/utils/request'
import request from '@/utils/request'

interface GetPostsParams {
  page?: number
  limit?: number
  keyword?: string
  author_id?: number
}

interface Post {
  id: number
  title: string
  content: string
  author_id: number
  view_count: number
  like_count: number
  collection_count: number
  comment_count: number
  is_pinned: number
  is_featured: number
  created_at: string
  updated_at: string
  author_name: string
  author_avatar: string
  tags: string[]
}

interface PostListResult {
  list: Post[]
  total: number
  current: number
  pageSize: number
}

export const getPosts = (params?: GetPostsParams) => {
  return service.get<{
    code: number
    message: string
    data: PostListResult
    success: boolean
  }>('/api/admin/posts', { params })
}

export interface PostDetail {
  id: number
  title: string
  content: string
  author_id: number
  view_count: number
  like_count: number
  collection_count: number
  comment_count: number
  is_pinned: number
  is_featured: number
  created_at: string
  updated_at: string
  author_name: string
  author_avatar: string
  tags: string[]
  comments: any[]
}

// 获取帖子详情
export const getPostDetail = (id: number) => {
  return request<{
    code: number
    message: string
    data: PostDetail
    success: boolean
  }>({
    url: `/api/admin/posts/${id}`,
    method: 'get'
  })
}

// 删除帖子
export const deletePost = (id: number) => {
  return request<{
    code: number
    message: string
    success: boolean
  }>({
    url: `/api/admin/posts/${id}`,
    method: 'delete'
  })
}

// 更新评论接口类型定义
export interface PostReply {
  id: number
  post_id: number
  user_id: number
  content: string
  parent_id: number
  like_count: number
  created_at: string
  updated_at: string
  author_name: string
  author_avatar: string
  parent_author_name: string
  images: string[]
}

export interface PostComment {
  id: number
  post_id: number
  user_id: number
  content: string
  parent_id: number | null
  like_count: number
  created_at: string
  updated_at: string
  author_name: string
  author_avatar: string
  images: string[]
  reply_count: number
  replies: PostReply[]
}

// 获取帖子评论
export const getPostComments = (postId: number, params?: { page?: number; limit?: number }) => {
  return request<{
    code: number
    message: string
    data: {
      list: PostComment[]
      pagination: {
        total: number
        page: number
        limit: number
        pages: number
      }
    }
    success: boolean
  }>({
    url: `/api/posts/${postId}/comments`,
    method: 'get',
    params
  })
}

// 获取评论回复
export const getReplies = (commentId: number, params?: { page?: number; limit?: number }) => {
  return request<{
    code: number
    message: string
    data: {
      list: PostReply[]
      pagination: {
        total: number
        page: number
        limit: number
        pages: number
      }
    }
    success: boolean
  }>({
    url: `/api/posts/comments/${commentId}/replies`,
    method: 'get',
    params
  })
}

// 获取帖子评论详情
export const getPostCommentDetail = async (id: number) => {
  try {
    const detailResponse = await service.get(`/api/admin/posts/comments/${id}`)
    
    if (detailResponse.data.success) {
      const rawComment = detailResponse.data.data.comment
      
      // 转换评论数据结构，使用实际返回的字段
      const commentData = {
        id: rawComment.id,
        content: rawComment.content,
        author_name: rawComment.author_name,
        author_avatar: rawComment.author_avatar, // 处理头像 URL
        like_count: rawComment.like_count,
        created_at: rawComment.created_at,
        reply_count: rawComment.reply_count || 0,
        post_id: rawComment.post_id,
        parent_id: rawComment.parent_id,
        images: rawComment.images || [] // 处理图片 URL 数组
      }
      
      // 如果有回复，获取回复列表
      if (commentData.reply_count > 0) {
        try {
          const repliesResponse = await service.get(`/api/posts/comments/${id}/replies`, {
            params: {
              page: 1,
              limit: commentData.reply_count
            }
          })
          
          if (repliesResponse.data.success) {
            const items = repliesResponse.data.data.list || []
            
            // 将回复列表添加到评论数据中
            commentData.replies = items.map(reply => ({
              id: reply.id,
              content: reply.content,
              author_name: reply.author_name,
              author_avatar: reply.author_avatar, // 处理回复作者头像
              like_count: reply.like_count,
              created_at: reply.created_at,
              parent_author_name: reply.parent_author_name,
              images: reply.images || [] // 处理回复图片
            }))
          }
        } catch (error) {
          console.error('获取回复列表失败:', error)
          commentData.replies = []
        }
      } else {
        commentData.replies = []
      }
      
      return {
        data: {
          success: true,
          data: commentData
        }
      }
    }
    
    return detailResponse
  } catch (error) {
    console.error('获取评论详情失败:', error)
    throw error
  }
} 