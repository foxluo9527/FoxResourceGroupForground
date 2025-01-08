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
        <a-button type="primary" @click="showAddModal">
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
      @row-click="handleRowClick"
    >
      <!-- 封面 -->
      <template #cover="{ record }">
        <a-image
          :src="record.cover_image || DEFAULT_COVER"
          :width="60"
          :height="60"
          style="object-fit: cover; border-radius: 4px;"
          :preview="{
            src: record.cover_image || DEFAULT_COVER,
            mask: false
          }"
        />
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
        <a-space @click.stop>
          <a @click="() => handleEdit(record)">编辑</a>
          <a-divider type="vertical" />
          <a-popconfirm
            title="确定要删除这个专辑吗？"
            @confirm="() => handleDelete(record)"
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
          {{ currentAlbum?.tracks_count || 0 }} 首
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

    <!-- 添加/编辑专辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="editingAlbum ? '编辑专辑' : '添加专辑'"
      @ok="handleSubmit"
      :confirmLoading="submitting"
      width="800px"
    >
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="专辑名称" name="title">
              <a-input v-model:value="formState.title" placeholder="请输入专辑名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="艺人" name="artistId">
              <a-select
                v-model:value="formState.artistId"
                placeholder="请选择艺人"
                show-search
                :loading="artistsLoading"
                :options="artists"
                :filter-option="false"
                @search="handleArtistSearch"
                @focus="() => handleArtistSearch('')"
                style="width: 100%"
              >
                <template #notFoundContent>
                  <span v-if="artistsLoading">搜索中...</span>
                  <span v-else>未找到相关艺人</span>
                </template>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="发行日期" name="release_date">
              <a-date-picker 
                v-model:value="formState.release_date"
                style="width: 100%"
                :show-time="false"
                format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="语言" name="language">
              <a-select v-model:value="formState.language">
                <a-select-option value="中文">中文</a-select-option>
                <a-select-option value="英文">英文</a-select-option>
                <a-select-option value="日文">日文</a-select-option>
                <a-select-option value="韩文">韩文</a-select-option>
                <a-select-option value="粤语">粤语</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="发行公司" name="publisher">
          <a-input v-model:value="formState.publisher" placeholder="请输入发行公司" />
        </a-form-item>

        <a-form-item label="专辑描述" name="description">
          <a-textarea 
            v-model:value="formState.description" 
            :rows="4" 
            placeholder="请输入专辑描述"
          />
        </a-form-item>

        <a-form-item label="封面" name="cover_image">
          <a-upload
            v-model:file-list="formState.fileList"
            list-type="picture-card"
            :show-upload-list="false"
            :before-upload="beforeUploadCover"
            @change="handleCoverChange"
          >
            <img v-if="formState.cover_preview" :src="formState.cover_preview" style="width: 100%" />
            <div v-else>
              <plus-outlined />
              <div style="margin-top: 8px">上传封面</div>
            </div>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
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
import type { FormInstance } from 'ant-design-vue'
import { useDebounceFn } from '@vueuse/core'

const albums = ref<any[]>([])
const loading = ref(false)
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})
const searchKeyword = ref('')

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
    // 构建查询参数
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      type: queryParams.type,
      title: searchKeyword.value
    }
    // 发起请求
    const response = await service.get('/api/admin/albums', { params })
    
    if (response.success) {
      albums.value = response.data.list
      pagination.total = response.data.total
      pagination.current = response.data.current
      pagination.pageSize = response.data.size
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

// 处理表格变化（分页、排序等）
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchAlbums()
}

// 处理搜索
const handleSearch = (value?: string) => {
  if (value !== undefined) {
    searchKeyword.value = value
  }
  pagination.current = 1  // 重置到第一页
  fetchAlbums()
}

// 使用防抖处理搜索关键词变化
const debouncedSearch = useDebounceFn(() => {
  handleSearch()
}, { delay: 300 })

// 监听搜索关键词变化
watch(searchKeyword, () => {
  debouncedSearch()
})

