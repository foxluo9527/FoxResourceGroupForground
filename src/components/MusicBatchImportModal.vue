<template>
  <a-modal
    :visible="visible"
    title="批量导入音乐"
    width="800px"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :confirmLoading="submitting"
  >
    <div class="import-container">
      <!-- 搜索区域 -->
      <div class="search-area">
        <a-space>
          <a-upload
            directory
            :showUploadList="false"
            :beforeUpload="handleFolderSelect"
            accept="audio/*"
            :disabled="isImportingFolder"
          >
            <a-button :loading="isImportingFolder">
              <folder-outlined />
              选择文件夹
            </a-button>
          </a-upload>
          <a-select
            v-model:value="selectedPlatform"
            style="width: 120px"
            :options="platforms"
            :disabled="isImportingFolder"
          />
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="输入歌曲名称、艺人名称搜索"
            enter-button
            :loading="searching"
            @search="handleSearch"
            style="width: 400px"
            :disabled="isImportingFolder"
          />
        </a-space>
        
        <!-- 添加导入进度条 -->
        <a-progress
          v-if="isImportingFolder"
          :percent="importProgress"
          status="active"
          style="margin-top: 16px"
        />
      </div>

      <!-- 搜索结果列表 -->
      <a-table
        v-if="searchResults.length"
        :columns="columns"
        :data-source="searchResults"
        :row-selection="rowSelection"
        :pagination="pagination"
        :loading="searching"
        :row-key="getMusicKey"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'cover_image'">
            <a-image
              :width="50"
              :src="record.cover_image || defaultCover"
              :fallback="defaultCover"
            />
          </template>
          
          <template v-if="column.key === 'title'">
            <div class="song-info">
              <span class="song-name">{{ record.title }}</span>
            </div>
          </template>
          
          <template v-if="column.key === 'singer'">
            {{ record.singer?.name }}
          </template>
          
          <template v-if="column.key === 'album'">
            {{ record.album?.title }}
          </template>

          <template v-if="column.key === 'action'">
            <a-space>
              <template v-if="record.url">
                <a-button 
                  type="link" 
                  size="small"
                  @click="handlePreview(record)"
                  :loading="record.previewLoading"
                >
                  <template v-if="currentPlaying?.url === record.url">
                    <pause-circle-outlined v-if="isPlaying" />
                    <play-circle-outlined v-else />
                    {{ isPlaying ? '暂停' : '继续' }}
                  </template>
                  <template v-else>
                    <play-circle-outlined />
                    试听
                  </template>
                </a-button>
                <template v-if="!isImportingFolder && !record.uploadFile">
                  <a-upload
                    :show-upload-list="false"
                    :before-upload="(file) => handleUploadForRecord(file, record)"
                    accept="audio/*"
                  >
                    <a-button type="link" size="small">
                      <redo-outlined />
                      重新选择
                    </a-button>
                  </a-upload>
                </template>
              </template>
              <template v-else>
                <span class="no-resource">暂无资源</span>
                <template v-if="!isImportingFolder">
                  <a-upload
                    :show-upload-list="false"
                    :before-upload="(file) => handleUploadForRecord(file, record)"
                    accept="audio/*"
                  >
                    <a-button type="link" size="small">
                      <upload-outlined />
                      上传资源
                    </a-button>
                  </a-upload>
                </template>
              </template>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>
  </a-modal>

  <!-- 音频预览组件 -->
  <audio ref="audioPlayer" style="display: none" />
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  UploadOutlined,
  RedoOutlined,
  FolderOutlined
} from '@ant-design/icons-vue'
import { service } from '@/utils/request'

interface MusicItem {
  title: string
  description: string
  language: string
  url: string
  cover_image?: string
  singers?: Array<{
    id: number
    name: string
    alias?: string
    avatar?: string
  }>
  singer?: {
    id: number
    name: string
    alias?: string
    avatar?: string
  }
  album: {
    title: string
    cover_image?: string
  }
  lrc: {
    lyric: string
    lyric_trans: string
  }
  previewLoading?: boolean
  disabled?: boolean
  uploadFile?: File
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible', 'success'])

// 搜索相关
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref<MusicItem[]>([])
const selectedSongs = ref<MusicItem[]>([])
const submitting = ref(false)
const audioPlayer = ref<HTMLAudioElement>()

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  onChange: (page: number, pageSize: number) => {
    pagination.current = page
    pagination.pageSize = pageSize
    handleSearch()
  }
})

