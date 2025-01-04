<template>
  <div class="posts-list">
    <div class="table-operations">
      <a-space>
        <!-- 搜索框 -->
        <a-input-search
          v-model:value="queryParams.keyword"
          placeholder="搜索帖子标题"
          style="width: 200px"
          @search="handleSearch"
          allowClear
        />
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="posts"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
      :customRow="customRow"
    >
      <template #tags="{ record }">
        <a-space wrap>
          <a-tag 
            v-for="tag in record.tags" 
            :key="tag"
            class="clickable-tag"
            @click.stop="handleTagClick"
          >
            {{ tag }}
          </a-tag>
        </a-space>
      </template>
      <template #author="{ record }">
        <a-space class="author-info clickable" @click="handleAuthorClick(record.author_id)">
          <a-avatar :src="record.author_avatar">
            {{ record.author_name?.[0] }}
          </a-avatar>
          <span>{{ record.author_name }}</span>
        </a-space>
      </template>
      <template #action="{ record }">
        <a-space>
          <a @click.stop="confirmDelete(record.id)">删除</a>
        </a-space>
      </template>
    </a-table>

    <!-- 帖子详情抽屉 -->
    <a-drawer
      v-model:visible="detailDrawerVisible"
      :title="postDetail?.title"
      placement="right"
      width="600"
    >
      <template #extra>
        <a-button type="link" @click="showComments">
          <comment-outlined />
          查看评论
        </a-button>
      </template>

      <a-descriptions v-if="postDetail" bordered :column="1">
        <a-descriptions-item label="作者">
          <a-space>
            <a-avatar :src="postDetail.author_avatar" />
            <span>{{ postDetail.author_name }}</span>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="内容">{{ postDetail.content }}</a-descriptions-item>
        <a-descriptions-item label="标签">
          <a-space wrap>
            <a-tag 
              v-for="tag in postDetail.tags" 
              :key="tag"
              class="clickable-tag"
              @click.stop="handleTagClick"
            >
              {{ tag }}
            </a-tag>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="浏览数">{{ postDetail.view_count }}</a-descriptions-item>
        <a-descriptions-item label="点赞数">{{ postDetail.like_count }}</a-descriptions-item>
        <a-descriptions-item label="评论数">{{ postDetail.comment_count }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ new Date(postDetail.created_at).toLocaleString() }}
        </a-descriptions-item>
        <a-descriptions-item label="更新时间">
          {{ new Date(postDetail.updated_at).toLocaleString() }}
        </a-descriptions-item>
        <a-descriptions-item label="图片" v-if="postDetail.images?.length">
          <a-image-preview-group>
            <a-space wrap size="middle">
              <a-image
                v-for="image in postDetail.images"
                :key="image.id"
                :src="image.url"
                :width="120"
                style="object-fit: cover; border-radius: 4px;"
              />
            </a-space>
          </a-image-preview-group>
        </a-descriptions-item>
      </a-descriptions>

      <!-- 评论抽屉 -->
      <a-drawer
        v-model:visible="commentsDrawerVisible"
        title="评论列表"
        placement="right"
        :width="600"
      >
        <a-list
          :loading="commentsLoading"
          :data-source="comments"
          :pagination="commentsPagination"
          item-layout="vertical"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #avatar>
                  <a-avatar :src="item.author_avatar">
                    {{ item.author_name?.[0] }}
                  </a-avatar>
                </template>
                <template #title>
                  <div class="comment-header">
                    <span>{{ item.author_name }}</span>
                    <div class="comment-actions">
                      <span class="comment-time">{{ new Date(item.created_at).toLocaleString() }}</span>
                      <a-button type="link" danger @click.stop="handleDeleteComment(item)">
                        删除
                      </a-button>
                    </div>
                  </div>
                </template>
              </a-list-item-meta>
              <div class="comment-content">
                {{ item.content }}
                <div v-if="item.images?.length" class="comment-images">
                  <a-image-preview-group>
                    <a-space wrap size="small">
                      <a-image
                        v-for="(url, index) in item.images"
                        :key="index"
                        :src="url"
                        :width="80"
                        style="object-fit: cover; border-radius: 4px;"
                      />
                    </a-space>
                  </a-image-preview-group>
                </div>
              </div>
              <!-- 添加回复列表 -->
              <div v-if="item.replies?.length" class="replies-container">
                <a-list
                  :data-source="item.replies.slice(0, !item.expanded ? 3 : undefined)"
                  size="small"
                  item-layout="vertical"
                >
                  <template #renderItem="{ item: reply }">
                    <a-list-item>
                      <a-list-item-meta>
                        <template #avatar>
                          <a-avatar :src="reply.author_avatar" :size="24">
                            {{ reply.author_name?.[0] }}
                          </a-avatar>
                        </template>
                        <template #title>
                          <div class="comment-header">
                            <div>
                              <span>{{ reply.author_name }}</span>
                              <span class="reply-to"> 回复 </span>
                              <span>{{ reply.parent_author_name }}</span>
                            </div>
                            <div class="comment-actions">
                              <span class="comment-time">{{ new Date(reply.created_at).toLocaleString() }}</span>
                              <a-button type="link" danger size="small" @click.stop="handleDeleteComment(reply, false)">
                                删除
                              </a-button>
                            </div>
                          </div>
                        </template>
                      </a-list-item-meta>
                      <div class="reply-content">
                        {{ reply.content }}
                        <div v-if="reply.images?.length" class="comment-images">
                          <a-image-preview-group>
                            <a-space wrap size="small">
                              <a-image
                                v-for="(url, index) in reply.images"
                                :key="index"
                                :src="url"
                                :width="60"
                                style="object-fit: cover; border-radius: 4px;"
                              />
                            </a-space>
                          </a-image-preview-group>
                        </div>
                      </div>
                    </a-list-item>
                  </template>
                </a-list>
                
                <!-- 添加展开/收起按钮 -->
                <div v-if="item.reply_count > 3" class="replies-action">
                  <a @click="handleToggleReplies(item)">
                    {{ !item.expanded ? `展开更多${item.reply_count - 3}条回复` : '收起回复' }}
                  </a>
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </a-drawer>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getPosts, getPostDetail, deletePost, getPostComments, type PostComment } from '@/api/posts'
import { message, Modal } from 'ant-design-vue'
import { useRouter, useRoute } from 'vue-router'
import { CommentOutlined } from '@ant-design/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