// 组件挂载时获取数据
onMounted(() => {
  fetchAlbums()
})

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
const handleEdit = async (record: any) => {
  editingAlbum.value = record
  try {
    // 获取艺人详情
    const artistId = record.id
    console.log('artistId', artistId)
    if (artistId) {
      const artistResponse = await service.get(`/api/admin/artists/${artistId}`)
      if (artistResponse.success) {
        // 将艺人信息添加到选项列表中
        const artist = artistResponse.data
        artists.value = [{
          label: artist.name,
          value: artist.id
        }]
        // 设置选中的艺人ID
        formState.artistId = artist.id  // 直接使用艺人ID
      }
    }
    console.log('artists', artists.value)

    // 填充其他表单数据
    formState.title = record.title
    formState.description = record.description
    formState.release_date = record.release_date ? dayjs(record.release_date) : undefined
    formState.cover_image = record.cover_image
    formState.cover_preview = record.cover_image
    formState.language = record.language || '中文'
    formState.publisher = record.publisher
    formState.fileList = record.cover_image ? [
      {
        uid: '-1',
        name: 'cover.jpg',
        status: 'done',
        url: record.cover_image
      }
    ] : []

    // 打开弹窗
    modalVisible.value = true
  } catch (error) {
    console.error('获取艺人详情失败:', error)
    message.error('获取艺人详情失败')
  }
}

// 删除专辑
const handleDelete = async (record: any) => {
  try {
    const response = await service.delete(`/api/admin/albums/${record.id}`)
    if (response.success) {
      message.success('删除成功')
      if (albums.value.length === 1 && pagination.current > 1) {
        pagination.current--
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

// 处理筛选
const handleFilter = () => {
  pagination.current = 1
  fetchAlbums()
}

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

// 添加表单引用
const formRef = ref<FormInstance>()

// 修改表单状态接口
interface FormState {
  title: string
  artistId?: number
  description?: string
  release_date?: any
  cover_image?: string      // 当前/原有的封面URL
  cover_preview?: string    // 预览图片URL（可以是本地预览或远程URL）
  language: string
  publisher?: string
  fileList: any[]
  newCoverFile?: File      // 新选择的封面文件
}

// 修改表单初始状态
const formState = reactive<FormState>({
  title: '',
  artistId: undefined,
  description: '',
  release_date: undefined,
  cover_image: undefined,
  cover_preview: undefined,
  language: '中文',
  publisher: '',
  fileList: [],
  newCoverFile: undefined
})

// 标签选项
const tags = ref<{ label: string; value: number }[]>([])
const tagsLoading = ref(false)

// 获取标签列表
const fetchTags = async () => {
  tagsLoading.value = true
  try {
    const response = await service.get('/api/admin/tags', {
      params: { type: 'album' }
    })
    if (response.success && response.data?.list) {
      tags.value = response.data.list.map(tag => ({
        label: tag.name,
        value: tag.id
      }))
    } else {
      tags.value = []
    }
  } catch (error) {
    console.error('获取标签列表失败:', error)
    tags.value = []
  } finally {
    tagsLoading.value = false
  }
}

// 表单验证规则
const rules = {
  title: [{ required: true, message: '请输入专辑名称' }],
  artistId: [{ required: true, message: '请选择艺人' }],
  language: [{ required: true, message: '请选择语言' }]
}

const modalVisible = ref(false)
const submitting = ref(false)
const editingAlbum = ref<any>(null)
const artists = ref<{ label: string, value: number }[]>([])
const artistsLoading = ref(false)

// 显示添加弹窗
const showAddModal = async () => {
  editingAlbum.value = null
  resetForm()
  modalVisible.value = true
  // 加载初始艺术家列表
  await handleArtistSearch('')
}

// 重置表单
const resetForm = () => {
  formState.title = ''
  formState.artistId = undefined
  formState.description = ''
  formState.release_date = undefined
  formState.cover_image = undefined
  formState.cover_preview = undefined
  formState.language = '中文'
  formState.publisher = ''
  formState.fileList = []
}

// 搜索艺人
const handleArtistSearch = async (keyword: string) => {
  artistsLoading.value = true
  try {
    const response = await service.get('/api/admin/artists', {
      params: { 
        keyword: keyword.trim(),  // 处理搜索关键词
        page: 1,
        limit: 20,
        order_by: 'name',  // 按名称排序
        order: 'asc'       // 升序排列
      }
    })
    if (response.success) {
      artists.value = response.data.list.map(item => ({
        label: item.name,
        value: item.id
      }))
    }
  } catch (error) {
    console.error('搜索艺人失败:', error)
    message.error('搜索艺人失败')
  } finally {
    artistsLoading.value = false
  }
}

// 处理封面上传前的验证和预览
const beforeUploadCover = (file: File) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('只能上传图片文件!')
    return false
  }
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    message.error('图片必须小于 2MB!')
    return false
  }

  // 创建本地预览
  const reader = new FileReader()
  reader.onload = (e) => {
    formState.cover_preview = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // 保存文件以供后续上传
  formState.newCoverFile = file
  formState.fileList = [{
    uid: '-1',
    name: file.name,
    status: 'done',
    originFileObj: file
  }]

  // 返回 false 阻止自动上传
  return false
}

// 处理封面变化
const handleCoverChange = (info: any) => {
  // 只在文件被移除时处理
  if (info.file.status === 'removed') {
    handleRemoveCover()
  }
}

// 移除封面
const handleRemoveCover = () => {
  formState.cover_image = undefined
  formState.cover_preview = undefined
  formState.newCoverFile = undefined
  formState.fileList = []
}

// 修改提交表单函数
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    submitting.value = true
    
    // 1. 如果有新选择的封面文件，先上传
    let coverUrl = formState.cover_image // 保留原有封面
    if (formState.newCoverFile) {
      const formData = new FormData()
      formData.append('file', formState.newCoverFile)
      const uploadResponse = await service.post('/api/upload/image', formData)
      if (uploadResponse.success) {
        coverUrl = uploadResponse.data.url
      }
    }

    // 2. 创建/更新专辑
    const albumData = {
      title: formState.title,
      artistId: formState.artistId,
      description: formState.description,
      release_date: formState.release_date?.format('YYYY-MM-DD'),
      cover_image: coverUrl,
      language: formState.language,
      publisher: formState.publisher
    }

    const url = editingAlbum.value 
      ? `/api/admin/albums/${editingAlbum.value.id}`
      : '/api/admin/albums'
    const method = editingAlbum.value ? 'put' : 'post'
    
    const response = await service[method](url, albumData)
    
    if (response.success) {
      message.success(`${editingAlbum.value ? '更新' : '添加'}专辑成功`)
      modalVisible.value = false
      fetchAlbums()
    }
  } catch (error) {
    console.error('提交专辑失败:', error)
    message.error('提交失败')
  } finally {
    submitting.value = false
  }
}

