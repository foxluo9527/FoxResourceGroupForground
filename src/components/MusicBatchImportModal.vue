<template>
  <a-modal
    :visible="visible"
    title="批量导入音乐"
    width="1100px"
    :height="640"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :confirmLoading="submitting"
    :maskClosable="!submitting"
    :closable="!submitting"
    :keyboard="!submitting"
    :footer="submitting ? null : undefined"
    wrapClassName="batch-import-modal"
    :centered="true"
    :destroyOnClose="true">
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
          :disabled="isImportingFolder"/>
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="输入歌曲名称、艺人名称搜索"
          enter-button
          :loading="searching"
          @search="handleSearch"
          style="width: 400px"
          :disabled="isImportingFolder"/>
        </a-space>
          
        <!-- 添加导入进度条 -->
        <a-progress
          v-if="isImportingFolder"
          :percent="importProgress"
          status="active"
          style="margin-top: 16px"/>

        <!-- 修改搜索结果列表 -->
        <div class="table-container">
          <a-table
          v-if="searchResults.length"
            :columns="columns"
          :data-source="searchResults"
          :row-selection="rowSelection"
          :pagination="{
            ...pagination,
            position: ['bottomCenter'],
            size: 'small',
            showTotal: (total) => `共 ${total} 条`
          }"
          :loading="searching"
          :row-key="getMusicKey"
          :scroll="{ y: 370 }"
        >
            <template #bodyCell="{ column, record, index }">
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
                <!-- 试听按钮 -->
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
                </template>

                <!-- 导入模式下的刷新按钮 -->
                <template v-if="isImportModel">
                  <a-button 
                    type="link" 
                    size="small"
                    @click="refreshMusicInfo(record, index)"
                  >
                    <redo-outlined />
                    重新获取
                  </a-button>
                </template>

                <!-- 重新选择/上传资源按钮 -->
                <template v-if="record.url">
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
          
          <!-- 添加空状态 -->
          <div v-else class="empty-state">
            <a-empty
              :image="searching ? undefined : Empty.PRESENTED_IMAGE_SIMPLE"
              :description="searching ? '搜索中...' : '暂无数据'"
            />
          </div>
        </div>
      </div>

      <!-- 修改提交状态显示 -->
      <div v-if="submitting" class="submit-overlay">
        <div class="submit-status">
          <a-spin size="large" />
          <div class="status-text">
            <div>正在提交: {{ submitStatus.current }}/{{ submitStatus.total }}</div>
            <div>成功: {{ submitStatus.success }}, 失败: {{ submitStatus.fail }}</div>
          </div>
        </div>
      </div>

      <!-- 音频预览组件 -->
      <audio ref="audioPlayer" style="display: none" />

      <!-- 添加文件确认弹窗 -->
      <a-modal
        v-model:visible="showFileConfirmModal"
        title="确认导入文件"
        width="600px"
        :height="500"
        @ok="confirmImportFiles"
        @cancel="cancelImportFiles"
        :okButtonProps="{ loading: confirming }"
        wrapClassName="file-confirm-modal"
        :centered="true"
      >
        <div class="confirm-modal-content">
          <div class="file-list-header">
            <div class="header-left">
              <a-checkbox
                :indeterminate="indeterminate"
                :checked="checkAll"
                @change="onCheckAllChange"
              >
                全选
              </a-checkbox>
              <span class="file-count">
                已选择 {{ selectedFiles.length }}/{{ filteredFiles.length }} 个文件
              </span>
            </div>
            <a-checkbox
              v-model:checked="deleteAfterUpload"
              @change="handleDeleteOptionChange"
            >
              上传完成后删除源文件
            </a-checkbox>
          </div>
          
          <a-list
            :data-source="filteredFiles"
            size="small"
            bordered
            class="file-list"
            :style="{ height: '350px', overflow: 'auto' }"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <div class="file-item">
                  <a-checkbox
                    :checked="selectedFiles.includes(item.name)"
                    @change="(e) => handleFileSelect(item.name, e.target.checked)"
                  />
                  <sound-outlined />
                  <span class="file-name">{{ item.name }}</span>
                  <span class="file-size">{{ formatFileSize(item.size) }}</span>
              </div>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </a-modal>

      <!-- 属性选择弹窗 -->
      <a-modal
        v-model:visible="propertyModalVisible"
        title="选择要更新的属性"
        @ok="handlePropertyUpdate"
        :width="900"
        :mask="true"
        :maskClosable="false"
        :keyboard="false"
        :centered="true"
        :bodyStyle="{
          padding: '0',
          height: '550px',
          overflow: 'hidden'
        }"
        wrapClassName="property-modal"
      >
        <div class="compare-header">
          <div class="header-cell">当前值</div>
          <div class="header-cell">搜索结果</div>
        </div>
        <div style="height: calc(100% - 41px); overflow-y: auto; padding: 0 16px;">
          <a-checkbox-group v-model:value="selectedProperties">
            <div v-if="newMusicInfo" class="property-item" v-for="(key, index) in availableProperties" :key="index">
              <div class="property-label">
                <a-checkbox :value="key">{{ propertyLabels[key] }}</a-checkbox>
              </div>
              <div class="property-content">
                <div class="old-value">
                  <a-descriptions :column="1" size="small" :bordered="true">
                    <a-descriptions-item>
                      <template #label>{{ propertyLabels[key] }}</template>
                      <div class="value-content" :class="getValueClass(key)">
                        {{ formatValue(currentMusic[key]) }}
                      </div>
                    </a-descriptions-item>
                  </a-descriptions>
                </div>
                <div class="new-value">
                  <a-descriptions :column="1" size="small" :bordered="true">
                    <a-descriptions-item>
                      <template #label>{{ propertyLabels[key] }}</template>
                      <a-input
                        v-if="!isComplexValue(newMusicInfo[key])"
                        v-model:value="editableValues[key]"
                        :placeholder="`请输入${propertyLabels[key]}`"
                      />
                      <a-textarea
                        v-else
                        v-model:value="editableValues[key]"
                        :placeholder="`请输入${propertyLabels[key]} (JSON格式)`"
                        :status="isValidJson(editableValues[key]) ? '' : 'error'"
                        class="json-textarea"
                        :class="getTextareaClass(key)"
                      />
                    </a-descriptions-item>
                  </a-descriptions>
                </div>
              </div>
            </div>
          </a-checkbox-group>
        </div>
      </a-modal>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted, computed, watch, onMounted, h } from 'vue'
