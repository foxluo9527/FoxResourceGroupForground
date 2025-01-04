<template>
  <div class="comments-manage">
    <div class="operation-bar">
      <a-input-search
        v-model:value="queryParams.keyword"
        placeholder="搜索评论内容"
        style="width: 300px"
        @search="handleSearch"
        allowClear
      />
    </div>

    <a-table
      :columns="columns"
      :data-source="comments"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <!-- 作者信息列 -->
      <template #author="{ record }">
        <a-space>
          <a-avatar :src="record.author_avatar" :size="32">
            {{ record.author_name?.[0] }}
          </a-avatar>
          <span>{{ record.author_name }}</span>
        </a-space>
      </template>

      <!-- 帖子标题列 -->
      <template #post="{ record }">
        <a @click="handleViewPost(record.post_id)">{{ record.post_title }}</a>
      </template>

      <!-- 评论内容列 -->
      <template #content="{ record }">
        <div class="comment-content">
          <div>{{ record.content }}</div>
          <div v-if="record.images?.length" class="comment-images">
            <a-image-preview-group>
              <a-space wrap size="small">
                <a-image
                  v-for="(url, index) in record.images"
                  :key="index"
                  :src="url"
                  :width="60"
                  style="object-fit: cover; border-radius: 4px;"
                />
              </a-space>
            </a-image-preview-group>
          </div>
        </div>
      </template>

      <!-- 操作列 -->
      <template #action="{ record }">
        <a-space>
          <a-button type="link" danger @click="handleDeleteComment(record)">
            删除
          </a-button>
        </a-space>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'

interface Comment {
  id: number
  post_id: number
  user_id: number
  content: string
  parent_id: number | null
  like_count: number
  created_at: string
  updated_at: string
  author_name: string
  author_avatar: string
  post_title: string
  parent_content: string | null
  parent_author_name: string | null
  images: string[]
}

const router = useRouter()
const loading = ref(false)
const comments = ref<Comment[]>([])
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: ''
})

const pagination = ref({
  total: 0,
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const columns = [
  {
    title: '作者',
    key: 'author',
    slots: { customRender: 'author' }
  },
  {
    title: '帖子',
    key: 'post',
    slots: { customRender: 'post' }
  },
  {
    title: '评论内容',
    key: 'content',
    slots: { customRender: 'content' }
  },
  {
    title: '点赞数',
    dataIndex: 'like_count',
    key: 'like_count'
  },
  {
    title: '发布时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString()
  },
  {
    title: '操作',
    key: 'action',
    slots: { customRender: 'action' }
  }
]

// 获取评论列表
const fetchComments = async () => {
  loading.value = true
  try {
    const response = await request<{
      code: number
      message: string
      data: {
        list: Comment[]
        pagination: {
          total: number
          page: number
          limit: number
          pages: number
        }
      }
      success: boolean
    }>({
      url: '/api/admin/posts/comments',
      method: 'get',
      params: queryParams.value
    })

    if (response.success) {
      comments.value = response.data.list
      pagination.value.total = response.data.pagination.total
    }
  } catch (error) {
    message.error('获取评论列表失败')
  } finally {
    loading.value = false
  }
}

// 处理搜索
const handleSearch = () => {
  queryParams.value.page = 1
  fetchComments()
}

// 处理表格变化
const handleTableChange = (pag: any) => {
  queryParams.value.page = pag.current
  queryParams.value.limit = pag.pageSize
  fetchComments()
}

// 查看帖子
const handleViewPost = (postId: number) => {
  router.push({
    path: '/posts/list',
    query: { postId }
  })
}

// 删除评论
const handleDeleteComment = (comment: Comment) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这条评论吗？',
    async onOk() {
      try {
        const response = await request<{
          code: number
          message: string
          success: boolean
        }>({
          url: `/api/admin/posts/comments/${comment.id}`,
          method: 'delete'
        })
        
        if (response.success) {
          message.success('删除成功')
          fetchComments()
        } else {
          message.error(response.message || '删除失败')
        }
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

onMounted(() => {
  fetchComments()
})
</script>

<style scoped>
.comments-manage {
  padding: 24px;
}

.operation-bar {
  margin-bottom: 16px;
}

.comment-content {
  max-width: 400px;
  white-space: pre-wrap;
  word-break: break-all;
}

.comment-images {
  margin-top: 8px;
}
</style> 