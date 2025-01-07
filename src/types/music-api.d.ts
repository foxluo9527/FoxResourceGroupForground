declare module '@suen/music-api' {
  export type Vendor = 'netease' | 'qq' | 'xiami'

  export enum BR {
    normal = 128,
    high = 320,
    max = 999
  }

  export type SearchType = 'song'

  export interface Artist {
    id: number
    name: string
  }

  export interface Album {
    id: number
    name: string
    cover: string
  }

  export interface SongInfo {
    songId: number
    name: string
    album: Album
    artists: Artist[]
    cp: boolean
    maxbr: BR
    mv: number | string | null
    vendor: Vendor
    previewLoading?: boolean
  }

  export interface SearchParams {
    keyword: string
    limit: number
    page: number
    type: SearchType
  }

  export interface SearchResult {
    total: number
    songs: SongInfo[]
  }

  export default class MusicApi {
    static search(params: SearchParams): Promise<SearchResult>
    static getSongDetail(ids: number[]): Promise<SongInfo>
    static getSongUrl(id: number, br: BR): Promise<string>
  }
} 