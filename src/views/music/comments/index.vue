<template>
  <div class="comments-list">
    <div class="table-operations">
      <a-space>
        <a-select
          v-model:value="selectedMusicId"
          style="min-width: 200px"
          placeholder="选择音乐筛选"
          :loading="musicOptionsLoading"
          allowClear
          show-search
          :options="musicOptions"
          :filter-option="filterMusicOption"
        >
          <template #suffixIcon>
            <filter-outlined />
          </template>
        </a-select>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="comments"
      :loading="loading"
      :pagination="{
        ...pagination,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100']
      }"
      @change="handleTableChange"
      row-key="id"
    >
      <!-- 用户信息 -->
      <template #user="{ record }">
        <a-space>
          <div class="user-info clickable" @click="handleUserClick(record.user?.id)">
            <a-avatar :size="32" :src="record.user?.avatar">
              {{ record.user?.username?.charAt(0)?.toUpperCase() || '?' }}
            </a-avatar>
            <span>{{ record.user?.username }}</span>
          </div>
        </a-space>
      </template>

      <!-- 评论内容 -->
      <template #content="{ record }">
        <div class="comment-content">
          <template v-if="record.parent_content">
            <div class="reply-info">
              回复 {{ record.parent_user_nickname || record.parent_user_name }}：
              <span class="parent-content">{{ record.parent_content }}</span>
            </div>
          </template>
          {{ record.content }}
        </div>
      </template>

      <!-- 音乐信息 -->
      <template #music="{ record }">
        <a 
          class="music-link" 
          @click.prevent.stop="handleMusicClick(record.music?.id)"
        >
          {{ record.music?.title }}
        </a>
      </template>

      <!-- 操作 -->
      <template #action="{ record }">
        <a-popconfirm
          title="确定要删除这条评论吗？"
          @confirm="handleDelete(record)"
        >
          <a class="danger">删除</a>
        </a-popconfirm>
      </template>
    </a-table>

    <!-- 音乐详情抽屉 -->
    <music-detail-drawer
      v-model:visible="musicDrawerVisible"
      :music-id="currentMusicId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { FilterOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { http } from '@/utils/http'
import dayjs from 'dayjs'
import MusicDetailDrawer from '@/components/MusicDetailDrawer.vue'
import { useRoute, useRouter } from 'vue-router'

const columns = [
  {
    title: '用户',
    dataIndex: 'user_name',
    width: 200,
    slots: { customRender: 'user' }
  },
  {
    title: '评论内容',
    dataIndex: 'content',
    slots: { customRender: 'content' }
  },
  {
    title: '音乐',
    dataIndex: ['music', 'title'],
    width: 200,
    slots: { customRender: 'music' }
  },
  {
    title: '点赞数',
    dataIndex: 'like_count',
    width: 100
  },
  {
    title: '评论时间',
    dataIndex: 'created_at',
    width: 180,
    customRender: ({ text }) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    slots: { customRender: 'action' }
  }
]

const loading = ref(false)
const comments = ref([])
const pagination = ref<TablePaginationConfig>({
  total: 0,
  current: 1,
  pageSize: 10
})

// 音乐选择相关
const selectedMusicId = ref<number>()
const musicOptions = ref<{ label: string; value: number }[]>([])
const musicOptionsLoading = ref(false)

// 音乐详情相关
const musicDrawerVisible = ref(false)
const currentMusicId = ref<number>()

const route = useRoute()
const router = useRouter()

// 获取音乐列表用于选择
const fetchMusicOptions = async () => {
  musicOptionsLoading.value = true
  try {
    const response = await http.get('/api/admin/music', {
      params: {
        page: 1,
        limit: 1000 // 获取所有音乐用于筛选
      }
    })
    if (response.data.success) {
      musicOptions.value = response.data.data.list.map((item: any) => ({
        label: item.title,
        value: item.id
      }))
    }
  } catch (error) {
    console.error('获取音乐列表失败:', error)
  } finally {
    musicOptionsLoading.value = false
  }
}

// 修改音乐ID变化监听
watch(
  selectedMusicId,
  (newMusicId) => {
    pagination.value.current = 1
    fetchComments() // 不管是否有值都重新获取评论列表
  },
  { immediate: false }
)

// 修改获取评论列表函数
const fetchComments = async () => {
  loading.value = true
  try {
    const response = await http.get('/api/admin/music-comments', {
      params: {
        page: pagination.value.current,
        limit: pagination.value.pageSize,
        music_id: selectedMusicId.value // 直接使用 selectedMusicId，undefined 时会自动忽略该参数
      }
    })
    if (response.data.success) {
      comments.value = response.data.data.items
      pagination.value.total = response.data.data.total
    }
  } catch (error) {
    console.error('获取评论列表失败:', error)
    message.error('获取评论列表失败')
  } finally {
    loading.value = false
  }
}

// 音乐筛选过滤
const filterMusicOption = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

// 处理表格分页变化
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchComments()
}

// 删除评论
const handleDelete = async (record: any) => {
  try {
    const response = await http.delete(`/api/admin/music-comments/${record.id}`)
    if (response.data.success) {
      message.success('删除成功')
      if (comments.value.length === 1 && pagination.value.current > 1) {
        pagination.value.current--
      }
      fetchComments()
    }
  } catch (error) {
    console.error('删除评论失败:', error)
    message.error('删除失败')
  }
}

// 查看音乐详情
const handleMusicClick = (musicId: number | undefined) => {
  if (!musicId) return
  
  // 直接跳转到音乐列表页
  router.push({
    path: '/music/songs',
    query: { 
      musicId: String(musicId)
    },
    replace: true // 使用 replace 模式
  })
}

// 处理用户点击
const handleUserClick = (userId: number | undefined) => {
  if (!userId) return
  
  // 跳转到用户管理页面并打开用户详情
  router.push({
    path: '/users',
    query: { 
      userId: String(userId)
    },
    replace: true
  })
}

onMounted(() => {
  fetchMusicOptions()
  fetchComments()
})

onUnmounted(() => {
  comments.value = []
  selectedMusicId.value = undefined
  musicOptions.value = []
})
</script>

<style scoped>
.comments-list {
  padding: 24px;
}

.table-operations {
  margin-bottom: 16px;
}

.danger {
  color: #ff4d4f;
}

.comment-content {
  word-break: break-all;
}

.reply-info {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-bottom: 4px;
}

.parent-content {
  color: rgba(0, 0, 0, 0.65);
}

.music-link {
  color: #1890ff;
  cursor: pointer;
  text-decoration: none;
}

.music-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.comment-music {
  color: #1890ff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clickable {
  cursor: pointer;
  transition: opacity 0.3s;
}

.clickable:hover {
  opacity: 0.8;
}
</style> 