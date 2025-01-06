<template>

  <div class="music-list">

    <div class="table-operations">

      <a-space>

        <a-select

          v-model:value="selectedTag"

          style="min-width: 200px"

          placeholder="按标签筛选"

          :loading="tagsLoading"

          allowClear

          :options="tags.map(tag => ({ 

            value: tag.id, 

            label: tag.name

          }))"

          @change="handleTagChange"

        >

          <template #suffixIcon>

            <filter-outlined />

          </template>

        </a-select>

        <a-input-search

          v-model:value="searchKeyword"

          placeholder="搜索音乐标题"

          style="width: 200px"

          @search="handleSearch"

          allowClear

        />

        <a-button type="primary" @click="handleAdd">

          <plus-outlined />添加音乐

        </a-button>

        <a-button type="primary" @click="showBatchImport">

          <upload-outlined />批量导入

        </a-button>

      </a-space>

    </div>



    <a-table

      :columns="columns"

      :data-source="musicList"

      :loading="loading"

      :pagination="{

        ...pagination,

        showSizeChanger: true,

        showTotal: (total) => `共 ${total} 条`,

        pageSizeOptions: ['10', '20', '50', '100']

      }"

      @change="handleTableChange"

      row-key="id"

      :customRow="customRow"

      :row-class-name="() => 'clickable-row'"

    >

      <!-- 封面图 -->

      <template #coverImage="{ record }">

        <div @click.stop>

          <a-image

            :width="50"

            :src="record.cover_image"

            :fallback="defaultCover"

          />

        </div>

      </template>



      <!-- 标签 -->

      <template #tags="{ record }">

        <a-space wrap>

          <template v-if="record.tags?.length">

            <a-tag 

              v-for="tag in record.tags" 

              :key="tag.id"

              class="clickable-tag"

              @click.stop="handleTagClick(tag)"

            >

              {{ tag.name }}

            </a-tag>

          </template>

          <template v-else>-</template>

        </a-space>

      </template>



      <!-- 艺人 -->

      <template #artists="{ record }">

        <a-space wrap>

          <template v-if="record.artist">

            <a-tag 

              class="clickable-tag"

              @click.stop="handleArtistClick(record.artist)"

            >

              {{ record.artist.name }}

            </a-tag>

          </template>

          <template v-else>-</template>

        </a-space>

      </template>



      <!-- 专辑 -->

      <template #albums="{ record }">

        <a-space wrap>

          <template v-if="record.albums?.length">

            <a-tag 

              v-for="album in record.albums" 

              :key="album.id"

              class="clickable-tag"

              @click.stop="handleAlbumClick(album)"

            >

              {{ album.title }}

            </a-tag>

          </template>

          <template v-else>-</template>

        </a-space>

      </template>



      <!-- 操作 -->

      <template #action="{ record }">

        <a-space>

          <a @click.stop="handleEdit(record)">编辑</a>

          <a-divider type="vertical" />

          <a-popconfirm

            title="确定要删除这首音乐吗？"

            @confirm="handleDelete(record)"

            @click.stop

          >

            <a class="danger">删除</a>

          </a-popconfirm>

        </a-space>

      </template>

    </a-table>



    <!-- 添加/编辑音乐表单 -->

    <music-form-modal

      v-model:visible="showMusicForm"

      :title="formTitle"

      :music-id="currentMusicId"

      @success="handleSuccess"

    />



    <!-- 音乐详情抽屉 -->

    <a-drawer

      v-model:visible="drawerVisible"

      title="音乐详情"

      placement="right"

      width="600"

      :footer="null"

    >

      <template #extra>

        <a-button type="primary" @click="handleViewComments">

          <comment-outlined />查看评论

        </a-button>

      </template>

      

      <a-descriptions v-if="currentMusic" bordered :column="1">

        <a-descriptions-item label="封面">

          <a-image

            :width="200"

            :src="currentMusic.cover_image"

            :fallback="defaultCover"

          />

        </a-descriptions-item>

        <a-descriptions-item label="标题">

          {{ currentMusic.title }}

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

          {{ currentMusic.language }}

        </a-descriptions-item>

        <a-descriptions-item label="描述">

          {{ currentMusic.description }}

        </a-descriptions-item>

        <a-descriptions-item label="歌词">

          <pre class="lyrics">{{ currentMusic.lyrics }}</pre>

        </a-descriptions-item>

        <a-descriptions-item label="播放量">

          {{ currentMusic.play_count }}

        </a-descriptions-item>

        <a-descriptions-item label="收藏数">

          {{ currentMusic.collection_count }}

        </a-descriptions-item>

        <a-descriptions-item label="评论数">

          {{ currentMusic.comment_count }}

        </a-descriptions-item>

        <a-descriptions-item label="创建时间">

          {{ dayjs(currentMusic.created_at).format('YYYY-MM-DD HH:mm:ss') }}

        </a-descriptions-item>

        <a-descriptions-item label="更新时间">

          {{ dayjs(currentMusic.updated_at).format('YYYY-MM-DD HH:mm:ss') }}

        </a-descriptions-item>

        <a-descriptions-item label="专辑">

          <template v-if="currentMusic.albums?.length">

            <div 

              v-for="album in currentMusic.albums" 

              :key="album.id" 

              class="album-info clickable"

              @click="handleAlbumClick(album)"

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

        <a-descriptions-item label="音频">

          <div class="audio-player">

            <audio

              ref="audioRef"

              :src="currentMusic.url"

              controls

              preload="metadata"

              class="custom-audio"

              @play="handlePlay"

            >

              您的浏览器不支持音频播放

            </audio>

            <div class="audio-info">

              <div class="audio-title">{{ currentMusic.title }}</div>

              <div class="audio-artist">{{ currentMusic.artist?.name }}</div>

            </div>

          </div>

        </a-descriptions-item>

      </a-descriptions>

    </a-drawer>



    <!-- 评论子页面抽屉 -->

    <a-drawer

      v-model:visible="commentsDrawerVisible"

      title="评论列表"

      placement="right"

      width="600"

      :footer="null"

    >

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

              <div class="comment-right">

                <span class="comment-likes">{{ comment.like_count }} 人点赞</span>

                <a-popconfirm

                  :title="`确定要删除该评论${comment.reply_count ? '及其所有回复' : ''}吗？`"

                  @confirm="handleDeleteComment(comment)"

                >

                  <a class="delete-text">删除</a>

                </a-popconfirm>

              </div>

            </div>

            <div class="comment-content">{{ comment.content }}</div>

            

            <!-- 回复列表 -->

            <div v-if="comment.replies?.length" class="replies-section">

              <div v-for="reply in displayReplies(comment)" :key="reply.id" class="reply-item">

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

                  <div class="reply-right">

                    <span class="reply-likes">{{ reply.like_count }} 人点赞</span>

                    <a-popconfirm

                      title="确定要删除这条回复吗？"

                      @confirm="handleDeleteReply(comment, reply)"

                    >

                      <a class="delete-text">删除</a>

                    </a-popconfirm>

                  </div>

                </div>

                <div class="reply-content">{{ reply.content }}</div>

              </div>

              

              <!-- 展开更多回复 -->

              <div v-if="comment.reply_count > 3" class="more-replies">

                <a @click="handleToggleReplies(comment)">

                  {{ isExpanded(comment) ? '收起' : `查看全部 ${comment.reply_count} 条回复` }}

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

    </a-drawer>



    <!-- 批量导入音乐表单 -->

    <music-batch-import-modal

      v-model:visible="batchImportVisible"

      @success="handleImportSuccess"

    />

  </div>