const posts = ref([])
const loading = ref(false)
const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: '',
  author_id: undefined as number | undefined
})

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const columns = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: '作者',
    dataIndex: 'author',
    key: 'author',
    slots: { customRender: 'author' }
  },
  {
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
    slots: { customRender: 'tags' }
  },
  {
    title: '浏览数',
    dataIndex: 'view_count',
    key: 'view_count'
  },
  {
    title: '点赞数',
    dataIndex: 'like_count',
    key: 'like_count'
  },
  {
    title: '评论数',
    dataIndex: 'comment_count',
    key: 'comment_count'
  },
  {
    title: '创建时间',
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

const fetchPosts = async () => {
  loading.value = true
  try {
    const response = await getPosts({
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      keyword: queryParams.value.keyword,
      author_id: queryParams.value.author_id
    })
    if (response.success) {
      posts.value = response.data.list
      pagination.value.total = response.data.pagination.total
    }
  } catch (error) {
    message.error('获取帖子列表失败')
  } finally {
    loading.value = false
  }
}

// 处理作者点击 - 跳转到用户详情
const handleAuthorClick = (authorId: number) => {
  router.push({
    path: '/users',
    query: { 
      userId: String(authorId)
    }
  })
}

// 处理标签点击
const handleTagClick = () => {
  router.push({
    name: 'Tags',
    query: { 
      type: 'post'
    },
    replace: false
  })
}

// 监听路由参数变化
watch(
  () => route.query,
  (query) => {
    if (query.author_id) {
      queryParams.value.author_id = Number(query.author_id)
      fetchPosts()
    }
  },
  { immediate: true }
)

const handleSearch = () => {
  pagination.value.current = 1
  fetchPosts()
}

const handleTableChange = (paginationConfig: any) => {
  pagination.value.current = paginationConfig.current
  pagination.value.pageSize = paginationConfig.pageSize
  fetchPosts()
}

const customRow = (record: any) => {
  return {
    onClick: async () => {
      try {
        const response = await getPostDetail(record.id)
        if (response.success) {
          postDetail.value = response.data
          detailDrawerVisible.value = true
        }
      } catch (error) {
        message.error('获取帖子详情失败')
      }
    }
  }
}

const confirmDelete = (id: number) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这篇帖子吗？',
    onOk: async () => {
      try {
        const response = await deletePost(id)
        if (response.success) {
          message.success('删除成功')
          fetchPosts()
        }
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

const detailDrawerVisible = ref(false)
const postDetail = ref<PostDetail | null>(null)

// 评论相关状态
const commentsDrawerVisible = ref(false)
const commentsLoading = ref(false)
const comments = ref<PostComment[]>([])
const commentsPagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  onChange: (page: number, pageSize: number) => {
    commentsPagination.value.current = page
    commentsPagination.value.pageSize = pageSize
    fetchComments()
  }
})

// 获取评论列表
const fetchComments = async () => {
  if (!postDetail.value?.id) return
  
  commentsLoading.value = true
  try {
    const response = await getPostComments(postDetail.value.id, {
      page: commentsPagination.value.current,
      limit: commentsPagination.value.pageSize
    })
    if (response.success) {
      comments.value = response.data.list
      commentsPagination.value.total = response.data.pagination.total
    }
  } catch (error) {
    message.error('获取评论失败')
  } finally {
    commentsLoading.value = false
  }
}

// 显示评论列表
const showComments = () => {
  commentsDrawerVisible.value = true
  fetchComments()
}

// 监听评论抽屉关闭
watch(commentsDrawerVisible, (newVal) => {
  if (!newVal) {
    comments.value = []
    commentsPagination.value.current = 1
  }
})

onMounted(() => {
  fetchPosts()
})

// 更新 PostDetail 接口
interface PostImage {
  id: number
  post_id: number
  url: string
  order_num: number
  created_at: string
}

interface PostDetail {
  images: PostImage[]
}

// 添加获取评论回复的 API
const getReplies = async (commentId: number, params?: { page?: number; limit?: number }) => {
  return request<{
    code: number
    message: string
    data: {
      list: PostReply[]
      pagination: {
        total: number
        page: number
        limit: number
        pages: number
      }
    }
    success: boolean
  }>({
    url: `/api/posts/comments/${commentId}/replies`,
    method: 'get',
    params
  })
}

// 处理展开/收起回复
const handleToggleReplies = async (comment: PostComment & { expanded?: boolean }) => {
  if (!comment.expanded && comment.reply_count > comment.replies.length) {
    try {
      const response = await getReplies(comment.id, {
        page: 1,
        limit: comment.reply_count
      })
      if (response.success) {
        comment.replies = response.data.list
      }
    } catch (error) {
      message.error('获取回复失败')
      return
    }
  }
  comment.expanded = !comment.expanded
}

// 添加删除评论的 API
const deleteComment = async (commentId: number) => {
  return request<{
    code: number
    message: string
    success: boolean
  }>({
    url: `/api/admin/posts/comments/${commentId}`,
    method: 'delete'
  })
}

// 修改删除评论的处理函数
const handleDeleteComment = (comment: PostComment | PostReply, isMainComment = true) => {
  Modal.confirm({
    title: '确认删除',
    content: isMainComment && (comment as PostComment).reply_count > 0
      ? `该评论下有${(comment as PostComment).reply_count}条回复，删除后将同时删除所有回复，是否继续？`
      : '确定要删除这条评论吗？',
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
        
        // 直接检查 response 的 success 属性
        if (response.success) {
          message.success('删除成功')
          // 重新获取评论列表
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
</script>

<style scoped>
.posts-list {
  padding: 24px;
}

.table-operations {
  margin-bottom: 16px;
}

.author-info {
  cursor: pointer;
  transition: opacity 0.3s;
}

.author-info:hover {
  opacity: 0.8;
}

.clickable {
  cursor: pointer;
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.clickable-tag:hover {
  opacity: 0.8;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.3s;
}

.clickable-row:hover {
  background-color: #f5f5f5;
}

.comment-content {
  margin-top: 8px;
  white-space: pre-wrap;
}

.comment-images {
  margin-top: 8px;
}

.replies-container {
  margin-top: 16px;
  margin-left: 48px;
  padding: 8px 16px;
  background-color: #fafafa;
  border-radius: 4px;
  width: calc(100% - 48px);
  max-width: 100%;
}

.reply-to {
  color: #8c8c8c;
  margin: 0 4px;
  font-size: 12px;
}

.reply-content {
  margin-top: 4px;
  font-size: 14px;
  margin-left: 32px;
}

:deep(.replies-container .ant-list-item) {
  padding: 8px 0;
}

:deep(.replies-container .ant-list-item:last-child) {
  border-bottom: none;
  margin-bottom: 0;
}

:deep(.replies-container .ant-list-item-meta) {
  margin-bottom: 0;
}

:deep(.replies-container .ant-list-item-meta-avatar) {
  margin-right: 8px;
}

:deep(.replies-container .ant-list-item-meta-title) {
  line-height: 24px;
}

.replies-action {
  text-align: center;
  margin-top: 8px;
  color: #1890ff;
  cursor: pointer;
}

.replies-action:hover {
  opacity: 0.8;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-time {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: normal;
}

:deep(.ant-btn-link) {
  padding: 0 4px;
  height: auto;
  line-height: 1;
}

:deep(.replies-container .ant-btn-link) {
  font-size: 12px;
}
</style> 