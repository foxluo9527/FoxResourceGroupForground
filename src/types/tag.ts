export interface Tag {
  id: number
  name: string
  type: string
  category: string
  description: string | null
  count: number
  order_num: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface TagListResponse {
  items: Tag[]
  total: number
  page: number
  pageSize: number
} 