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
      const wsUrl = `${import.meta.env.VITE_WS_URL}?token=${cleanToken}`
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (this.notificationBanner) {
            this.notificationBanner.showNotification(data)
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        this.isConnecting = false
        
        if (!this.forceDisconnected && !event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++
            this.connect(token)
          }, this.reconnectDelay)
        }
      }

      this.ws.onerror = (error) => {
        this.isConnecting = false
      }
    } catch (error) {
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