import { message, Empty, Modal, Input } from 'ant-design-vue'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  UploadOutlined,
  RedoOutlined,
  FolderOutlined,
  SoundOutlined
} from '@ant-design/icons-vue'
import { service } from '@/utils/request'

interface MusicItem {
  title: string
  description: string
  language: string
  url: string
  tags: string[]
  duration: number
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
  if(isImportModel){
    if(searchKeyword.value.trim()){
      // 清空导入文件列表
      cancelImportFiles()
    }else{
      return
    }
  }
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
          tags: item.tags || [],
          language: item.language || '未知',
          description: item.description || '无',
          duration: item.duration || 0,
          album: item.album || null,
          url: resourceInfo?.url || item.url,
          uploadFile: resourceInfo?.file,
          singers: item.singers || [],
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
let isImportModel = false
// 添加文件确认相关状态
const showFileConfirmModal = ref(false)
const confirming = ref(false)
const deleteAfterUpload = ref(false)
const filteredFiles = ref<File[]>([])

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// 修改文件夹处理函数
const handleFolderSelect = async (file: File) => {
  console.log('处理文件:', file.name)
  
  // 检查是否是音频文件
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext)) {
    return Upload.LIST_IGNORE
  }

  // 如果是第一个文件，重置所有状态并显示确认弹窗
  if (!filteredFiles.value.length) {
    // 重置所有相关状态
    filteredFiles.value = []
    selectedFiles.value = []
    importingFiles.value = []
    importProgress.value = 0
    isImportingFolder.value = false
    showFileConfirmModal.value = true
  }

  // 添加到待确认列表
  filteredFiles.value.push(file)

  return Upload.LIST_IGNORE
}

// 添加文件选择相关状态
const selectedFiles = ref<string[]>([])
const indeterminate = computed(() => {
  return selectedFiles.value.length > 0 && selectedFiles.value.length < filteredFiles.value.length
})
const checkAll = computed(() => {
  return filteredFiles.value.length > 0 && selectedFiles.value.length === filteredFiles.value.length
})

