export interface Artist {
  id: number
  name: string
  alias: string | null
}

export interface Album {
  id: number
  title: string
  cover_image: string
  disc_number: number
  track_number: number
}

export interface Tag {
  id: number
  name: string
  type: string
  category: string
}

export interface Music {
  id: number
  title: string
  description?: string
  url: string
  cover_image: string
  genre: string
  language: string
  lyrics?: string
  lyrics_type: string
  duration: number
  artist?: {
    id: number
    name: string
    alias: string
  }
  albums?: Array<{
    id: number
    title: string
    cover_image: string
    disc_number: number
    track_count: number
  }>
  created_at: string
  updated_at: string
}

export interface MusicListResponse {
  list: Music[]
  current: number
  size: number
  total: number
} 