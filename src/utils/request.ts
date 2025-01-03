import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { message } from 'ant-design-vue'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/store/user'
import router from '@/router'

interface Response<T = any> {
  code: number
  message: string
  data: T
  success: boolean
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 5000
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