// 添加默认封面
import defaultCover from '@/assets/default-cover.png'

// 表格列定义
const columns = [
  {
    title: '封面',
    dataIndex: 'cover_image',
    key: 'cover_image',
    width: '80px'
  },
  {
    title: '歌曲名称',
    dataIndex: 'title',
    key: 'title',
    width: '30%'
  },
  {
    title: '艺人',
    dataIndex: 'singer',
    key: 'singer',
    width: '20%'
  },
  {
    title: '专辑',
    dataIndex: 'album',
    key: 'album',
    width: '30%'
  },
  {
    title: '操作',
    key: 'action',
    width: '20%'
  }
]

// 添加播放控制相关状态
const currentPlaying = ref<MusicItem | null>(null)
const isPlaying = ref(false)

// 添加文件上传相关状态
const audioFile = ref<File | null>(null)

// 添加音乐资源映射
const musicResourceMap = ref<Map<string, { url: string, file: File }>>(new Map())

// 添加获取复选框属性的函数
const getCheckboxProps = (record: MusicItem) => ({
  disabled: !record.url && !record.uploadFile,  // 有 URL 或本地文件时可选
  name: record.title,
})

// 监听音频播放状态
const setupAudioListeners = () => {
  if (!audioPlayer.value) return

  audioPlayer.value.onplay = () => {
    isPlaying.value = true
  }

  audioPlayer.value.onpause = () => {
    isPlaying.value = false
  }

  audioPlayer.value.onended = () => {
    isPlaying.value = false
    currentPlaying.value = null
  }

  audioPlayer.value.onerror = () => {
    isPlaying.value = false
    currentPlaying.value = null
    message.error('播放出错')
  }
}

// 添加音乐平台选择
const platforms = [
  { label: '网易云音乐', value: 'netease' },
  { label: 'QQ音乐', value: 'qq' }
]
const selectedPlatform = ref('netease')

// 添加一个函数来获取音乐的唯一标识
const getMusicKey = (record: MusicItem) => {
  // 使用 title 作为基础标识，因为它是最稳定的
  return `${record.title}_${record.singer?.name || 'unknown'}`
}

// 修改表格配置
const rowSelection = computed(() => ({
  type: 'checkbox',
  // 使用相同的 getMusicKey 函数来生成 selectedRowKeys
  selectedRowKeys: selectedSongs.value.map(song => getMusicKey(song)),
  onChange: (_selectedRowKeys: string[], selectedRows: MusicItem[]) => {
    selectedSongs.value = selectedRows
  },
  getCheckboxProps,
  preserveSelectedRowKeys: true
}))

// 处理搜索
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    message.warning('请输入搜索关键词')
    return
  }

  searching.value = true
  try {
    const response = await service.get(`/api/public/music/search/${selectedPlatform.value}`, {
      params: {
        keyword: searchKeyword.value,
        page: pagination.current,
        limit: pagination.pageSize
      }
    })

    if (response.success && response.data?.items) {
      searchResults.value = response.data.items.map(item => {
        const resourceInfo = musicResourceMap.value.get(item.title)
        return {
          ...item,
          url: resourceInfo?.url || item.url,
          uploadFile: resourceInfo?.file,
          singer: item.singers?.[0] || item.singer, // 兼容两种数据格式
          cover_image: item.album?.cover_image || item.cover_image || defaultCover // 优先使用专辑封面
        }
      })
      pagination.total = response.data.total
    } else {
      searchResults.value = []
      pagination.total = 0
      message.warning(response.message || '未找到相关音乐')
    }
  } catch (error) {
    console.error('搜索失败:', error)
    message.error('搜索失败')
    searchResults.value = []
    pagination.total = 0
  } finally {
    searching.value = false
  }
}

