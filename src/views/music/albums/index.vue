<template>
  <div class="albums-list">
    <div class="table-operations">
      <a-space>
        <a-select
          v-model:value="queryParams.type"
          style="width: 120px"
          placeholder="类型筛选"
          @change="handleFilter"
        >
          <a-select-option value="album">专辑</a-select-option>
          <a-select-option value="playlist">歌单</a-select-option>
        </a-select>
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="搜索专辑名称"
          style="width: 200px"
          @search="handleSearch"
          allowClear
        />
        <a-button type="primary" @click="handleAdd">
          <plus-outlined />添加专辑
        </a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="albums"
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
      <!-- 封面 -->
      <template #coverImage="{ record }">
        <template v-if="record.cover_image">
          <div @click.stop>
            <a-image
              :width="80"
              :src="record.cover_image"
              :fallback="defaultCover"
            />
          </div>
        </template>
        <template v-else>
          <div class="empty-cover">
            <picture-outlined />
          </div>
        </template>
      </template>

      <!-- 艺人 -->
      <template #artist="{ record }">
        <template v-if="record.artist">
          <a-tag 
            class="artist-tag clickable" 
            @click.stop="handleArtistClick(record.artist)"
          >
            {{ record.artist.name }}
          </a-tag>
        </template>
        <template v-else>-</template>
      </template>

      <!-- 操作 -->
      <template #action="{ record }">
        <a-space>
          <a @click.stop="handleEdit(record)">编辑</a>
          <a-divider type="vertical" />
          <a-popconfirm
            title="确定要删除这个专辑吗？"
            @confirm="handleDelete(record)"
            @click.stop
          >
            <a class="danger">删除</a>
          </a-popconfirm>
        </a-space>
      </template>
    </a-table>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="currentAlbum?.title"
      placement="right"
      width="800"
      :footer-style="{ textAlign: 'right' }"
      @close="handleDrawerClose"
    >
      <template #extra>

      </template>

      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="封面">
          <a-image
            :width="200"
            :src="currentAlbum?.cover_image"
            :fallback="defaultCover"
          />
        </a-descriptions-item>
        <a-descriptions-item label="艺人">
          <template v-if="currentAlbum?.artist">
            <div class="artist-info clickable" @click="handleArtistClick(currentAlbum.artist)">
              <a-space align="start">
                <a-avatar :src="currentAlbum.artist.avatar" :size="64">
                  {{ currentAlbum.artist.name?.charAt(0) }}
                </a-avatar>
                <div>
                  <div class="artist-name">{{ currentAlbum.artist.name }}</div>
                  <div class="artist-alias">
                    <template v-if="currentAlbum.artist.alias">
                      <a-tag v-for="alias in currentAlbum.artist.alias.split(';')" :key="alias">
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
        <a-descriptions-item label="类型">
          {{ currentAlbum?.type === 'album' ? '专辑' : '歌单' }}
        </a-descriptions-item>
        <a-descriptions-item label="语言">
          {{ currentAlbum?.language || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="发行方">
          {{ currentAlbum?.publisher || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="发行日期">
          {{ currentAlbum?.release_date ? dayjs(currentAlbum.release_date).format('YYYY-MM-DD') : '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="收录歌曲">
          {{ currentAlbum?.track_count || 0 }} 首
        </a-descriptions-item>
        <a-descriptions-item label="简介">
          {{ currentAlbum?.description || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="收录歌曲">
          <div class="tracks-list">
            <div 
              v-for="track in currentAlbum?.tracks" 
              :key="track.id"
              class="track-item clickable"
              @click="handleTrackClick(track)"
            >
              <div class="track-left">
                <div class="track-cover">
                  <a-image
                    :width="40"
                    :height="40"
                    :src="track.cover_image"
                    :fallback="defaultCover"
                  />
                </div>
                <div class="track-info">
                  <div class="track-title">{{ track.title }}</div>
                  <div class="track-meta">
                    <span class="track-artists">
                      {{ track.artists?.map(artist => artist.name).join(', ') }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="track-right">
                <span class="track-duration">{{ formatDuration(track.duration) }}</span>
              </div>
            </div>
          </div>
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>

    <!-- 添加音乐详情抽屉 -->
    <music-detail-drawer
      v-model:visible="musicDrawerVisible"
      :music-id="currentMusicId"
      @album-click="handleAlbumClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { 
  PlusOutlined, 
  PictureOutlined, 
  PlayCircleOutlined,
  PauseCircleOutlined 
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { service } from '@/utils/request'
import defaultCover from '@/assets/default-cover.png'
import dayjs from 'dayjs'
import MusicDetailDrawer from '@/components/MusicDetailDrawer.vue'
import { useRouter, useRoute } from 'vue-router'

const columns = [
  {
    title: '封面',
    dataIndex: 'cover_image',
    width: 100,
    slots: { customRender: 'coverImage' }
  },
  {
    title: '标题',
    dataIndex: 'title',
    width: 200,
    customRender: ({ text }) => text || '-'
  },
  {
    title: '艺人',
    dataIndex: 'artist',
    slots: { customRender: 'artist' }
  },
  {
    title: '类型',
    dataIndex: 'type',
    width: 100,
    customRender: ({ text }) => text === 'album' ? '专辑' : '歌单'
  },
  {
    title: '语言',
    dataIndex: 'language',
    width: 100,
    customRender: ({ text }) => text || '-'
  },
  {
    title: '发行日期',
    dataIndex: 'release_date',
    width: 120,
    customRender: ({ text }) => text ? dayjs(text).format('YYYY-MM-DD') : '-'
  },
  {
    title: '收录歌曲',
    dataIndex: 'track_count',
    width: 100,
    customRender: ({ text }) => `${text || 0} 首`
  },
  {
    title: '播放次数',
    dataIndex: 'view_count',
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
    title: '操作',
    key: 'action',
    width: 200,
    slots: { customRender: 'action' }
  }
]

const trackColumns = [
  {
    title: '标题',
    dataIndex: 'title'
  },
  {
    title: '时长',
    dataIndex: 'duration',
    width: 100,
    slots: { customRender: 'duration' }
  }
]

const loading = ref(false)
const albums = ref([])
const searchKeyword = ref('')
const pagination = ref<TablePaginationConfig>({
  total: 0,
  current: 1,
  pageSize: 10
})

const queryParams = reactive({
  title: '',
  type: undefined as string | undefined
})

const drawerVisible = ref(false)
const currentAlbum = ref(null)

// 格式化时长
const formatDuration = (seconds: number) => {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 获取专辑列表
const fetchAlbums = async () => {
  loading.value = true
  try {
    const response = await service.get('/api/admin/albums', {
      params: {
        page: pagination.value.current,
        limit: pagination.value.pageSize,
        type: queryParams.type,
        keyword: searchKeyword.value
      }
    })
    if (response.success) {
      albums.value = response.data.list
      pagination.value = {
        ...pagination.value,
        total: response.data.total,
        current: response.data.current,
        pageSize: response.data.pageSize
      }
    }
  } catch (error) {
    console.error('获取专辑列表失败:', error)
    message.error('获取专辑列表失败')
  } finally {
    loading.value = false
  }
}

// 获取专辑详情
const fetchAlbumDetail = async (id: number) => {
  try {
    const response = await service.get(`/api/admin/albums/${id}`)
    if (response.success) {
      currentAlbum.value = response.data
    }
  } catch (error) {
    console.error('获取专辑详情失败:', error)
    message.error('获取专辑详情失败')
  }
}

// 处理表格分页变化
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchAlbums()
}

// 处理搜索
const handleSearch = () => {
  pagination.value.current = 1
  fetchAlbums()
}

// 处理筛选
const handleFilter = () => {
  pagination.value.current = 1
  fetchAlbums()
}

// 查看详情
const handleView = async (record: any) => {
  await fetchAlbumDetail(record.id)
  drawerVisible.value = true
}

// 关闭抽屉
const handleDrawerClose = () => {
  drawerVisible.value = false
  currentAlbum.value = null
  // 清除路由参数
  router.replace({
    query: {}
  })
}

// 添加专辑
const handleAdd = () => {
  // TODO: 实现添加专辑功能
  message.info('添加专辑功能开发中')
}

// 编辑专辑
const handleEdit = (record: any) => {
  // TODO: 实现编辑专辑功能
  message.info('编辑专辑功能开发中')
}

// 删除专辑
const handleDelete = async (record: any) => {
  try {
    const response = await service.delete(`/api/admin/albums/${record.id}`)
    if (response.success) {
      message.success('删除成功')
      if (albums.value.length === 1 && pagination.value.current > 1) {
        pagination.value.current--
      }
      fetchAlbums()
    }
  } catch (error) {
    console.error('删除专辑失败:', error)
    message.error('删除失败')
  }
}

// 添加音乐详情相关状态
const musicDrawerVisible = ref(false)
const currentMusicId = ref<number>()

// 添加行点击处理
const customRow = (record: any) => {
  return {
    onClick: () => {
      handleView(record)
    }
  }
}

// 添加音乐行点击处理
const customTrackRow = (record: any) => {
  return {
    onClick: () => {
      currentMusicId.value = record.id
      musicDrawerVisible.value = true
    }
  }
}

// 处理专辑点击
const handleAlbumClick = async (albumId: number) => {
  // 关闭音乐详情
  musicDrawerVisible.value = false
  // 打开专辑详情
  await fetchAlbumDetail(albumId)
  drawerVisible.value = true
}

const router = useRouter()
const route = useRoute()
const audioRefs = ref<Map<number, HTMLAudioElement>>(new Map())
const currentPlayingTrack = ref<any>(null)

// 修改音乐点击处理
const handleTrackClick = (track: any) => {
  // 先跳转到音乐页面
  router.push({
    path: '/music/songs',
    query: { 
      musicId: track.id 
    }
  }).then(() => {
    // 跳转完成后再关闭专辑详情
    drawerVisible.value = false
    currentAlbum.value = null
  })
}

const isPlaying = ref(false)

// 检查是否是当前播放的音乐
const isCurrentPlaying = (track: any) => {
  return currentPlayingTrack.value?.id === track.id && isPlaying.value
}

// 处理播放
const handlePlayTrack = (track: any) => {
  if (currentPlayingTrack.value?.id === track.id) {
    // 如果点击的是当前播放的音乐，则切换播放/暂停
    const audio = audioRefs.value.get(track.id)
    if (audio?.paused) {
      audio.play()
      isPlaying.value = true
    } else {
      audio?.pause()
      isPlaying.value = false
    }
  } else {
    // 停止当前播放的音乐
    if (currentPlayingTrack.value) {
      const currentAudio = audioRefs.value.get(currentPlayingTrack.value.id)
      currentAudio?.pause()
    }
    // 播放新的音乐
    currentPlayingTrack.value = track
    isPlaying.value = true
    nextTick(() => {
      const audio = audioRefs.value.get(track.id)
      if (audio) {
        audio.play()
      }
    })
  }
}

// 处理播放结束
const handlePlayEnd = () => {
  currentPlayingTrack.value = null
  isPlaying.value = false
}

// 处理暂停
const handlePause = () => {
  isPlaying.value = false
}

// 音频引用管理
const setAudioRef = (el: HTMLAudioElement | null, trackId: number) => {
  if (el) {
    audioRefs.value.set(trackId, el)
  } else {
    audioRefs.value.delete(trackId)
  }
}

// 监听路由参数变化
watch(
  () => route.query.albumId,
  async (newAlbumId) => {
    if (newAlbumId) {
      await fetchAlbumDetail(Number(newAlbumId))
      drawerVisible.value = true
    } else {
      // 当参数被清除时关闭抽屉
      drawerVisible.value = false
      currentAlbum.value = null
    }
  },
  { immediate: true }
)

// 初始加载
fetchAlbums()

// 处理艺人点击
const handleArtistClick = (artist: any) => {
  router.push({
    path: '/music/artists',
    query: { 
      artistId: String(artist.id)
    },
    replace: true
  })
}
</script>

<style scoped>
.albums-list {
  padding: 24px;
}

.table-operations {
  margin-bottom: 16px;
}

.danger {
  color: #ff4d4f;
}

.empty-cover {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  color: #999;
}

.empty-cover :deep(.anticon) {
  font-size: 24px;
}

.artist-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.artist-alias {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.artist-alias :deep(.ant-tag) {
  margin-right: 0;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.3s;
}

.clickable-row:hover {
  background-color: #f5f5f5;
}

.tracks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.track-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 4px;
  background: #fafafa;
}

.track-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.track-cover {
  flex-shrink: 0;
}

.track-info {
  flex: 1;
  min-width: 0;
}

.track-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: rgba(0, 0, 0, 0.85);
}

.track-meta {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.track-artists {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-right {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  padding-left: 16px;
}

.clickable {
  cursor: pointer;
  transition: all 0.3s;
}

.clickable:hover {
  background: #f0f0f0;
}

.artist-info {
  padding: 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.artist-info.clickable {
  cursor: pointer;
}

.artist-info.clickable:hover {
  background-color: #f5f5f5;
}

.artist-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.artist-name {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.artist-alias {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.artist-alias :deep(.ant-tag) {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  padding: 0 4px;
}

.artist-tag {
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid rgba(0, 0, 0, 0.65);
  color: rgba(0, 0, 0, 0.65);
  background: transparent;
}

.artist-tag:hover {
  color: rgba(0, 0, 0, 0.85);
  border-color: rgba(0, 0, 0, 0.85);
  background: rgba(0, 0, 0, 0.05);
}
</style> 