// 修改文件选择处理函数
const handleFileSelect = (fileName: string, checked: boolean) => {
  if (checked) {
    selectedFiles.value.push(fileName)
  } else {
    selectedFiles.value = selectedFiles.value.filter(name => name !== fileName)
  }
}

// 修改全选处理函数
const onCheckAllChange = (e: { target: { checked: boolean } }) => {
  selectedFiles.value = e.target.checked
    ? [...filteredFiles.value.map(file => file.name)]
    : []
}

// 修改确认导入函数
const confirmImportFiles = async () => {
  if (!selectedFiles.value.length) {
    message.warning('请选择要导入的文件')
    return
  }

  confirming.value = true
  try {
    // 只添加选中的文件到导入列表
    importingFiles.value = filteredFiles.value.filter(file => 
      selectedFiles.value.includes(file.name)
    )
    
    showFileConfirmModal.value = false
    isImportModel = true
    isImportingFolder.value = true
    searchResults.value = []
    selectedSongs.value = []
    pagination.current = 1
    pagination.total = 0
    searchKeyword.value = ''
    
  } catch (error) {
    console.error('确认导入文件失败:', error)
    message.error('确认导入文件失败')
  } finally {
    confirming.value = false
    // 重置文件选择相关状态，但保持导入状态
    filteredFiles.value = []
    selectedFiles.value = []
  }
}

// 修改取消导入函数
const cancelImportFiles = () => {
  // 重置所有状态
  filteredFiles.value = []
  selectedFiles.value = []
  showFileConfirmModal.value = false
  isImportModel = false
  isImportingFolder.value = false
  importingFiles.value = []
  importProgress.value = 0
}

// 处理删除选项变化
const handleDeleteOptionChange = (e: any) => {
  // 保存用户选择到 localStorage
  localStorage.setItem('deleteAfterUpload', e.target.checked.toString())
}

// 初始化时读取用户之前的选择
onMounted(() => {
  const savedDeleteOption = localStorage.getItem('deleteAfterUpload')
  if (savedDeleteOption !== null) {
    deleteAfterUpload.value = savedDeleteOption === 'true'
  }
})

// 只保留使用防抖的 watch
const debouncedImportComplete = ref<NodeJS.Timeout>()