// 修改预览处理函数
const handlePreview = async (record: MusicItem) => {
  // 如果没有 URL，尝试使用上传的文件
  if (!record.url && !audioFile.value) {
    message.warning('暂无可播放资源')
    return
  }

  try {
    // 如果是当前播放的歌曲，则切换播放/暂停状态
    if (currentPlaying.value?.url === record.url) {
      if (audioPlayer.value?.paused) {
        audioPlayer.value.play()
      } else {
        audioPlayer.value?.pause()
      }
      return
    }

    // 如果是新的歌曲
    record.previewLoading = true
    
    // 停止当前播放的歌曲
    if (currentPlaying.value) {
      audioPlayer.value?.pause()
      currentPlaying.value.previewLoading = false
    }

    // 设置新的播放歌曲
    currentPlaying.value = record
    
    if (audioPlayer.value) {
      // 如果有 URL 使用 URL，否则使用上传的文件
      if (record.url) {
        audioPlayer.value.src = record.url
      } else if (audioFile.value) {
        audioPlayer.value.src = URL.createObjectURL(audioFile.value)
      }
      setupAudioListeners()
      await audioPlayer.value.play()
    }
  } catch (error) {
    console.error('播放失败:', error)
    message.error('播放失败')
    currentPlaying.value = null
  } finally {
    record.previewLoading = false
  }
}

// 添加文件上传处理函数
const handleFileUpload = (file: File) => {
  audioFile.value = file
  // 更新所有搜索结果的可选择状态
  searchResults.value = searchResults.value.map(item => ({
    ...item,
    url: item.url || URL.createObjectURL(file)  // 如果没有 URL，使用上传文件的 URL
  }))
}

// 处理单个记录的文件上传
const handleUploadForRecord = async (file: File, record: MusicItem) => {
  try {
    // 验证文件
    const isAudio = file.type.startsWith('audio/')
    if (!isAudio) {
      message.error('只能上传音频文件！')
      return Upload.LIST_IGNORE
    }
    const isLt100M = file.size / 1024 / 1024 < 100
    if (!isLt100M) {
      message.error('音频文件大小不能超过 100MB！')
      return Upload.LIST_IGNORE
    }

    // 如果之前有上传的文件，先清理 URL
    const oldResource = musicResourceMap.value.get(record.title)
    if (oldResource?.url) {
      URL.revokeObjectURL(oldResource.url)
    }

    // 更新当前记录的 URL
    const objectUrl = URL.createObjectURL(file)
    record.url = objectUrl
    record.uploadFile = file

    // 更新资源映射
    musicResourceMap.value.set(record.title, {
      url: objectUrl,
      file: file
    })

    // 如果正在播放这个文件，停止播放
    if (currentPlaying.value?.url === record.url) {
      audioPlayer.value?.pause()
      currentPlaying.value = null
      isPlaying.value = false
    }

    // 允许选择该记录
    if (record.disabled) {
      record.disabled = false
    }

    message.success('音频文件已就绪')
    return false
  } catch (error) {
    console.error('处理上传文件失败:', error)
    message.error('处理上传文件失败')
    return Upload.LIST_IGNORE
  }
}

// 添加状态控制
const isImportingFolder = ref(false)
const importingFiles = ref<File[]>([])
const importProgress = ref(0)

// 修改文件夹处理函数
const handleFolderSelect = async (file: File) => {
  console.log('处理文件:', file.name)
  // 如果是第一个文件，清空搜索结果并开始导入模式
  if (importingFiles.value.length === 0) {
    isImportingFolder.value = true
    searchResults.value = []
    selectedSongs.value = []
  }

  // 检查是否是音频文件
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext)) {
    return Upload.LIST_IGNORE
  }

  // 添加到导入列表
  importingFiles.value.push(file)

  // 如果是最后一个文件，立即开始处理
  if (file.webkitRelativePath.split('/').length === 2) {
    console.log('检测到最后一个文件，开始处理')
    handleFolderImportComplete()
  }

  return Upload.LIST_IGNORE
}

// 只保留使用防抖的 watch
const debouncedImportComplete = ref<NodeJS.Timeout>()

watch(importingFiles, (newFiles) => {
  if (newFiles.length > 0) {
    // 清除之前的定时器
    if (debouncedImportComplete.value) {
      clearTimeout(debouncedImportComplete.value)
    }
    // 设置新的定时器，等待500ms确保所有文件都被收集
    debouncedImportComplete.value = setTimeout(() => {
      console.log('开始处理收集到的文件')
      handleFolderImportComplete()
    }, 500)
  }
})

