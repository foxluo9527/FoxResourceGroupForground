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
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export const getPosts = (params?: GetPostsParams) => {
  return request<{
    code: number
    message: string
    data: PostListResult
    success: boolean
  }>({
    url: '/api/admin/posts',
    method: 'get',
    params
  })
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