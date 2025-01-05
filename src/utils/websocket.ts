import { useUserStore } from '@/store/user'
import { ref } from 'vue'

interface Notification {
  id: number
  user_id: number
  type: string
  title: string
  content: string
  target_type: string | null
  target_id: number | null
  is_read: number
  is_pushed: number
  created_at: string
  updated_at: string
}

interface WSMessage {
  type: string
  data: Notification
}

class WebSocketService {
  private ws: WebSocket | null = null
  private notificationBanner: any = null
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 3000
  private isConnecting = false
  private forceDisconnected = false

  setNotificationBanner(banner: any) {
    this.notificationBanner = banner
  }

  connect(token: string) {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.isConnecting) {
      return
    }

    this.forceDisconnected = false
    this.isConnecting = true

    try {
      const cleanToken = token.replace('Bearer ', '')
      console.log('Token:', cleanToken.substring(0, 20) + '...')
      const wsUrl = `ws://${window.location.hostname}:9000/ws?token=${cleanToken}`
      console.log('尝试连接 WebSocket:', wsUrl)
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket 连接成功')
        this.isConnecting = false
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        console.log('收到WebSocket消息:', event.data)
        try {
          const data = JSON.parse(event.data)
          console.log('解析后的消息:', data)
          if (this.notificationBanner) {
            this.notificationBanner.showNotification(data)
          }
        } catch (error) {
          console.error('消息解析失败:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket 连接关闭, code:', event.code, 'reason:', event.reason || '无原因')
        this.isConnecting = false
        
        if (!this.forceDisconnected && !event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`尝试第 ${this.reconnectAttempts + 1} 次重连...`)
          setTimeout(() => {
            this.reconnectAttempts++
            this.connect(token)
          }, this.reconnectDelay)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        this.isConnecting = false
      }
    } catch (error) {
      console.error('创建 WebSocket 实例失败:', error)
      this.isConnecting = false
    }
  }

  disconnect() {
    this.forceDisconnected = true
    if (this.ws) {
      this.ws.close(1000, 'User logout')
      this.ws = null
    }
    this.isConnecting = false
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService() 