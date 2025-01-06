<template>
  <a-modal
    :visible="visible"
    title="批量导入音乐"
    width="800px"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :confirmLoading="submitting"
    @update:visible="(val) => $emit('update:visible', val)"
  >
    <div class="import-container">
      <a-upload
        directory
        :customRequest="handleDirectoryUpload"
        :showUploadList="false"
        :multiple="true"
        accept="audio/*"
      >
        <a-button type="primary">
          <upload-outlined />
          选择文件夹
        </a-button>
      </a-upload>

      <!-- 显示扫描结果 -->
      <div v-if="scannedFiles.length" class="scan-results">
        <a-alert
          :message="`已扫描到 ${scannedFiles.length} 个音乐文件`"
          type="info"
          show-icon
          style="margin-bottom: 16px"
        />
        
        <a-table
          :columns="columns"
          :data-source="scannedFiles"
          :pagination="false"
          size="small"
          :scroll="{ y: 400, x: 1000 }"
          :row-key="(record) => record.key"
        >
          <!-- 标题列 -->
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'title'">
              <a-input v-model:value="record.title" placeholder="请输入标题" />
            </template>
            
            <template v-else-if="column.dataIndex === 'artist'">
              <a-select
                v-model:value="record.artist_id"
                placeholder="选择艺人"
                show-search
                :loading="artistsLoading"
                :options="artists"
                @search="handleArtistSearch"
                style="width: 100%"
              >
                <template #dropdownRender="{ menuNode: artistMenuNode }">
                  <div>
                    <div style="padding: 8px">
                      <a-button type="link" block @click="() => showQuickAddArtist(record)">
                        <plus-outlined />快速添加艺人
                      </a-button>
                    </div>
                    <div v-html="artistMenuNode?.props?.innerHTML || ''"></div>
                  </div>
                </template>
              </a-select>
            </template>
            
            <template v-else-if="column.dataIndex === 'album'">
              <a-select
                v-model:value="record.album_id"
                placeholder="选择专辑"
                show-search
                :loading="albumsLoading"
                :options="getAlbumOptions(record.artist_id)"
                style="width: 100%"
              >
                <template #dropdownRender="{ menuNode: albumMenuNode }">
                  <div>
                    <div style="padding: 8px">
                      <a-button 
                        type="link" 
                        block 
                        @click="() => showQuickAddAlbum(record)"
                        :disabled="!record.artist_id"
                      >
                        <plus-outlined />快速添加专辑
                      </a-button>
                    </div>
                    <div v-html="albumMenuNode?.props?.innerHTML || ''"></div>
                  </div>
                </template>
              </a-select>
            </template>
            
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a @click="() => handlePreview(record)">预览</a>
                <a @click="() => handleRemove(record)">移除</a>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <!-- 快速添加艺人弹窗 -->
    <a-modal
      v-model:visible="artistModalVisible"
      title="快速添加艺人"
      @ok="handleAddArtist"
      :confirmLoading="addingArtist"
    >
      <a-form :model="artistForm" layout="vertical">
        <a-form-item label="艺人名称" required>
          <a-input v-model:value="artistForm.name" placeholder="请输入艺人名称" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 快速添加专辑弹窗 -->
    <a-modal
      v-model:visible="albumModalVisible"
      title="快速添加专辑"
      @ok="handleAddAlbum"
      :confirmLoading="addingAlbum"
    >
      <a-form :model="albumForm" layout="vertical">
        <a-form-item label="专辑名称" required>
          <a-input v-model:value="albumForm.title" placeholder="请输入专辑名称" />
        </a-form-item>
        
        <a-form-item label="专辑描述">
          <a-textarea 
            v-model:value="albumForm.description" 
            placeholder="请输入专辑描述"
            :rows="3" 
          />
        </a-form-item>

        <a-form-item label="发行日期">
          <a-date-picker 
            v-model:value="albumForm.release_date"
            style="width: 100%"
            :show-time="false"
            format="YYYY-MM-DD"
          />
        </a-form-item>

        <a-form-item label="语言">
          <a-select v-model:value="albumForm.language">
            <a-select-option value="中文">中文</a-select-option>
            <a-select-option value="英文">英文</a-select-option>
            <a-select-option value="日文">日文</a-select-option>
            <a-select-option value="韩文">韩文</a-select-option>
            <a-select-option value="粤语">粤语</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="发行公司">
          <a-input v-model:value="albumForm.publisher" placeholder="请输入发行公司" />
        </a-form-item>

        <a-form-item label="封面">
          <a-upload
            v-model:file-list="albumForm.fileList"
            list-type="picture-card"
            :show-upload-list="false"
            :before-upload="beforeUploadCover"
            @change="handleCoverChange"
          >
            <img v-if="albumForm.cover_preview" :src="albumForm.cover_preview" style="width: 100%" />
            <div v-else>
              <plus-outlined />
              <div style="margin-top: 8px">上传封面</div>
            </div>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { UploadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { service } from '@/utils/request'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible', 'success'])

// 定义文件类型接口
interface ScannedFile {
  file: File
  filename: string
  title: string
  artist: string
  album: string
  artist_id?: number
  album_id?: number
  duration: number
  key?: string  // 添加唯一标识
}

const columns = [
  {
    title: '文件名',
    dataIndex: 'filename',
    width: 200,
  },
  {
    title: '标题',
    dataIndex: 'title',
    width: 200,
  },
  {
    title: '艺人',
    dataIndex: 'artist',
    width: 200,
  },
  {
    title: '专辑',
    dataIndex: 'album',
    width: 200,
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    fixed: 'right',
  },
]

const scannedFiles = ref<ScannedFile[]>([])
const submitting = ref(false)
const artists = ref<{ label: string; value: number }[]>([])
const artistsLoading = ref(false)
const albumsMap = ref<Map<number, { label: string; value: number }[]>>(new Map())
const albumsLoading = ref(false)

// 生成唯一 ID
const generateUniqueId = () => {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 处理文件夹上传
const handleDirectoryUpload = async ({ file }: { file: File }) => {
  try {
    // 只处理音频文件
    if (!file.type.startsWith('audio/')) {
      message.warning(`${file.name} 不是音频文件`)
      return
    }

    // 使用 Audio 对象获取音频时长
    const audio = document.createElement('audio')
    const fileUrl = URL.createObjectURL(file)
    
    try {
      await new Promise((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => {
          // 从文件名中提取信息（假设格式为：艺人名 - 歌曲名.mp3）
          const filename = file.name.replace(/\.[^/.]+$/, "")
          let artist = '', title = filename
          
          if (filename.includes(' - ')) {
            [artist, title] = filename.split(' - ')
          }
          
          const newFile: ScannedFile = {
            file,
            filename: file.name,
            title: title.trim(),
            artist: artist.trim(),
            album: '',  // 专辑名需要手动选择
            artist_id: undefined,
            album_id: undefined,
            duration: audio.duration || 0,
            key: generateUniqueId()  // 添加唯一标识
          }
          
          scannedFiles.value.push(newFile)
          resolve(null)
        })
        
        audio.addEventListener('error', () => {
          reject(new Error('加载音频文件失败'))
        })
        
        audio.src = fileUrl
      })
    } finally {
      URL.revokeObjectURL(fileUrl)
      audio.remove() // 清理 audio 元素
    }
  } catch (error) {
    console.error('解析音乐文件失败:', error)
    message.error(`解析文件 ${file.name} 失败`)
  }
}

// 搜索艺人
const handleArtistSearch = async (keyword: string) => {
  if (!keyword) return
  
  artistsLoading.value = true
  try {
    const response = await service.get('/api/admin/artists', {
      params: { keyword }
    })
    if (response.success) {
      artists.value = response.data.list.map(item => ({
        label: item.name,
        value: item.id
      }))
    }
  } catch (error) {
    console.error('搜索艺人失败:', error)
  } finally {
    artistsLoading.value = false
  }
}

// 获取艺人的专辑列表
const fetchArtistAlbums = async (artistId: number) => {
  if (!artistId || albumsMap.value.has(artistId)) return
  
  albumsLoading.value = true
  try {
    const response = await service.get('/api/admin/albums', {
      params: { artist_id: artistId }
    })
    if (response.success) {
      albumsMap.value.set(
        artistId,
        response.data.list.map(item => ({
          label: item.title,
          value: item.id
        }))
      )
    }
  } catch (error) {
    console.error('获取专辑列表失败:', error)
  } finally {
    albumsLoading.value = false
  }
}

// 获取专辑选项
const getAlbumOptions = (artistId: number) => {
  return albumsMap.value.get(artistId) || []
}

// 修改艺人表单类型
interface ArtistFormState {
  name: string
  fileKey?: string  // 使用 key 而不是存储整个文件对象
}

// 修改专辑表单类型
interface AlbumFormState {
  title: string
  fileKey?: string
  artist_id?: number
  description?: string
  release_date?: any  // dayjs 类型
  cover_image?: string
  cover_preview?: string
  language?: string
  publisher?: string
  fileList: any[]
}

// 表单状态
const artistForm = reactive<ArtistFormState>({
  name: '',
  fileKey: undefined
})

const albumForm = reactive<AlbumFormState>({
  title: '',
  fileKey: undefined,
  artist_id: undefined,
  description: '',
  release_date: undefined,
  cover_image: undefined,
  cover_preview: undefined,
  language: '中文',
  publisher: '',
  fileList: []
})

// 快速添加艺人
const showQuickAddArtist = (record: ScannedFile) => {
  artistForm.name = record.artist
  artistForm.fileKey = record.key
  artistModalVisible.value = true
}

// 处理添加艺人
const handleAddArtist = async () => {
  if (!artistForm.name) {
    message.warning('请输入艺人名称')
    return
  }

  addingArtist.value = true
  try {
    const response = await service.post('/api/admin/artists', {
      name: artistForm.name
    })
    
    if (response.success) {
      message.success('添加艺人成功')
      // 更新当前文件的艺人ID
      if (artistForm.fileKey) {
        const file = scannedFiles.value.find(f => f.key === artistForm.fileKey)
        if (file) {
          file.artist_id = response.data.id
        }
      }
      // 刷新艺人列表
      await handleArtistSearch(artistForm.name)
      artistModalVisible.value = false
    }
  } catch (error) {
    console.error('添加艺人失败:', error)
    message.error('添加艺人失败')
  } finally {
    addingArtist.value = false
  }
}

// 快速添加专辑
const showQuickAddAlbum = (record: ScannedFile) => {
  if (!record.artist_id) {
    message.warning('请先选择艺人')
    return
  }
  
  albumForm.title = record.album
  albumForm.fileKey = record.key
  albumForm.artist_id = record.artist_id
  albumModalVisible.value = true
}

// 处理添加专辑
const handleAddAlbum = async () => {
  if (!albumForm.title || !albumForm.artist_id) {
    message.warning('请填写必要的专辑信息')
    return
  }

  addingAlbum.value = true
  try {
    // 1. 如果有封面，先上传封面
    let coverUrl = ''
    if (albumForm.fileList?.[0]?.originFileObj) {
      const formData = new FormData()
      formData.append('file', albumForm.fileList[0].originFileObj)
      const uploadResponse = await service.post('/api/upload/image', formData)
      if (uploadResponse.success) {
        coverUrl = uploadResponse.data.url
      }
    }

    // 2. 创建专辑
    const albumData = {
      title: albumForm.title,
      artist_id: albumForm.artist_id,
      description: albumForm.description,
      release_date: albumForm.release_date?.format('YYYY-MM-DD'),
      cover_image: coverUrl,
      language: albumForm.language,
      publisher: albumForm.publisher
    }

    const response = await service.post('/api/admin/albums', albumData)
    
    if (response.success) {
      message.success('添加专辑成功')
      // 更新当前文件的专辑ID
      if (albumForm.fileKey) {
        const file = scannedFiles.value.find(f => f.key === albumForm.fileKey)
        if (file) {
          file.album_id = response.data.id
        }
      }
      // 刷新专辑列表
      await fetchArtistAlbums(albumForm.artist_id)
      albumModalVisible.value = false
      
      // 重置表单
      albumForm.title = ''
      albumForm.description = ''
      albumForm.release_date = undefined
      albumForm.cover_image = undefined
      albumForm.cover_preview = undefined
      albumForm.language = '中文'
      albumForm.publisher = ''
      albumForm.fileList = []
    }
  } catch (error) {
    console.error('添加专辑失败:', error)
    message.error('添加专辑失败')
  } finally {
    addingAlbum.value = false
  }
}

// 处理封面上传前的验证
const beforeUploadCover = (file: File) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('只能上传图片文件!')
  }
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    message.error('图片必须小于 2MB!')
  }
  return isImage && isLt2M
}