// 在组件挂载时获取标签列表
onMounted(() => {
  fetchTags()
})

// 表格列定义
const columns = [
  {
    title: '封面',
    dataIndex: 'cover_image',
    width: 80,
    slots: {
      customRender: 'cover'
    }
  },
  {
    title: '专辑名称',
    dataIndex: 'title',
    width: 200
  },
  {
    title: '艺人',
    dataIndex: ['artist', 'name'],
    width: 150
  },
  {
    title: '发行日期',
    dataIndex: 'release_date',
    width: 120,
    customRender: ({ text }) => {
      if (!text) return '-'
      return dayjs(text).format('YYYY-MM-DD')
    }
  },
  {
    title: '语言',
    dataIndex: 'language',
    width: 100
  },
  {
    title: '发行公司',
    dataIndex: 'publisher',
    width: 150
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    slots: {
      customRender: 'action'
    }
  }
]

// 处理行点击事件（查看详情）
const handleRowClick = (record: any) => {
  handleView(record)
}

// 添加默认封面常量
const DEFAULT_COVER = 'https://via.placeholder.com/200x200?text=No+Cover'  // 或者使用你的默认封面图片
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

.albums-page {
  padding: 24px;
}

.table-operations {
  margin-bottom: 16px;
}

:deep(.ant-upload-select-picture-card) {
  width: 200px;
  height: 200px;
}

:deep(.ant-upload-list-picture-card-container) {
  width: 200px;
  height: 200px;
}

:deep(.ant-image) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.ant-image-img) {
  object-fit: cover;
  border-radius: 4px;
}
</style> 