// 在组件卸载时清理定时器
onUnmounted(() => {
  if (debouncedImportComplete.value) {
    clearTimeout(debouncedImportComplete.value)
  }
})

// 修改文件夹导入完成的处理函数
const handleFolderImportComplete = async () => {
  if (importingFiles.value.length === 0) return
  console.log('开始处理文件列表，共', importingFiles.value.length, '个文件')

  try {
    // 开始处理所有文件
    const totalFiles = importingFiles.value.length
    searchResults.value = []

    // 使用 Promise.all 并行处理所有文件
    const searchPromises = importingFiles.value.map(async (file, index) => {
      const fileName = file.name.replace(/\.[^/.]+$/, '') // 移除扩展名
      console.log('开始搜索音乐信息:', fileName)

      // 更新进度
      importProgress.value = Math.round(((index + 1) / totalFiles) * 100)

      try {
        // 从文件名中提取歌手和歌曲名
        const [songName, artistName] = fileName.split(' - ')
        const searchKeyword = artistName ? `${songName} ${artistName}` : songName

        // 搜索音乐信息
        const searchResponse = await service.get(`/api/public/music/search/${selectedPlatform.value}`, {
          params: {
            keyword: searchKeyword,
            page: 1,
            limit: 1
          }
        })
        console.log(`搜索结果 (${fileName}):`, searchResponse)

        // 创建音乐项
        const musicItem: MusicItem = searchResponse.success && searchResponse.data?.items?.[0]
          ? {
              ...searchResponse.data.items[0],
              uploadFile: file,
              url: URL.createObjectURL(file),
              singer: searchResponse.data.items[0].singers?.[0] || searchResponse.data.items[0].singer,
              album: searchResponse.data.items[0].album || { title: '未知专辑' },
              language: searchResponse.data.items[0].language || '未知',
              lrc: searchResponse.data.items[0].lrc || { lyric: '', lyric_trans: '' }
            }
          : {
              title: songName,
              description: '',
              uploadFile: file,
              url: URL.createObjectURL(file),
              singer: { name: artistName || '未知歌手' },
              album: { title: '未知专辑' },
              language: '未知',
              lrc: { lyric: '', lyric_trans: '' }
            }

        return musicItem
      } catch (error) {
        console.error(`搜索音乐信息失败 (${fileName}):`, error)
        // 即使搜索失败也返回基本信息
        return {
          title: songName,
          description: '',
          uploadFile: file,
          url: URL.createObjectURL(file),
          singer: { name: artistName || '未知歌手' },
          album: { title: '未知专辑' },
          language: '未知',
          lrc: { lyric: '', lyric_trans: '' }
        }
      }
    })

    // 等待所有搜索完成
    const results = await Promise.all(searchPromises)
    searchResults.value = results
    
    // 自动选中所有导入的音乐
    selectedSongs.value = [...searchResults.value]
    console.log('处理完成，共导入', searchResults.value.length, '首音乐')
  } finally {
    // 重置状态
    importingFiles.value = []
    importProgress.value = 0
    isImportingFolder.value = false
  }
}

// 修改清理函数
const handleCancel = () => {
  searchKeyword.value = ''
  searchResults.value = []
  selectedSongs.value = []
  pagination.current = 1
  
  // 停止播放
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value.src = ''
  }
  currentPlaying.value = null
  isPlaying.value = false
  
  // 清理所有资源
  musicResourceMap.value.forEach((resource) => {
    if (resource.url) {
      URL.revokeObjectURL(resource.url)
    }
  })
  musicResourceMap.value.clear()
  
  isImportingFolder.value = false
  importingFiles.value = []
  importProgress.value = 0
  
  emit('update:visible', false)
}

// 添加上传图片的函数
const uploadImageByUrl = async (imageUrl: string, filename: string) => {
  if (!imageUrl) return ''
  
  try {
    const uploadResponse = await service.post('/api/upload/image', {
      url: imageUrl,
      filename
    })
    
    if (!uploadResponse.success) {
      console.error('图片上传失败:', uploadResponse.message)
      return ''
    }
    return uploadResponse.data.url
  } catch (error) {
    console.error('图片上传失败:', error)
    return ''
  }
}

