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
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="输入歌曲名称、艺人名称搜索"
          enter-button
          :loading="searching"
          @search="handleSearch"
          style="width: 400px"
        />
      </div>

      <!-- 搜索结果列表 -->
      <a-table
        v-if="searchResults.length"
        :columns="columns"
        :data-source="searchResults"
        :row-selection="{ 
          selectedRowKeys: selectedKeys,
          onChange: onSelectionChange,
          getCheckboxProps: getCheckboxProps
        }"
        :pagination="pagination"
        :loading="searching"
        row-key="url"
      >
        <template #bodyCell="{ column, record }">
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
                <template v-if="record.uploadFile">
                  <a-upload
                    :show-upload-list="false"
                    :before-upload="(file) => handleUploadForRecord(file, record)"
                    accept="audio/*"
                  >
                    <a-button 
                      type="link" 
                      size="small"
                    >
                      <redo-outlined />
                      重新选择
                    </a-button>
                  </a-upload>
                </template>
              </template>
              <template v-else>
                <span class="no-resource">暂无资源</span>
                <a-upload
                  :show-upload-list="false"
                  :before-upload="(file) => handleUploadForRecord(file, record)"
                  accept="audio/*"
                >
                  <a-button 
                    type="link" 
                    size="small"
                  >
                    <upload-outlined />
                    上传资源
                  </a-button>
                </a-upload>
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
import { ref, reactive, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  UploadOutlined,
  RedoOutlined
} from '@ant-design/icons-vue'
import { service } from '@/utils/request'

interface MusicItem {
  title: string
  description: string
  language: string
  url: string
  singer: {
    name: string
  }
  album: {
    title: string
  }
  lrc: {
    lyric: string
    lyric_trans: string
  }
  previewLoading?: boolean
  disabled?: boolean
  uploadFile?: File  // 添加上传文件引用
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible', 'success'])

// 搜索相关
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref<MusicItem[]>([])
const selectedKeys = ref<(string | number)[]>([])
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

// 表格列定义
const columns = [
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
  disabled: !record.url && !audioFile.value,  // 没有 URL 且没有上传文件时禁用选择
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

// 处理搜索
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    message.warning('请输入搜索关键词')
    return
  }

  searching.value = true
  try {
    const response = await service.get('/api/public/music/search', {
      params: {
        keyword: searchKeyword.value,
        page: pagination.current,
        limit: pagination.pageSize
      }
    })

    console.log('搜索结果:', response)
    
    if (response.success && response.data?.items) {
      // 处理搜索结果，恢复已上传的文件状态
      searchResults.value = response.data.items.map(item => {
        const resourceInfo = musicResourceMap.value.get(item.title)
        return {
          ...item,
          url: resourceInfo?.url || item.url,
          uploadFile: resourceInfo?.file
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

// 处理选择变化
const onSelectionChange = (selectedRowKeys: (string | number)[], selectedRows: MusicItem[]) => {
  selectedKeys.value = selectedRowKeys
  selectedSongs.value = selectedRows
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

// 修改取消处理函数
const handleCancel = () => {
  searchKeyword.value = ''
  searchResults.value = []
  selectedKeys.value = []
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
  
  emit('update:visible', false)
}

// 提交导入
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
        let musicUrl = song.url

        // 如果是上传的文件，直接上传
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
        } 
        // 如果有在线资源，需要先下载再上传
        else if (song.url) {
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

        // 创建音乐记录
        const musicData = {
          title: song.title,
          description: song.description || '',
          url: musicUrl,
          language: song.language,
          lyrics: song.lrc?.lyric || '',
          lyrics_trans: song.lrc?.lyric_trans || '',
          artist_name: song.singer?.name || '',
          album_title: song.album?.title || ''
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
</style> 