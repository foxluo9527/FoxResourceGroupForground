<template>
  <div class="dashboard">
    <div class="stats-container">
      <a-row :gutter="[24, 24]">
        <a-col :span="6">
          <div class="stats-card">
            <div class="stats-header">
              <span class="stats-title">用户总数</span>
              <a-tag color="green" v-if="stats?.users.today_new">
                +{{ stats.users.today_new }}
              </a-tag>
            </div>
            <h2 class="stats-number">{{ stats?.users.total || 0 }}</h2>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stats-card">
            <div class="stats-header">
              <span class="stats-title">音乐总数</span>
              <a-tag color="blue">
                {{ stats?.music.total_plays || 0 }} 播放
              </a-tag>
            </div>
            <h2 class="stats-number">{{ stats?.music.total || 0 }}</h2>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stats-card">
            <div class="stats-header">
              <span class="stats-title">评论总数</span>
              <a-tag color="green" v-if="stats?.comments.today_new">
                +{{ stats.comments.today_new }}
              </a-tag>
            </div>
            <h2 class="stats-number">{{ stats?.comments.total || 0 }}</h2>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stats-card">
            <div class="stats-header">
              <span class="stats-title">专辑/歌单</span>
              <a-tag color="blue">
                {{ stats?.albums.total_likes || 0 }} 收藏
              </a-tag>
            </div>
            <h2 class="stats-number">{{ stats?.albums.total || 0 }}</h2>
          </div>
        </a-col>
      </a-row>

      <div class="stats-expand">
        <div class="expand-header" @click="showMore = !showMore">
          <span>{{ showMore ? '收起详细数据' : '查看更多数据' }}</span>
          <down-outlined :class="{ 'expanded': showMore }" />
        </div>
        
        <div class="expand-content" v-show="showMore">
          <a-row :gutter="[24, 24]">
            <a-col :span="8">
              <div class="stats-card">
                <div class="stats-header">
                  <span class="stats-title">用户数据</span>
                </div>
                <div class="stats-details">
                  <div class="stats-item">
                    <span>普通用户</span>
                    <span>{{ stats?.users.normal_users }}</span>
                  </div>
                  <div class="stats-item">
                    <span>管理员</span>
                    <span>{{ stats?.users.admin_users }}</span>
                  </div>
                  <div class="stats-item">
                    <span>在线用户</span>
                    <span>{{ stats?.users.online_users }}</span>
                  </div>
                </div>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="stats-card">
                <div class="stats-header">
                  <span class="stats-title">音乐数据</span>
                </div>
                <div class="stats-details">
                  <div class="stats-item">
                    <span>艺人数量</span>
                    <span>{{ stats?.artists.total }}</span>
                  </div>
                  <div class="stats-item">
                    <span>标签数量</span>
                    <span>{{ stats?.tags.total }}</span>
                  </div>
                  <div class="stats-item">
                    <span>今日播放</span>
                    <span>{{ stats?.music.today_plays }}</span>
                  </div>
                </div>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="stats-card">
                <div class="stats-header">
                  <span class="stats-title">专辑/歌单</span>
                </div>
                <div class="stats-details">
                  <div class="stats-item">
                    <span>专辑数量</span>
                    <span>{{ stats?.albums.albums.total }}</span>
                  </div>
                  <div class="stats-item">
                    <span>歌单数量</span>
                    <span>{{ stats?.albums.playlists.total }}</span>
                  </div>
                  <div class="stats-item">
                    <span>总收藏数</span>
                    <span>{{ stats?.albums.total_likes }}</span>
                  </div>
                </div>
              </div>
            </a-col>
          </a-row>
        </div>
      </div>
    </div>

    <!-- 其他内容（图表和通知） -->
    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="最近一周访问量">
          <!-- 图表区域 -->
          <div style="height: 300px; display: flex; align-items: center; justify-content: center">
            图表区域
          </div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card>
          <template #title>
            <div class="notification-header">
              <span>系统通知</span>
              <div class="notification-actions">
                <Badge :count="unreadCount" :dot="false" />
                <Button 
                  type="link" 
                  size="small"
                  @click="markAllAsRead"
                  :disabled="unreadCount === 0"
                >
                  全部已读
                </Button>
              </div>
            </div>
          </template>
          <NotificationList 
            ref="notificationListRef" 
            @update:unread-count="count => unreadCount = count" 
          />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Badge, Button, message } from 'ant-design-vue'
import { DownOutlined } from '@ant-design/icons-vue'
import { service } from '@/utils/request'
import NotificationList from '@/components/NotificationList.vue'

interface DashboardStats {
  users: {
    total: number
    normal_users: string
    admin_users: string
    active_users: string
    banned_users: string
    online_users: number
    today_new: number
  }
  music: {
    total: number
    artist_count: number
    total_plays: string
    total_likes: string
    total_comments: number
    today_plays: number
  }
  artists: {
    total: number
    total_likes: string
  }
  comments: {
    total: number
    user_count: number
    music_count: number
    today_new: number
  }
  albums: {
    total: number
    albums: {
      total: string
      likes: string
    }
    playlists: {
      total: string
      likes: string
    }
    total_likes: string
  }
  tags: {
    total: number
    music: {
      total: number
      tagged_items: number
      used_tags: number
      total_relations: number
    }
    artist: {
      total: number
      tagged_items: number
      used_tags: number
      total_relations: number
    }
  }
}

const route = useRoute()
const unreadCount = ref(0)
const notificationListRef = ref()
const stats = ref<DashboardStats | null>(null)
const loading = ref(false)
const showMore = ref(false)

// 获取仪表盘统计数据
const fetchStats = async () => {
  loading.value = true
  try {
    const response = await service.get('/api/admin/dashboard/stats')
    if (response.success) {
      stats.value = response.data
    }
  } catch (error) {
    message.error('获取统计数据失败')
    console.error('获取统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

const markAllAsRead = async () => {
  if (notificationListRef.value) {
    await notificationListRef.value.markAllAsRead()
  }
}

onMounted(() => {
  console.log('Dashboard组件已挂载')
  console.log('当前路由:', route.path)
  fetchStats()
})
</script>

<style scoped>
.dashboard {
  min-height: 100%;
  padding: 24px;
}

.stats-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.stats-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
  height: 100%;
  transition: all 0.3s;
}

.stats-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stats-title {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

.stats-number {
  margin: 0;
  color: #1890ff;
  font-size: 28px;
  line-height: 1.2;
}

.stats-expand {
  margin-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.expand-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  color: #1890ff;
  cursor: pointer;
  transition: all 0.3s;
}

.expand-header:hover {
  color: #40a9ff;
}

.expand-header .anticon {
  margin-left: 8px;
  transition: transform 0.3s;
}

.expand-header .expanded {
  transform: rotate(180deg);
}

.expand-content {
  padding-top: 24px;
}

.stats-details {
  margin-top: 16px;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stats-item:last-child {
  border-bottom: none;
}

.stats-item span:first-child {
  color: rgba(0, 0, 0, 0.45);
}

.stats-item span:last-child {
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.ant-collapse-header) {
  text-align: center;
  color: #1890ff !important;
}

:deep(.ant-descriptions-item-label) {
  color: rgba(0, 0, 0, 0.45);
}
</style> 