</template>



<script setup lang="ts">

import { ref, onMounted, watch, nextTick, reactive } from 'vue'

import { PlusOutlined, FilterOutlined, SearchOutlined, LikeOutlined, CommentOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons-vue'

import { Empty } from 'ant-design-vue'

import type { TablePaginationConfig } from 'ant-design-vue'

import { service } from '@/utils/request'

import type { Music } from '@/types/music'

import type { Tag, TagListResponse } from '@/types/tag'

import defaultCover from '@/assets/default-cover.png'

import { message } from 'ant-design-vue'

import MusicFormModal from '@/components/MusicFormModal.vue'

import dayjs from 'dayjs'

import { useRoute, useRouter } from 'vue-router'

import MusicBatchImportModal from '@/components/MusicBatchImportModal.vue'



const columns = [

  {

    title: '封面',

    dataIndex: 'cover_image',

    width: 80,

    slots: { customRender: 'coverImage' }

  },

  {

    title: '标题',

    dataIndex: 'title',

    width: 200

  },

  {

    title: '艺人',

    dataIndex: 'artist',

    slots: { customRender: 'artists' }

  },

  {

    title: '专辑',

    dataIndex: 'albums',

    slots: { customRender: 'albums' }

  },

  {

    title: '标签',

    dataIndex: 'tags',

    slots: { customRender: 'tags' }

  },

  {

    title: '时长',

    dataIndex: 'duration',

    width: 100,

    customRender: ({ text }) => {

      if (!text) return '-'

      const minutes = Math.floor(text / 60)

      const seconds = text % 60

      return `${minutes}:${seconds.toString().padStart(2, '0')}`

    }

  },

  {

    title: '语言',

    dataIndex: 'language',

    width: 100,

    customRender: ({ text }) => text || '-'

  },

  {

    title: '播放次数',

    dataIndex: 'play_count',

    width: 100,

    customRender: ({ text }) => text || '-'

  },

  {

    title: '收藏次数',

    dataIndex: 'collection_count',

    width: 100,

    customRender: ({ text }) => text || '-'

  },

  {

    title: '评论数',

    dataIndex: 'comment_count',

    width: 100,

    customRender: ({ text }) => text || '-'

  },

  {

    title: '操作',

    key: 'action',

    width: 150,

    slots: { customRender: 'action' }

  }

]



const loading = ref(false)

const musicList = ref<Music[]>([])

const pagination = ref<TablePaginationConfig>({

  total: 0,

  current: 1,

  pageSize: 10

})



const tags = ref<Tag[]>([])

const tagsLoading = ref(false)

const selectedTag = ref<number | undefined>(undefined)



const showMusicForm = ref(false)

const formTitle = ref('添加音乐')

const currentMusicId = ref<number>()

const drawerVisible = ref(false)

const currentMusic = ref<Music | null>(null)



const audioRef = ref<HTMLAudioElement>()



const searchKeyword = ref('')



const isDescriptionExpanded = ref(false)

const showExpandButton = ref(false)

const descriptionRef = ref<HTMLElement>()



const route = useRoute()

const router = useRouter()



const comments = ref([])

const current = ref(1)

const pageSize = ref(10)

const total = ref(0)



// 添加展开状态管理

const expandedComments = ref(new Set<number>())



// 判断评论是否展开

const isExpanded = (comment: any) => {

  return expandedComments.value.has(comment.id)

}



// 获取显示的回复列表

const displayReplies = (comment: any) => {

  if (isExpanded(comment)) {

    return comment.replies

  }

  return comment.replies.slice(0, 3)

}



// 处理展开/收起切换

const handleToggleReplies = async (comment: any) => {

  if (isExpanded(comment)) {

    // 收起

    expandedComments.value.delete(comment.id)

  } else {

    // 展开

    if (comment.replies.length === 3 && comment.reply_count > 3) {

      // 如果还没有加载全部回复，则加载

      try {

        const response = await service.get(`/api/music-comments/${comment.id}/replies`, {

          params: {

            page: 1,

            limit: comment.reply_count

          }

        })

        if (response.success) {

          comment.replies = response.data.list

        }

      } catch (error) {

        console.error('获取回复列表失败:', error)

        message.error('获取回复列表失败')

        return

      }

    }

    expandedComments.value.add(comment.id)

  }

}



// 获取标签列表

const fetchTags = async () => {

  tagsLoading.value = true

  try {

    const response = await service.get<{ data: TagListResponse }>('/api/admin/tags', {

      params: {

        type: 'music',

        page: 1,

        limit: 100

      }

    })

    if (response.success) {

      tags.value = response.data.list

    }

  } catch (error) {

    console.error('获取标签失败:', error)

  } finally {

    tagsLoading.value = false

  }

}



// 获取音乐列表

const fetchMusicList = async () => {

  loading.value = true

  try {

    const response = await service.get('/api/admin/music', {

      params: {

        page: pagination.value.current,

        limit: pagination.value.pageSize,

        tag_id: selectedTag.value,

        keyword: searchKeyword.value

      }

    })

    if (response.success) {

      musicList.value = response.data.list

      pagination.value = {

        ...pagination.value,

        total: response.data.total,

        current: response.data.current,

        pageSize: response.data.pageSize

      }

    }

  } catch (error) {

    console.error('获取音乐列表失败:', error)

    message.error('获取音乐列表失败')

  } finally {

    loading.value = false

  }

}



// 处理表格分页、排序、筛选变化

const handleTableChange = (pag: TablePaginationConfig) => {

  pagination.value.current = pag.current || 1

  pagination.value.pageSize = pag.pageSize || 10

  fetchMusicList()

}



// 处理标签变化

const handleTagChange = (value: number | undefined) => {

  selectedTag.value = value

  pagination.value.current = 1

  fetchMusicList()

}



// 添加音乐

const handleAdd = () => {

  currentMusicId.value = undefined // 清空 musicId

  formTitle.value = '添加音乐'

  showMusicForm.value = true

}



// 自定义行属性

const customRow = (record: Music) => {

  return {

    onClick: () => {

      handleView(record)

    }

  }

}



// 查看音乐详情

const handleView = async (record: Music) => {

  try {

    const response = await service.get(`/api/admin/music/${record.id}`)

    if (response.success) {
      currentMusic.value = response.data

      drawerVisible.value = true

      // 获取音乐详情后立即获取评论

      current.value = 1

      await fetchComments()

    }

  } catch (error) {

    console.error('获取音乐详情失败:', error)

    message.error('获取详情失败')

  }

}



// 编辑音乐

const handleEdit = (record: Music) => {

  currentMusicId.value = record.id

  formTitle.value = '编辑音乐'

  showMusicForm.value = true

}



// 删除音乐

const handleDelete = async (record: Music) => {

  try {

    const response = await service.delete(`/api/admin/music/${record.id}`)

    if (response.success) {

      message.success('删除成功')

      // 如果当前页只有一条数据，且不是第一页，则跳转到上一页

      if (musicList.value.length === 1 && pagination.value.current > 1) {

        pagination.value.current--

      }

      fetchMusicList() // 重新加载列表

    } else {

      message.error(response.data.message || '删除失败')

    }

  } catch (error) {

    console.error('删除音乐失败:', error)

    message.error('删除失败')

  }

}



const handleSuccess = () => {

  fetchMusicList()

}



// 处理播放事件

const handlePlay = async () => {

  try {

    // 可以在这里添加播放量统计等逻辑

    await service.post(`/api/admin/music/${currentMusic.value?.id}/play`)

  } catch (error) {

    console.error('记录播放失败:', error)

  }

}



// 关闭抽屉时停止播放

watch(drawerVisible, (newVal) => {

  if (!newVal && audioRef.value) {

    audioRef.value.pause()

  }

})



// 处理搜索

const handleSearch = () => {

  pagination.value.current = 1

  fetchMusicList()

}



// 监听搜索关键词变化

watch(searchKeyword, (newVal, oldVal) => {

  if (oldVal && !newVal) { // 当搜索词被清空时

    pagination.value.current = 1

    fetchMusicList()

  }

})



// 检查是否需要显示展开按钮

const checkExpandButton = () => {

  if (descriptionRef.value) {

    showExpandButton.value = descriptionRef.value.scrollHeight > 72 // 3行文字的高度

  }

}



// 切换展开/收起状态

const toggleDescription = () => {

  isDescriptionExpanded.value = !isDescriptionExpanded.value

}



// 监听详情数据变化，检查是否需要展开按钮

watch(() => currentMusic.value, () => {

  // 等待 DOM 更新后再检查

  nextTick(() => {

    checkExpandButton()

  })

})



// 监听弹窗关闭

watch(showMusicForm, (newVal) => {

  if (!newVal) {

    currentMusicId.value = undefined // 关闭弹窗时清空 musicId

  }

})



// 修改路由参数监听

watch(

  () => route.query.musicId,

  async (newMusicId) => {

    if (newMusicId) {

      try {

        const response = await service.get(`/api/admin/music/${newMusicId}`)

        if (response.success) {

          currentMusic.value = response.data

          drawerVisible.value = true

          // 获取音乐详情后立即获取评论

          current.value = 1

          await fetchComments()

        }

      } catch (error) {

        console.error('获取音乐详情失败:', error)

        message.error('获取详情失败')

      }

    } else {

      drawerVisible.value = false

      currentMusic.value = null

      comments.value = []

      total.value = 0

      expandedComments.value.clear()

    }

  },

  { immediate: true }

)



// 修改抽屉关闭处理

watch(drawerVisible, (newVal) => {

  if (!newVal) {

    // 关闭音频播放

    if (audioRef.value) {

      audioRef.value.pause()

    }

    

    // 清理状态

    currentMusic.value = null

    commentsDrawerVisible.value = false

    comments.value = []

    total.value = 0

    expandedComments.value.clear()

    

    // 清除路由参数

    if (route.query.musicId) {

      router.replace({

        query: {}

      })

    }

  }

})



// 修改艺人点击处理

const handleArtistClick = (artist: any) => {

  // 先关闭所有抽屉

  drawerVisible.value = false

  commentsDrawerVisible.value = false

  currentMusic.value = null



  // 等待抽屉关闭动画完成后再跳转

  setTimeout(() => {

    router.replace({

      path: '/music/artists',

      query: { 

        artistId: String(artist.id)

      }

    })

  }, 300)

}



// 修改专辑点击处理

const handleAlbumClick = (album: any) => {

  // 先关闭所有抽屉

  drawerVisible.value = false

  commentsDrawerVisible.value = false

  currentMusic.value = null



  // 等待抽屉关闭动画完成后再跳转

  setTimeout(() => {

    router.replace({

      path: '/music/albums',

      query: { 

        albumId: String(album.id)

      }

    })

  }, 300)

}



// 修改获取评论列表函数

const fetchComments = async () => {

  try {

    const response = await service.get('/api/music-comments', {

      params: {

        page: current.value,

        limit: pageSize.value,

        music_id: currentMusic.value?.id

      }

    })

    if (response.success) {

      comments.value = response.data.list

      total.value = response.data.total

    }

  } catch (error) {

    console.error('获取评论列表失败:', error)

    message.error('获取评论列表失败')

  }

}



// 修改处理查看评论函数

const handleViewComments = () => {

  commentsDrawerVisible.value = true

  current.value = 1

  fetchComments()

}



// 删除评论

const handleDeleteComment = async (comment: any) => {

  try {

    const response = await service.delete(`/api/admin/music-comments/${comment.id}`)

    if (response.success) {

      message.success('删除成功')

      // 重新获取评论列表

      await fetchComments()

    }

  } catch (error) {

    console.error('删除评论失败:', error)

    message.error('删除失败')

  }

}



// 删除回复

const handleDeleteReply = async (comment: any, reply: any) => {

  try {

    const response = await service.delete(`/api/admin/music-comments/${reply.id}`)

    if (response.success) {

      message.success('删除成功')

      // 如果评论已展开，重新获取该评论的回复列表

      if (isExpanded(comment)) {

        const repliesResponse = await service.get(`/api/music-comments/${comment.id}/replies`, {

          params: {

            page: 1,

            limit: comment.reply_count - 1 // 减去刚删除的回复

          }

        })

        if (repliesResponse.data.success) {

          comment.replies = repliesResponse.data.data.items

          comment.reply_count-- // 更新回复数量

        }

      } else {

        // 如果评论未展开，直接从当前显示的回复列表中移除

        comment.replies = comment.replies.filter((r: any) => r.id !== reply.id)

        comment.reply_count-- // 更新回复数量

      }

    }

  } catch (error) {

    console.error('删除回复失败:', error)

    message.error('删除失败')

  }

}



// 添加查询参数

const queryParams = reactive({

  music_id: undefined as number | undefined

})



// 修改音乐筛选的监听

watch(

  () => queryParams.music_id,

  (newMusicId) => {

    if (newMusicId) {

      current.value = 1 // 重置页码

      fetchComments() // 重新获取评论列表

    }

  }

)



// 添加评论抽屉相关的状态

const commentsDrawerVisible = ref(false)

// 添加评论抽屉关闭处理

watch(commentsDrawerVisible, (newVal) => {

  if (!newVal) {

    // 关闭抽屉时清理状态

    comments.value = []

    total.value = 0

    expandedComments.value.clear()

  }

})



// 处理标签点击

const handleTagClick = (tag: any) => {

  router.push({

    path: '/tags',

    query: { 

      type: tag.type,

      category: tag.category,

      tagId: String(tag.id)

    }

  })

}



const batchImportVisible = ref(false)



const showBatchImport = () => {

  batchImportVisible.value = true

}



const handleImportSuccess = () => {

  fetchMusicList() // 刷新音乐列表

}



onMounted(() => {

  fetchTags()

  fetchMusicList()

})

</script>


<style scoped>

.music-list {

  padding: 24px;

}



.table-operations {

  margin-bottom: 16px;

  display: flex;

  justify-content: space-between;

  align-items: center;

}



.table-operations .ant-space {

  flex-wrap: wrap;

  gap: 12px;

}



.danger {

  color: #ff4d4f;

}



:deep(.ant-table-pagination) {

  margin: 16px 0;

}



:deep(.ant-select-selection-placeholder) {

  display: flex;

  align-items: center;

}



:deep(.anticon) {

  margin-right: 8px;

}



:deep(.ant-descriptions-item-label) {

  width: 100px;

}



pre {

  white-space: pre-wrap;

  word-wrap: break-word;

  margin: 0;

}



.clickable-row {

  cursor: pointer;

  transition: background-color 0.3s;

}



.clickable-row:hover {

  background-color: #f5f5f5;

}



.lyrics {

  white-space: pre-wrap;

  word-wrap: break-word;

  margin: 0;

  max-height: 300px;

  overflow-y: auto;

  font-family: monospace;

  background-color: #f8f8f8;

  padding: 8px;

  border-radius: 4px;

}



:deep(.ant-descriptions-item-label) {

  width: 100px;

  font-weight: bold;

}



:deep(.ant-descriptions-item-content) {

  word-break: break-all;

}



.album-info {

  display: flex;

  gap: 16px;

  margin-bottom: 16px;

  padding: 8px;

  background-color: #fafafa;

  border-radius: 4px;

}



.album-info:last-child {

  margin-bottom: 0;

}



.album-details {

  flex: 1;

  display: flex;

  flex-direction: column;

  justify-content: center;

}



.album-title {

  font-size: 14px;

  font-weight: 500;

  margin-bottom: 4px;

}



.album-meta {

  font-size: 12px;

  color: rgba(0, 0, 0, 0.65);

}



.album-meta span {

  margin-right: 16px;

  display: inline-flex;

  align-items: center;

}



.album-meta span:last-child {

  margin-right: 0;

}



.audio-player {

  display: flex;

  flex-direction: column;

  gap: 8px;

  padding: 12px;

  background-color: #f8f8f8;

  border-radius: 4px;

}



.custom-audio {

  width: 100%;

  height: 36px;

}



.audio-info {

  display: flex;

  flex-direction: column;

  gap: 4px;

}



.audio-title {

  font-size: 14px;

  font-weight: 500;

  color: rgba(0, 0, 0, 0.85);

}



.audio-artist {

  font-size: 12px;

  color: rgba(0, 0, 0, 0.45);

}



/* 自定义音频播放器样式 */

.custom-audio::-webkit-media-controls-panel {

  background-color: #fff;

}



.custom-audio::-webkit-media-controls-play-button {

  background-color: #1890ff;

  border-radius: 50%;

}



.custom-audio::-webkit-media-controls-current-time-display,

.custom-audio::-webkit-media-controls-time-remaining-display {

  color: rgba(0, 0, 0, 0.65);

}



.artist-description {

  position: relative;

}



.description-content {

  line-height: 24px;

  max-height: 72px; /* 3行文字的高度 */

  overflow: hidden;

  transition: max-height 0.3s ease;

}



.description-content.expanded {

  max-height: none;

}



.description-content:not(.expanded) {

  display: -webkit-box;

  -webkit-box-orient: vertical;

  -webkit-line-clamp: 3;

}



.expand-button {

  display: inline-block;

  margin-top: 8px;

  color: #1890ff;

  cursor: pointer;

}



.expand-button:hover {

  color: #40a9ff;

}



.album-info.clickable {

  cursor: pointer;

  transition: all 0.3s;

}



.album-info.clickable:hover {

  background-color: #f0f0f0;

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

  margin-right: 0;

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

  font-size: 12px;

  min-width: 60px; /* 确保有足够的宽度显示 */

}



.more-replies {

  text-align: center;

  color: #1890ff;

  cursor: pointer;

}



.more-replies:hover {

  color: #40a9ff;

}



/* 添加评论按钮样式 */

:deep(.ant-drawer-extra) {

  padding: 0 24px;

}



.comment-actions,

.reply-actions {

  display: flex;

  align-items: center;

  gap: 8px;

}



.delete-icon {

  color: rgba(0, 0, 0, 0.45);

  cursor: pointer;

  transition: color 0.3s;

}



.delete-icon:hover {

  color: #ff4d4f;

}



.comment-item,

.reply-item {

  position: relative;

}



.comment-actions,

.reply-actions {

  display: flex;

  align-items: center;

  gap: 8px;

  opacity: 0;

  transition: opacity 0.3s;

}



.comment-item:hover > .comment-header .comment-right:hover .comment-actions,

.reply-item:hover > .reply-header .reply-right:hover .reply-actions {

  opacity: 1;

}



.delete-button {

  display: flex;

  align-items: center;

  gap: 4px;

}



.delete-button :deep(.anticon) {

  margin-right: 0;

}



.comment-likes,

.reply-likes {

  color: rgba(0, 0, 0, 0.45);

  font-size: 12px;

  min-width: 60px; /* 确保有足够的宽度显示 */

}



.comment-actions,

.reply-actions {

  display: flex;

  align-items: center;

  gap: 12px; /* 增加间距 */

}



.comment-right,

.reply-right {

  display: flex;

  align-items: center;

  gap: 8px;

}



.comment-likes,

.reply-likes {

  color: rgba(0, 0, 0, 0.45);

  font-size: 12px;

  min-width: 60px;

  text-align: right;

}



.delete-text {

  color: #ff4d4f;

  font-size: 12px;

  cursor: pointer;

}



.delete-text:hover {

  color: #ff7875;

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



.clickable-tag {

  cursor: pointer;

  transition: all 0.3s;

}



.clickable-tag:hover {

  opacity: 0.8;

  transform: scale(1.05);

}

</style> 

