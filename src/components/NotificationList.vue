<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { http } from '@/utils/http'
import { message } from 'ant-design-vue'

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

interface ApiResponse {
  code: number
  message: string
  data: {
    notifications: Notification[]
    total: number
    current: number
    pageSize: number
    totalPages: number
  }
  success: boolean
}

const notifications = ref<Notification[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(5)
const total = ref(0)
const unreadCount = ref(0)

const emit = defineEmits(['update:unread-count'])

// 获取未读通知数
const fetchUnreadCount = async () => {
  try {
    const response = await http.get('/api/notifications/unread')
    if (response.data.success) {
      unreadCount.value = response.data.data.count
      emit('update:unread-count', unreadCount.value)
    }
  } catch (error) {
    console.error('获取未读数失败:', error)
  }
}

const fetchNotifications = async () => {
  loading.value = true
  try {
    const response = await http.get<ApiResponse>('/api/notifications', {
      params: {
        page: currentPage.value,
        limit: pageSize.value
      }
    })
    
    if (response.data.success) {
      notifications.value = response.data.data.notifications
      total.value = response.data.data.total
      await fetchUnreadCount() // 更新未读数
    }
  } catch (error) {
    console.error('获取通知失败:', error)
    message.error('获取通知失败')
  } finally {
    loading.value = false
  }
}

// 标记单个通知为已读
const markAsRead = async (id: number) => {
  try {
    await http.post('/api/notifications/read', {
      ids: [id]
    })
    message.success('标记已读成功')
    await fetchNotifications() // 刷新列表
  } catch (error) {
    console.error('标记已读失败:', error)
    message.error('标记已读失败')
  }
}

// 全部标记已读
const markAllAsRead = async () => {
  try {
    await http.post('/api/notifications/read-all')
    message.success('全部标记已读成功')
    await fetchNotifications() // 刷新列表
  } catch (error) {
    console.error('全部标记已读失败:', error)
    message.error('全部标记已读失败')
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchNotifications()
}

// 点击整个通知项时标记已读
const handleItemClick = async (item: Notification) => {
  if (!item.is_read) {
    await markAsRead(item.id)
  }
}

onMounted(() => {
  fetchNotifications()
})

defineExpose({
  markAllAsRead
})
</script>

<template>
  <div class="notification-list">
    <a-spin :spinning="loading">
      <a-list
        :data-source="notifications"
        :pagination="{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          onChange: handlePageChange
        }"
      >
        <template #renderItem="{ item }">
          <a-list-item 
            :class="{ 'clickable': !item.is_read }"
            @click="handleItemClick(item)"
          >
            <a-list-item-meta>
              <template #title>
                <div class="notification-title">
                  <span :class="{ 'unread': !item.is_read }">{{ item.title }}</span>
                  <a-tag :color="item.type === 'system' ? 'blue' : 'green'">{{ item.type }}</a-tag>
                  <a-badge v-if="!item.is_read" status="error" />
                </div>
              </template>
              <template #description>
                <div>
                  <p>{{ item.content }}</p>
                  <p class="notification-time">
                    {{ new Date(item.created_at).toLocaleString() }}
                  </p>
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-spin>
  </div>
</template>

<style scoped>
.notification-list {
  padding: 16px;
}

.notification-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread {
  font-weight: bold;
  color: #1890ff;
}

.notification-time {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.clickable {
  cursor: pointer;
  transition: background-color 0.3s;
}

.clickable:hover {
  background-color: #f5f5f5;
}
</style> 