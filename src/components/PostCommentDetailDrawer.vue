<template>
  <a-drawer
    :visible="visible"
    title="帖子评论详情"
    placement="right"
    width="600"
    @close="handleClose"
  >
    <template v-if="comment">
      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="作者">
          <a-space>
            <a-avatar :src="comment.author_avatar">
              {{ comment.author_name?.[0]?.toUpperCase() || '?' }}
            </a-avatar>
            <span>{{ comment.author_name }}</span>
          </a-space>
        </a-descriptions-item>
        
        <a-descriptions-item label="内容">
          <template v-if="comment.parent_content">
            <div class="reply-info">
              回复 {{ comment.parent_username }}：
              <div class="parent-content">{{ comment.parent_content }}</div>
            </div>
          </template>
          <div>{{ comment.content }}</div>
          <!-- 添加图片显示 -->
          <div v-if="comment.images?.length" class="comment-images">
            <a-image-preview-group>
              <a-space wrap>
                <a-image
                  v-for="(url, index) in comment.images"
                  :key="index"
                  :src="url"
                  :width="100"
                  style="object-fit: cover; border-radius: 4px;"
                />
              </a-space>
            </a-image-preview-group>
          </div>
        </a-descriptions-item>

        <a-descriptions-item label="点赞数">
          {{ comment.like_count }}
        </a-descriptions-item>

        <a-descriptions-item label="创建时间">
          {{ dayjs(comment.created_at).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>

        <!-- 回复列表 -->
        <a-descriptions-item label="回复列表" v-if="comment.reply_count > 0">
          <div class="replies-list">
            <a-list
              :data-source="replies"
              item-layout="horizontal"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar :src="item.author_avatar">
                        {{ item.author_name?.[0]?.toUpperCase() || '?' }}
                      </a-avatar>
                    </template>
                    <template #title>
                      <div class="reply-header">
                        <span>{{ item.author_name }}</span>
                        <a-space>
                          <span class="reply-time">
                            {{ dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss') }}
                          </span>
                          <a-popconfirm
                            title="确定要删除这条回复吗？"
                            @confirm="() => handleDeleteReply(item.id)"
                          >
                            <a class="danger">删除</a>
                          </a-popconfirm>
                        </a-space>
                      </div>
                    </template>
                    <template #description>
                      <div class="reply-content">
                        {{ item.content }}
                        <!-- 添加图片显示 -->
                        <div v-if="item.images?.length" class="reply-images">
                          <a-image-preview-group>
                            <a-space wrap size="small">
                              <a-image
                                v-for="(url, index) in item.images"
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
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </div>
        </a-descriptions-item>
      </a-descriptions>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { service } from '@/utils/request'

const replies = ref([])

const props = defineProps<{
  visible: boolean
  comment: any
}>()

const emit = defineEmits(['update:visible', 'refresh'])

const handleClose = () => {
  emit('update:visible', false)
}

// 获取评论回复列表
const fetchReplies = async (commentId: number) => {
  try {
    const response = await service.get(`/api/posts/comments/${commentId}/replies`, {
      params: {
        page: 1,
        limit: 100 // 获取所有回复
      }
    })
    
    if (response.success) {
      replies.value = response.data.list || []
    }
  } catch (error) {
    console.error('获取回复列表失败:', error)
    message.error('获取回复列表失败')
  }
}

// 监听评论变化
watch(
  () => props.comment,
  (newComment) => {
    if (newComment) {
      // 如果评论有回复，则获取回复列表
      if (newComment.reply_count > 0) {
        fetchReplies(newComment.id)
      } else {
        replies.value = [] // 清空回复列表
      }
    }
  },
  { immediate: true }
)

// 删除回复
const handleDeleteReply = async (replyId: number) => {
  try {
    const response = await service.delete(`/api/admin/posts/comments/${replyId}`)
    if (response.success) {
      message.success('删除回复成功')
      // 重新获取回复列表
      if (props.comment) {
        fetchReplies(props.comment.id)
      }
      // 通知父组件刷新评论列表
      emit('refresh')
    }
  } catch (error) {
    console.error('删除回复失败:', error)
    message.error('删除回复失败')
  }
}
</script>

<style scoped>
.replies-list {
  margin-top: 8px;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.reply-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.reply-content {
  margin-top: 4px;
}

.reply-info {
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  margin-bottom: 8px;
}

.parent-content {
  color: rgba(0, 0, 0, 0.65);
  margin-top: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.danger {
  color: #ff4d4f;
}

.reply-images {
  margin-top: 8px;
}

.comment-images {
  margin-top: 16px;
}

:deep(.ant-image) {
  border-radius: 4px;
  overflow: hidden;
}
</style> 