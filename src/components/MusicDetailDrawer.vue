<template>
  <a-drawer
    :visible="visible"
    :title="currentMusic?.title"
    placement="right"
    width="800"
    :footer-style="{ textAlign: 'right' }"
    @update:visible="(val) => emit('update:visible', val)"
  >
    <a-descriptions :column="1" bordered>
      <a-descriptions-item label="封面">
        <a-image
          :width="200"
          :src="currentMusic?.cover_image"
          :fallback="defaultCover"
        />
      </a-descriptions-item>

      <a-descriptions-item label="艺人">
        <template v-if="currentMusic?.artist">
          <div class="artist-info" @click="handleArtistClick(currentMusic.artist)">
            <a-space align="start">
              <a-avatar :src="currentMusic.artist.avatar" :size="64">
                {{ currentMusic.artist.name?.charAt(0) }}
              </a-avatar>
              <div class="artist-content">
                <div class="artist-name">{{ currentMusic.artist.name }}</div>
                <div class="artist-alias">
                  <template v-if="currentMusic.artist.alias">
                    <a-tag v-for="alias in currentMusic.artist.alias.split(';')" :key="alias">
                      {{ alias }}
                    </a-tag>
                  </template>
                </div>
                <div class="artist-description">
                  {{ currentMusic.artist.description }}
                </div>
              </div>
            </a-space>
          </div>
        </template>
        <template v-else>-</template>
      </a-descriptions-item>

      <a-descriptions-item label="标签">
        <a-space wrap>
          <a-tag v-for="tag in currentMusic.tags" :key="tag.id">
            {{ tag.name }}
          </a-tag>
        </a-space>
      </a-descriptions-item>

      <a-descriptions-item label="语言">
        {{ currentMusic?.language }}
      </a-descriptions-item>

      <a-descriptions-item label="描述">
        {{ currentMusic?.description }}
      </a-descriptions-item>

      <a-descriptions-item label="歌词">
        <pre class="lyrics">{{ currentMusic?.lyrics }}</pre>
      </a-descriptions-item>

      <a-descriptions-item label="专辑">
        <template v-if="currentMusic?.albums?.length">
          <div 
            v-for="album in currentMusic.albums" 
            :key="album.id" 
            class="album-info clickable"
            @click="handleAlbumClick(album.id)"
          >
            <a-image
              :width="100"
              :src="album.cover_image"
              :fallback="defaultCover"
            />
            <div class="album-details">
              <div class="album-title">{{ album.title }}</div>
              <div class="album-meta">
                <span>收录歌曲：{{ album.track_count || 0 }} 首</span>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <a-empty description="暂无专辑信息" />
        </template>
      </a-descriptions-item>

      <a-descriptions-item label="评论">
        <div class="comments-section">
          <template v-if="comments.length">
            <div v-for="comment in comments" :key="comment.id" class="comment-item">
              <div class="comment-header">
                <a-space>
                  <a-avatar :size="32" :src="comment.user_avatar">
                    {{ comment.user_nickname?.[0] || comment.user_name?.[0] || '?' }}
                  </a-avatar>
                  <div class="comment-info">
                    <div class="comment-user">{{ comment.user_nickname || comment.user_name }}</div>
                    <div class="comment-time">{{ dayjs(comment.created_at).format('YYYY-MM-DD HH:mm:ss') }}</div>
                  </div>
                </a-space>
                <div class="comment-likes">
                  <like-outlined /> {{ comment.like_count }}
                </div>
              </div>
              <div class="comment-content">{{ comment.content }}</div>
              
              <!-- 回复列表 -->
              <div v-if="comment.replies?.length" class="replies-section">
                <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                  <div class="reply-header">
                    <a-space>
                      <a-avatar :size="24" :src="reply.user_avatar">
                        {{ reply.user_nickname?.[0] || reply.user_name?.[0] || '?' }}
                      </a-avatar>
                      <div class="reply-info">
                        <div class="reply-user">{{ reply.user_nickname || reply.user_name }}</div>
                        <div class="reply-time">{{ dayjs(reply.created_at).format('YYYY-MM-DD HH:mm:ss') }}</div>
                      </div>
                    </a-space>
                    <div class="reply-likes">
                      <like-outlined /> {{ reply.like_count }}
                    </div>
                  </div>
                  <div class="reply-content">{{ reply.content }}</div>
                </div>
                
                <!-- 展开更多回复 -->
                <div v-if="comment.reply_count > 3" class="more-replies">
                  <a @click="loadMoreReplies(comment)">
                    查看全部 {{ comment.reply_count }} 条回复
                  </a>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <a-empty description="暂无评论" />
          </template>
          
          <!-- 分页 -->
          <a-pagination
            v-if="total > pageSize"
            v-model:current="current"
            :total="total"
            :pageSize="pageSize"
            @change="handlePageChange"
            size="small"
          />
        </div>
      </a-descriptions-item>

      <!-- ... 其他描述项 ... -->
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { http } from '@/utils/http'
import defaultCover from '@/assets/default-cover.png'
import { message, Avatar, Space, Tag } from 'ant-design-vue'
import { LikeOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const props = defineProps<{
  visible: boolean
  musicId?: number
}>()

const emit = defineEmits(['update:visible', 'album-click', 'artist-click'])

const currentMusic = ref<any>(null)

// 获取音乐详情
const fetchMusicDetail = async (id: number) => {
  try {
    const response = await http.get(`/api/admin/music/${id}`)
    if (response.data.success) {
      currentMusic.value = response.data.data
    }
  } catch (error) {
    console.error('获取音乐详情失败:', error)
    message.error('获取音乐详情失败')
  }
}

// 监听 visible 和 musicId 变化
watch(
  () => [props.visible, props.musicId],
  async ([newVisible, newMusicId]) => {
    if (newVisible && newMusicId) {
      await fetchMusicDetail(newMusicId)
      // 获取音乐详情后立即获取评论列表
      current.value = 1 // 重置页码
      await fetchComments()
    } else if (!newVisible) {
      currentMusic.value = null
      // 清空评论列表
      comments.value = []
      total.value = 0
    }
  }
)

// 添加专辑点击处理
const handleAlbumClick = (albumId: number) => {
  emit('album-click', albumId)
}

// 添加艺人点击处理
const handleArtistClick = (artist: any) => {
  emit('artist-click', artist)
}

const comments = ref([])
const current = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 获取评论列表
const fetchComments = async () => {
  if (!props.musicId) return // 如果没有音乐 ID 则不获取评论
  
  try {
    const response = await http.get('/api/music-comments', {
      params: {
        page: current.value,
        limit: pageSize.value,
        music_id: props.musicId
      }
    })
    if (response.data.success) {
      comments.value = response.data.data.items
      total.value = response.data.data.total
    }
  } catch (error) {
    console.error('获取评论列表失败:', error)
    message.error('获取评论列表失败')
  }
}

// 加载更多回复
const loadMoreReplies = async (comment: any) => {
  try {
    const response = await http.get(`/api/music-comments/${comment.id}/replies`, {
      params: {
        page: 1,
        limit: comment.reply_count
      }
    })
    if (response.data.success) {
      // 更新评论的回复列表
      comment.replies = response.data.data.items
    }
  } catch (error) {
    console.error('获取回复列表失败:', error)
  }
}

// 修改分页处理函数
const handlePageChange = async (page: number) => {
  current.value = page
  await fetchComments()
}
</script>

<style scoped>
.album-info {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.album-details {
  flex: 1;
}

.album-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.album-meta {
  color: rgba(0, 0, 0, 0.45);
}

.artist-info {
  width: 100%;
  padding: 12px;
  border-radius: 4px;
  background-color: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
}

.artist-info:hover {
  background-color: #f0f0f0;
}

.artist-content {
  flex: 1;
  min-width: 0;
}

.artist-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.85);
}

.artist-alias {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.artist-alias :deep(.ant-tag) {
  margin: 0;
}

:deep(.ant-descriptions-item-content) {
  padding: 24px !important;
}

.artist-description {
  margin-top: 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
  line-height: 1.5;
}

.comments-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.comment-info {
  display: flex;
  flex-direction: column;
}

.comment-user {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.comment-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.comment-likes {
  color: rgba(0, 0, 0, 0.45);
}

.comment-content {
  margin-bottom: 12px;
}

.replies-section {
  margin-left: 48px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-item {
  padding: 12px;
  background: #fff;
  border-radius: 4px;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.reply-info {
  display: flex;
  flex-direction: column;
}

.reply-user {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.reply-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.reply-likes {
  color: rgba(0, 0, 0, 0.45);
}

.more-replies {
  text-align: center;
  color: #1890ff;
  cursor: pointer;
}

.more-replies:hover {
  color: #40a9ff;
}
</style> 