// 修改提交函数中的处理逻辑
const handleSubmit = async () => {
  if (!selectedSongs.value.length) {
    message.warning('请选择要导入的音乐')
    return
  }

  submitting.value = true
  let successCount = 0
  let failCount = 0
  const totalCount = selectedSongs.value.length

  try {
    for (const song of selectedSongs.value) {
      try {
        // 处理音乐文件上传
        let musicUrl = song.url
        if (song.uploadFile) {
          const formData = new FormData()
          formData.append('file', song.uploadFile)
          const uploadResponse = await service.post('/api/upload/audio', formData)
          
          if (!uploadResponse.success) {
            console.error('音乐文件上传失败:', uploadResponse.message)
            failCount++
            continue
          }
          musicUrl = uploadResponse.data.url
        } else if (song.url) {
          try {
            // 直接将 URL 传给后端处理
            const uploadResponse = await service.post('/api/upload/audio', {
              url: song.url,  // 添加 URL 参数
              filename: `${song.title}.mp3`  // 可选：提供文件名
            })
            
            if (!uploadResponse.success) {
              console.error('音乐文件上传失败:', uploadResponse.message)
              failCount++
              continue
            }
            musicUrl = uploadResponse.data.url
          } catch (error) {
            console.error('音乐文件上传失败:', error)
            failCount++
            continue
          }
        }

        // 处理艺人封面上传
        const artists = song.singers || [song.singer]
        const processedArtists = await Promise.all(
          artists.map(async (artist) => {
            if (artist.avatar) {
              const avatarUrl = await uploadImageByUrl(
                artist.avatar,
                `artist_${artist.name}_avatar.jpg`
              )
              return { ...artist, avatar: avatarUrl }
            }
            return artist
          })
        )

        // 处理专辑封面上传
        let processedAlbum = song.album
        if (song.album?.cover_image) {
          const albumCoverUrl = await uploadImageByUrl(
            song.album.cover_image,
            `album_${song.album.title}_cover.jpg`
          )
          processedAlbum = {
            ...song.album,
            cover_image: albumCoverUrl
          }
        }

        // 创建音乐记录
        const musicData = {
          title: song.title,
          description: song.description || '',
          url: musicUrl,
          cover_image: processedAlbum?.cover_image || '',  // 使用专辑封面作为音乐封面
          language: song.language,
          lyrics: song.lrc?.lyric || '',
          lyrics_trans: song.lrc?.lyric_trans || '',
          artists: processedArtists,  // 使用处理后的艺人信息
          album: processedAlbum  // 使用处理后的专辑信息
        }

        const createResponse = await service.post('/api/admin/music', musicData)
        
        if (createResponse.success) {
          successCount++
        } else {
          console.error('创建音乐记录失败:', createResponse.message)
          failCount++
        }
      } catch (error) {
        console.error('导入音乐失败:', error)
        failCount++
      }
    }

    // 显示导入结果
    message.success(`导入完成：共选择 ${totalCount} 首，成功 ${successCount} 首，失败 ${failCount} 首`)
    
    // 触发成功事件并关闭弹窗
    emit('success')
    handleCancel()
  } catch (error) {
    console.error('批量导入失败:', error)
    message.error('批量导入失败')
  } finally {
    submitting.value = false
  }
}

// 修改组件卸载时的清理
onUnmounted(() => {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value.src = ''
  }
  
  // 清理所有资源
  musicResourceMap.value.forEach((resource) => {
    if (resource.url) {
      URL.revokeObjectURL(resource.url)
    }
  })
  musicResourceMap.value.clear()
})
</script>

<style scoped>
.import-container {
  min-height: 200px;
}

.search-area {
  margin-bottom: 16px;
}

.song-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ant-btn-link {
  padding: 0 4px;
}

.anticon {
  margin-right: 4px;
}

.no-resource {
  color: #999;
  font-size: 12px;
  margin-right: 8px;
}

.ant-upload {
  margin-left: 8px;
}

.ant-btn-link {
  padding: 0 4px;
}

.anticon {
  margin-right: 4px;
}

.ant-image {
  border-radius: 4px;
  overflow: hidden;
}
</style> 