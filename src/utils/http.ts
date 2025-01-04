import axios from 'axios'
import { useUserStore } from '@/store/user'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
})

// 添加请求拦截器
http.interceptors.request.use(
  config => {
    // 在发送请求之前添加 token
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = userStore.token
    }
    console.log('发送请求:', config.url, config)
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 添加响应拦截器
http.interceptors.response.use(
  response => {
    console.log('收到响应:', response.config.url, response.data)
    return response
  },
  error => {
    console.error('请求错误:', error.response?.data || error.message)
    return Promise.reject(error)
  }
) 