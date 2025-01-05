import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { message } from 'ant-design-vue'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/user'
import router from '@/router'
import { getFullUrl, getBaseUrl } from '@/utils/url'

interface Response<T = any> {
  code: number
  message: string
  data: T
  success: boolean
}

export const service: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 5000,
  transformResponse: [
    ...(axios.defaults.transformResponse as any[]),
    (data) => {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data

      // 处理单个对象的资源 URL
      const processResourceUrls = (obj: any) => {
        try {
          // 如果是上传接口的返回数据（具有特定的数据结构），直接返回
          if (obj.url && obj.filename && obj.size) {
            return obj
          }

          // 处理封面图
          if (obj.cover_image && !obj.cover_image.startsWith('http')) {
            obj.cover_image = getFullUrl(obj.cover_image)
          }
          // 处理音频文件
          if (obj.url && !obj.url.startsWith('http')) {
            obj.url = getFullUrl(obj.url)
          }
          // 处理头像
          if (obj.avatar && !obj.avatar.startsWith('http')) {
            obj.avatar = getFullUrl(obj.avatar)
          }
          // 处理图片数组
          if (Array.isArray(obj.images)) {
            obj.images = obj.images.map((img: any) => {
              if (typeof img === 'string') {
                return !img.startsWith('http') ? getFullUrl(img) : img
              }
              if (img && typeof img === 'object' && img.url) {
                return {
                  ...img,
                  url: !img.url.startsWith('http') ? getFullUrl(img.url) : img.url
                }
              }
              return img
            })
          }
          // 处理专辑中的音轨
          if (Array.isArray(obj.tracks)) {
            obj.tracks = obj.tracks.map((track: any) => {
              const processedTrack = { ...track }
              if (track.cover_image && !track.cover_image.startsWith('http')) {
                processedTrack.cover_image = getFullUrl(track.cover_image)
              }
              if (track.url && !track.url.startsWith('http')) {
                processedTrack.url = getFullUrl(track.url)
              }
              return processedTrack
            })
          }
          // 处理艺人信息
          if (obj.artist) {
            const processedArtist = { ...obj.artist }
            if (processedArtist.avatar && !processedArtist.avatar.startsWith('http')) {
              processedArtist.avatar = getFullUrl(processedArtist.avatar)
            }
            if (processedArtist.cover_image && !processedArtist.cover_image.startsWith('http')) {
              processedArtist.cover_image = getFullUrl(processedArtist.cover_image)
            }
            obj.artist = processedArtist
          }
        } catch (error) {
          console.error('处理资源URL时出错:', error)
        }
        return obj
      }

      // 处理列表数据
      if (parsed.success && parsed.data?.list) {
        parsed.data.list = parsed.data.list.map((item: any) => processResourceUrls(item))
      }
      
      // 处理单个对象数据
      if (parsed.success && parsed.data && !Array.isArray(parsed.data)) {
        parsed.data = processResourceUrls(parsed.data)
      }
      
      return parsed
    }
  ]
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token && config.headers) {
      // 检查 token 是否已经包含 Bearer 前缀
      const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
      config.headers.Authorization = finalToken
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<Response>) => {
    return response.data
  },
  (error) => {
    // 处理 401 响应状态码，但避免在 logout 接口调用时处理
    if (error.response?.status === 401 && !error.config.url.includes('/logout')) {
      const userStore = useUserStore()
      userStore.logout()  // 清除用户信息
      router.push('/login')  // 跳转到登录页
    }
    console.error('请求错误:', error.response?.data || error.message)

    if (error.response?.data) {
      return Promise.reject(error.response.data)
    }
    return Promise.reject({
      code: 500,
      message: '网络错误，请稍后重试',
      data: null,
      success: false
    })
  }
)

export default service