watch(importingFiles, (newFiles, oldFiles) => {
  // 只在首次添加文件时触发处理
  if (newFiles.length > 0 && oldFiles.length === 0) {
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

// 添加延时函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 添加文件名解析函数
const parseFileName = (fullName: string) => {
  // 先移除扩展名
  const fileName = fullName.substring(0, fullName.lastIndexOf('.'))
  
  // 尝试匹配 "歌手 - 歌名" 或 "歌名 - 歌手" 的格式
  const parts = fileName.split(' - ').map(part => part.trim())
  
  if (parts.length === 2) {
    // 如果文件名包含 " - "，判断哪部分更可能是歌手名
    // 这里可以根据实际需求调整判断逻辑
    const [part1, part2] = parts
    
    // 简单的判断逻辑：通常歌手名会更短
    if (part1.length < part2.length) {
      return {
        artistName: part1,
        songName: part2
      }
    } else {
      return {
        artistName: part2,
        songName: part1
      }
    }
  }
  
  // 如果没有分隔符，整个文件名作为歌名
  return {
    artistName: '',
    songName: fileName
  }
}

// 修改文件夹导入完成的处理函数
const handleFolderImportComplete = async () => {
  if (importingFiles.value.length === 0) return
  console.log('开始处理文件列表，共', importingFiles.value.length, '个文件')

  try {
    const totalFiles = importingFiles.value.length
    searchResults.value = []

    // 串行处理所有文件
    for (let i = 0; i < importingFiles.value.length; i++) {
      const file = importingFiles.value[i]
      console.log(`处理第 ${i + 1}/${totalFiles} 个文件:`, file.name)
      
      // 更新进度
      importProgress.value = Math.round(((i + 1) / totalFiles) * 100)

      try {
        const { artistName, songName } = parseFileName(file.name)
        const searchKeyword = artistName 
          ? `${songName} ${artistName}`
          : songName

        // 搜索音乐信息
        const searchResponse = await service.get(`/api/public/music/search/${selectedPlatform.value}`, {
          params: {
            keyword: searchKeyword,
            page: 1,
            limit: 1
          }
        })

        // 创建音乐项
        const musicItem = searchResponse.success && searchResponse.data?.items?.[0]
          ? {
              ...searchResponse.data.items[0],
              uploadFile: file,
              url: URL.createObjectURL(file),
              tags: searchResponse.data.items[0].tags || [],
              singers: searchResponse.data.items[0].singers || [],
              singer: searchResponse.data.items[0].singers?.[0] || searchResponse.data.items[0].singer,
              album: searchResponse.data.items[0].album || null,
              language: searchResponse.data.items[0].language || '未知',
              duration: searchResponse.data.items[0].duration || 0,
              cover_image: searchResponse.data.items[0].album?.cover_image || searchResponse.data.items[0].cover_image || defaultCover,
              lrc: searchResponse.data.items[0].lrc || { lyric: '', lyric_trans: '' }
            }
          : {
              title: songName,
              description: '',
              uploadFile: file,
              url: URL.createObjectURL(file),
              singers: [{ name: artistName || null }],
              tags: [],
              singer: { name: artistName || null },
              album: null,
              language: '未知',
              duration: 0,
              cover_image: defaultCover,
              lrc: { lyric: '', lyric_trans: '' }
            }

        searchResults.value.push(musicItem)
        selectedSongs.value = [...searchResults.value]

        // 等待2秒再处理下一个
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`处理文件失败 (${file.name}):`, error)
      }
    }

    console.log('处理完成，共导入', searchResults.value.length, '首音乐')
  } finally {
    // 重置状态
    importingFiles.value = []
    importProgress.value = 0
    isImportingFolder.value = false
  }
}

// 添加刷新单个音乐信息的方法
const refreshMusicInfo = async (record: MusicItem, index: number) => {
  const defaultKeyword = record.singer?.name 
    ? `${record.title}-${record.singer.name}`
    : record.title

  const state = reactive({
    inputValue: defaultKeyword
  })
  
  Modal.confirm({
    title: '编辑搜索关键词',
    content: () => h(Input, {
      value: state.inputValue,
      onChange: (e: Event) => {
        state.inputValue = (e.target as HTMLInputElement).value
      },
      placeholder: '歌曲名-歌手',
      style: { marginTop: '16px' }
    }),
    async onOk() {
      if (!state.inputValue.trim()) {
        message.warning('请输入搜索关键词')
        return Promise.reject()
      }

      try {
        const searchResponse = await service.get(`/api/public/music/search/${selectedPlatform.value}`, {
          params: {
            keyword: state.inputValue.trim(),
            page: 1,
            limit: 1
          }
        })

        if (searchResponse.success && searchResponse.data?.items?.[0]) {
          console.log('searchResponse', searchResponse)
          // 保存当前音乐信息和新音乐信息
          currentMusic.value = { ...record }
          newMusicInfo.value = searchResponse.data.items[0]
          // 默认选中所有发生变化的属性
          selectedProperties.value = availableProperties.filter(key => {
            if (key === 'singers') {
              return record.singers?.length !== searchResponse.data.items[0].singers?.length
            }
            return record[key] !== searchResponse.data.items[0][key]
          })
          propertyModalVisible.value = true
        } else {
          message.warning('未找到相关音乐信息')
        }
      } catch (error) {
        console.error('刷新音乐信息失败:', error)
        message.error('刷新失败')
      }
    }
  })
}

// 处理属性更新
const handlePropertyUpdate = () => {
  if (!currentMusic.value || !newMusicInfo.value) return
  
  const updatedItem = { ...currentMusic.value }
  selectedProperties.value.forEach(key => {
    try {
      const value = editableValues.value[key]
      if (isComplexValue(newMusicInfo.value[key])) {
        if (isValidJson(value)) {
          updatedItem[key] = JSON.parse(value)
        }
      } else {
        updatedItem[key] = value
      }
    } catch (e) {
      console.error(`更新属性 ${key} 失败:`, e)
    }
  })
  
  const index = searchResults.value.findIndex(item => item.id === currentMusic.value.id)
  if (index !== -1) {
    searchResults.value[index] = updatedItem
    selectedSongs.value = [...searchResults.value]
    message.success('更新成功')
  }
  
  propertyModalVisible.value = false
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
  
  // 确保清理所有文件选择相关状态
  filteredFiles.value = []
  selectedFiles.value = []
  showFileConfirmModal.value = false
  isImportModel = false
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

// 添加提交状态
const submitStatus = reactive({
  current: 0,
  total: 0,
  success: 0,
  fail: 0
})

// 修改提交函数
const handleSubmit = async () => {
  if (!selectedSongs.value.length) {
    message.warning('请选择要导入的音乐')
    return
  }

  submitting.value = true
  submitStatus.current = 0
  submitStatus.total = selectedSongs.value.length
  submitStatus.success = 0
  submitStatus.fail = 0

  try {
    for (const song of selectedSongs.value) {
      submitStatus.current++
      try {
        // 处理音乐文件上传
        let musicUrl = song.url
        if (song.uploadFile) {
        const formData = new FormData()
          formData.append('file', song.uploadFile)
        const uploadResponse = await service.post('/api/upload/audio', formData)
        
        if (!uploadResponse.success) {
            console.error('音乐文件上传失败:', uploadResponse.message)
            submitStatus.fail++
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
              submitStatus.fail++
              continue
            }
            musicUrl = uploadResponse.data.url
          } catch (error) {
            console.error('音乐文件上传失败:', error)
            submitStatus.fail++
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
          submitStatus.success++
        } else {
          console.error('创建音乐记录失败:', createResponse.message)
          submitStatus.fail++
        }

        // 添加 2s 延时
        await delay(1000)
      } catch (error) {
        console.error('导入音乐失败:', error)
        submitStatus.fail++
      }
    }

    message.success(`导入完成：共选择 ${submitStatus.total} 首，成功 ${submitStatus.success} 首，失败 ${submitStatus.fail} 首`)
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

// 添加属性选择相关的状态
const propertyModalVisible = ref(false)
const selectedProperties = ref<string[]>([])
const newMusicInfo = ref<any>(null)
const currentMusic = ref<any>(null)

// 可选属性列表
const availableProperties = [
  'title',
  'singers',
  'album',
  'description',
  'language',
  'lrc'
]

// 属性标签映射
const propertyLabels: Record<string, string> = {
  title: '歌曲名称',
  singers: '歌手',
  album: '专辑',
  description: '描述',
  language: '语言',
  lrc: '歌词'
}

// 添加可编辑 JSON 相关的状态
const editableValues = ref<Record<string, string>>({})

// 格式化显示值
const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '无'
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

// 判断是否为复杂值（需要JSON编辑）
const isComplexValue = (value: any): boolean => {
  return value !== null && typeof value === 'object'
}

// 验证 JSON 格式
const isValidJson = (str: string): boolean => {
  if (!str) return true
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

// 初始化编辑值
watch(() => newMusicInfo.value, (val) => {
  if (val) {
    editableValues.value = Object.keys(val).reduce((acc, key) => {
      const value = val[key]
      acc[key] = isComplexValue(value) ? JSON.stringify(value, null, 2) : String(value ?? '')
      return acc
    }, {} as Record<string, string>)
  }
}, { immediate: true })

// 获取值展示区域的类名
const getValueClass = (key: string): string => {
  const classes = ['complex-value']
  if (key === 'lrc') classes.push('lrc-value')
  if (['singers', 'album'].includes(key)) classes.push('object-value')
  return classes.join(' ')
}

// 获取文本框的类名
const getTextareaClass = (key: string): string => {
  if (key === 'lrc') return 'lrc-textarea'
  if (['singers', 'album'].includes(key)) return 'object-textarea'
  return ''
}

// 添加/移除防止页面滚动的类
watch(() => propertyModalVisible.value, (visible) => {
  if (visible) {
    document.body.classList.add('property-modal-open')
  } else {
    document.body.classList.remove('property-modal-open')
  }
})
</script>

<style scoped>
.import-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-area {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.table-container {
  flex: 1;
  height: 480px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  text-align: center;
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

.confirm-modal-content {
  height: 100%;
  display: flex;
  flex-direction: column;

  .file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-shrink: 0;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .file-count {
        color: rgba(0, 0, 0, 0.45);
        font-size: 14px;
      }
    }
  }

  .file-list {
    flex: 1;
    overflow: auto;
    border-radius: 2px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .ant-checkbox-wrapper {
      margin-right: 8px;
    }

    .file-name {
      flex: 1;
      margin-left: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      color: rgba(0, 0, 0, 0.45);
      font-size: 12px;
      margin-left: 8px;
    }
  }
}

.submit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.submit-status {
  text-align: center;
  padding: 24px;
  border-radius: 4px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  .status-text {
  margin-top: 16px;
    font-size: 14px;
    line-height: 1.8;
  }
}

/* 修改全局样式 */
:global(.batch-import-modal) {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

:global(.batch-import-modal .ant-modal) {
  display: flex;
  flex-direction: column;
  top: 0;
  padding-bottom: 0;
  max-height: 90vh;
}

:global(.batch-import-modal .ant-modal-content) {
  display: flex;
  flex-direction: column;
  max-height: 100%;
  position: relative;
}

:global(.batch-import-modal .ant-modal-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  height: 520px;
}

:global(.batch-import-modal .ant-modal-mask) {
  position: fixed;
  height: 100vh;
}

:global(.batch-import-modal .ant-table-wrapper) {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:global(.batch-import-modal .ant-table) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:global(.batch-import-modal .ant-table-container) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:global(.batch-import-modal .ant-table-body) {
  flex: 1;
  max-height: 350px !important;
  overflow-y: auto !important;
  position: relative;
}

:global(.batch-import-modal .ant-pagination.ant-pagination) {
  position: sticky !important;
  bottom: 0 !important;
  z-index: 10;
  background: #fff;
  margin: 0 !important;
  padding: 8px 0;
  width: 100%;
  border-top: 1px solid #f0f0f0;
}

/* 确认弹窗的全局样式 */
:global(.file-confirm-modal) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(.file-confirm-modal .ant-modal) {
  top: 0;
  padding-bottom: 0;
  max-height: 90vh;
}

:global(.file-confirm-modal .ant-modal-body) {
  height: 400px;
  padding: 16px;
  overflow: hidden;
}

:global(.file-confirm-modal .ant-list-item) {
  padding: 8px 16px;
}

.compare-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 8px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.header-cell {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  text-align: center;
}

.property-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.property-label {
  margin-bottom: 8px;
}

.property-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.old-value,
.new-value {
  display: flex;
  flex-direction: column;
}

.value-content {
  white-space: pre-wrap;
  word-break: break-all;
  overflow-y: auto;
  padding: 4px 0;
}

.value-content.complex-value {
  font-family: monospace;
  background: #fafafa;
  padding: 8px;
  border-radius: 4px;
}

.value-content.object-value {
  height: 120px;
}

.value-content.lrc-value {
  height: 200px;
}

:deep(.json-textarea) {
  resize: none !important;
  font-family: monospace;
}

:deep(.object-textarea) {
  height: 120px !important;
}

:deep(.lrc-textarea) {
  height: 200px !important;
}

:deep(.ant-descriptions-bordered) {
  background: #fff;
}

:deep(.ant-descriptions-item-label) {
  width: 100px;
  background: #fafafa;
}

:deep(.ant-descriptions-item-content) {
  padding: 8px 12px !important;
}

:deep(.ant-input) {
  font-family: monospace;
}

:deep(.ant-input-textarea-show-count::after) {
  margin-top: 4px;
}

:deep(.property-modal) {
  .ant-modal-content {
    margin: 0;
  }

  .ant-modal-body {
    padding: 0;
  }
}

/* 自定义滚动条样式 */
:deep(.ant-modal-body)::-webkit-scrollbar {
  width: 6px;
}

:deep(.ant-modal-body)::-webkit-scrollbar-thumb {
  background-color: #d9d9d9;
  border-radius: 3px;
}

:deep(.ant-modal-body)::-webkit-scrollbar-track {
  background-color: #f5f5f5;
}
</style> 