// 处理封面变化
const handleCoverChange = async (info: any) => {
  if (info.file.status === 'uploading') {
    return
  }
  if (info.file.status === 'done') {
    // 获取图片预览URL
    albumForm.cover_preview = URL.createObjectURL(info.file.originFileObj)
    // 保存文件对象以供后续上传
    albumForm.fileList = [info.file]
  }
}

// 提交导入
const handleSubmit = async () => {
  if (!scannedFiles.value.length) {
    message.warning('请先选择要导入的音乐文件')
    return
  }

  submitting.value = true
  let successCount = 0  // 改用普通变量
  let failCount = 0     // 改用普通变量

  try {
    for (const file of scannedFiles.value) {
      try {
        // 1. 上传音乐文件
        const formData = new FormData()
        formData.append('file', file.file)
        const uploadResponse = await service.post('/api/upload/audio', formData)
        
        if (!uploadResponse.success) {
          failCount++
          continue
        }

        // 2. 添加音乐记录
        const musicData = {
          title: file.title,
          url: uploadResponse.data.url,
          artist_id: file.artist_id,
          album_id: file.album_id,
          duration: file.duration
        }

        const addResponse = await service.post('/api/admin/music', musicData)
        
        if (addResponse.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.error('导入音乐失败:', error)
        failCount++
      }
    }

    message.success(`导入完成：成功 ${successCount} 首，失败 ${failCount} 首`)
    emit('success')
    handleCancel()
  } catch (error) {
    console.error('批量导入失败:', error)
    message.error('批量导入失败')
  } finally {
    submitting.value = false
  }
}

// 预览音乐
const handlePreview = (record: any) => {
  const audio = new Audio(URL.createObjectURL(record.file))
  audio.play()
}

// 移除文件
const handleRemove = (record: any) => {
  const index = scannedFiles.value.findIndex(item => item === record)
  if (index > -1) {
    scannedFiles.value.splice(index, 1)
  }
}

// 取消导入
const handleCancel = () => {
  scannedFiles.value = []
  emit('update:visible', false)
}

// 还需要添加这些变量的定义
const artistModalVisible = ref(false)
const albumModalVisible = ref(false)
const addingArtist = ref(false)
const addingAlbum = ref(false)
</script>

<style scoped>
.import-container {
  min-height: 200px;
}

.scan-results {
  margin-top: 16px;
}

:deep(.ant-upload-drag) {
  height: 180px;
}
</style> 