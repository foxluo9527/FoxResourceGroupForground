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
  description: string
  url: string
  cover_image: string
  genre: string
  language: string
  lyrics: string
  lyrics_type: string
  track_number: number
  disc_number: number
  duration: number
  play_count: number
  like_count: number
  comment_count: number
  collection_count: number
  is_explicit: number
  is_featured: number
  created_by: number
  created_at: string
  updated_at: string
  tags: Tag[]
  artists: Artist[]
  albums: Album[]
}

export interface MusicListResponse {
  list: Music[]
  current: number
  size: number
  total: number
} 