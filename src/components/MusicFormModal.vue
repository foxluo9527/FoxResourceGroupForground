<template>
  <a-modal
    :visible="visible"
    :title="title"
    width="800px"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="标题" name="title">
            <a-input v-model:value="formState.title" placeholder="请输入音乐标题" />
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
              <a-select-option value="闽南语">闽南语</a-select-option>
              <a-select-option value="法语">法语</a-select-option>
              <a-select-option value="西班牙语">西班牙语</a-select-option>
              <a-select-option value="意大利语">意大利语</a-select-option>
              <a-select-option value="德语">德语</a-select-option>
              <a-select-option value="俄语">俄语</a-select-option>
              <a-select-option value="其他">其他</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="艺人" name="artist_id">
            <a-select
              v-model:value="formState.artist_id"
              placeholder="请选择艺人"
              :loading="artistsLoading"
              show-search
              :options="artists.map(artist => ({
                value: artist.id,
                label: artist.name
              }))"
              :filter-option="false"
              :not-found-content="artistsLoading ? undefined : null"
              @search="handleArtistSearch"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="专辑" name="album_id">
            <a-select
              v-model:value="formState.album_id"
              placeholder="请选择专辑"
              :loading="albumsLoading"
              show-search
              :options="albums.map(album => ({
                value: album.id,
                label: album.title
              }))"
              :filter-option="false"
              :not-found-content="albumsLoading ? undefined : null"
              @search="handleAlbumSearch"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="标签" name="tags">
        <a-select
          v-model:value="formState.tags"
          mode="multiple"
          placeholder="请选择标签"
          :loading="tagsLoading"
          :options="tags.map(tag => ({
            value: tag.name,
            label: tag.name
          }))"
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="音乐文件" name="url" required>
            <a-upload
              v-model:file-list="audioFileList"
              :customRequest="handleAudioUpload"
              :before-upload="beforeAudioUpload"
              accept=".mp3,.wav,.flac"
              :maxCount="1"
            >
              <a-button>
                <upload-outlined />上传音乐
              </a-button>
            </a-upload>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="封面图" name="cover_image">
            <a-upload
              v-model:file-list="imageFileList"
              :customRequest="handleImageUpload"
              :before-upload="beforeImageUpload"
              accept="image/*"
              list-type="picture-card"
              :maxCount="1"
            >
              <div v-if="imageFileList.length < 1">
                <plus-outlined />
                <div style="margin-top: 8px">上传</div>
              </div>
            </a-upload>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="歌词" name="lyrics">
        <a-radio-group v-model:value="lyricsInputType">
          <a-radio value="manual">手动输入</a-radio>
          <a-radio value="file">文件上传</a-radio>
        </a-radio-group>
        <template v-if="lyricsInputType === 'manual'">
          <a-textarea
            v-model:value="formState.lyrics"
            :rows="6"
            placeholder="请输入歌词"
          />
        </template>
        <template v-if="lyricsInputType === 'file'">
          <a-upload
            v-model:file-list="lyricsFileList"
            :customRequest="handleLyricsUpload"
            :before-upload="beforeLyricsUpload"
            accept=".lrc,.txt"
            :maxCount="1"
          >
            <a-button>
              <upload-outlined />上传歌词文件
            </a-button>
          </a-upload>
        </template>
      </a-form-item>

      <a-form-item label="描述" name="description">
        <a-textarea
          v-model:value="formState.description"
          :rows="4"
          placeholder="请输入音乐描述"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, defineProps, defineEmits } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import type { UploadProps } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { http } from '@/utils/http'

interface Props {
  visible: boolean
  title?: string
  musicId?: number
}

interface Artist {
  id: number
  name: string
}

interface Album {
  id: number
  title: string
}

interface Tag {
  id: number
  name: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible', 'success'])

const formRef = ref<FormInstance>()
const artists = ref<Artist[]>([])
const albums = ref<Album[]>([])
const tags = ref<Tag[]>([])
const artistsLoading = ref(false)
const albumsLoading = ref(false)
const tagsLoading = ref(false)
const lyricsInputType = ref<'manual' | 'file'>('manual')

const audioFileList = ref<any[]>([])
const imageFileList = ref<any[]>([])
const lyricsFileList = ref<any[]>([])

const formState = reactive({
  title: '',
  description: '',
  url: '',
  cover_image: '',
  genre: '流行',
  language: '中文',
  lyrics: '',
  artist_id: undefined as number | undefined,
  album_id: undefined as number | undefined,
  tags: [] as string[],
  duration: 0
})

const rules = {
  title: [{ required: true, message: '请输入音乐标题' }],
  language: [{ required: true, message: '请选择语言' }]
}

// 获取艺人列表
const fetchArtists = async () => {
  artistsLoading.value = true
  try {
    const response = await http.get('/api/admin/artists', {
      params: { page: 1, limit: 100 }
    })
    if (response.data.success) {
      artists.value = response.data.data.list
    }
  } catch (error) {
    console.error('获取艺人列表失败:', error)
  } finally {
    artistsLoading.value = false
  }
}

// 获取专辑列表
const fetchAlbums = async (artistId?: number) => {
  albumsLoading.value = true
  try {
    const response = await http.get('/api/albums', {
      params: { 
        page: 1, 
        limit: 100,
        artist_id: artistId
      }
    })
    if (response.data.success) {
      albums.value = response.data.data.albums
    }
  } catch (error) {
    console.error('获取专辑列表失败:', error)
  } finally {
    albumsLoading.value = false
  }
}

// 获取标签列表
const fetchTags = async () => {
  tagsLoading.value = true
  try {
    const response = await http.get('/api/admin/tags', {
      params: {
        type: 'music',
        page: 1,
        limit: 100
      }
    })
    if (response.data.success) {
      tags.value = response.data.data.items
    }
  } catch (error) {
    console.error('获取标签失败:', error)
  } finally {
    tagsLoading.value = false
  }
}

// 获取音频时长
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.preload = 'metadata'
    
    const objectUrl = URL.createObjectURL(file)
    audio.src = objectUrl
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(Math.round(audio.duration))
    }
    
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('获取音频时长失败'))
    }
  })
}

// 修改音频上传处理
const handleAudioUpload = async (options: any) => {
  try {
    console.log('开始上传音频文件:', options.file)
    
    // 先获取音频时长
    const duration = await getAudioDuration(options.file)
    console.log('音频时长:', duration, '秒')
    
    const formData = new FormData()
    formData.append('file', options.file)
    const response = await http.post('/api/upload/audio', formData)
    console.log('音频上传响应:', response)
    
    if (response.data.success) {
      formState.url = response.data.data.url
      formState.duration = duration // 设置时长
      audioFileList.value = [{
        uid: '1',
        name: options.file.name,
        status: 'done',
        url: response.data.data.url
      }]
      options.onSuccess()
    } else {
      throw new Error(response.data.message || '上传失败')
    }
  } catch (error) {
    console.error('上传音频失败:', error)
    message.error('上传音频失败')
    options.onError()
  }
}

const handleImageUpload = async (options: any) => {
  imageFileList.value = [{
    uid: '1',
    name: options.file.name,
    status: 'done',
    originFileObj: options.file,
    url: URL.createObjectURL(options.file)
  }]
  formState.cover_image = '' // 清空之前的封面地址，等待提交时上传
  options.onSuccess()
}

const handleLyricsUpload = async (options: any) => {
  const file = options.file
  const reader = new FileReader()
  reader.onload = (e) => {
    formState.lyrics = e.target?.result as string
    lyricsFileList.value = [{
      uid: '1',
      name: file.name,
      status: 'done',
      originFileObj: file
    }]
    options.onSuccess()
  }
  reader.onerror = () => {
    options.onError()
  }
  reader.readAsText(file)
}

// 文件上传前的验证
const beforeAudioUpload: UploadProps['beforeUpload'] = (file) => {
  const isAudio = /\.(mp3|wav|flac)$/.test(file.name.toLowerCase())
  if (!isAudio) {
    message.error('只能上传音频文件!')
  }
  const isLt100M = file.size / 1024 / 1024 < 100
  if (!isLt100M) {
    message.error('文件必须小于 100MB!')
  }
  return isAudio && isLt100M
}

const beforeImageUpload: UploadProps['beforeUpload'] = (file) => {
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
  return true
}

const beforeLyricsUpload: UploadProps['beforeUpload'] = (file) => {
  const isText = /\.(lrc|txt)$/.test(file.name.toLowerCase())
  if (!isText) {
    message.error('只能上传 LRC 或 TXT 文件!')
  }
  const isLt1M = file.size / 1024 / 1024 < 1
  if (!isLt1M) {
    message.error('文件必须小于 1MB!')
  }
  return isText && isLt1M
}

// 获取音乐详情
const fetchMusicDetail = async (id: number) => {
  try {
    const response = await http.get(`/api/admin/music/${id}`)
    if (response.data.success) {
      const music = response.data.data
      // 填充表单数据
      formState.title = music.title
      formState.description = music.description
      formState.url = music.url
      formState.cover_image = music.cover_image
      formState.language = music.language
      formState.lyrics = music.lyrics
      formState.artist_id = music.artists?.id
      formState.tags = music.tags.map(tag => tag.name)
      formState.duration = music.duration

      // 设置文件列表
      if (music.url) {
        audioFileList.value = [{
          uid: '1',
          name: music.url.split('/').pop() || '音乐文件',
          status: 'done',
          url: music.url
        }]
      }
      if (music.cover_image) {
        imageFileList.value = [{
          uid: '1',
          name: music.cover_image.split('/').pop() || '封面图片',
          status: 'done',
          url: music.cover_image
        }]
        formState.cover_image = music.cover_image
      }

      // 如果有艺人ID，先加载艺人信息，然后加载对应的专辑列表
      if (music.artists?.id) {
        await fetchArtists() // 确保艺人列表已加载
        await fetchAlbums(music.artists.id) // 加载该艺人的专辑列表
        // 设置专辑ID
        formState.album_id = music.albums?.[0]?.id
      }
    }
  } catch (error) {
    console.error('获取音乐详情失败:', error)
    message.error('获取音乐详情失败')
  }
}

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (props.musicId) {
      // 编辑模式：获取详情
      fetchMusicDetail(props.musicId)
    } else {
      // 新增模式：只初始化必要的数据
      formRef.value?.resetFields()
      formState.url = ''
      formState.cover_image = ''
      formState.artist_id = undefined
      formState.album_id = undefined
      formState.tags = []
      audioFileList.value = []
      imageFileList.value = []
      lyricsFileList.value = []
      lyricsInputType.value = 'manual'
      albums.value = [] // 清空专辑列表
      // 加载艺人和标签列表
      fetchArtists()
      fetchTags()
      formState.duration = 0
    }
  }
})

// 修改表单提交
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    if (!formState.url && audioFileList.value.length === 0) {
      message.error('请上传音乐文件')
      return
    }

    // 上传图片文件（如果有新的图片）
    if (imageFileList.value.length > 0 && imageFileList.value[0].originFileObj) {
      try {
        const formData = new FormData()
        formData.append('file', imageFileList.value[0].originFileObj)
        const response = await http.post('/api/upload/image', formData)
        if (response.data.success) {
          formState.cover_image = response.data.data.url
        } else {
          throw new Error('图片上传失败')
        }
      } catch (error) {
        console.error('上传图片失败:', error)
        message.error('上传图片失败')
        return
      }
    }

    // 上传歌词文件（如果选择了文件上传方式）
    if (lyricsInputType.value === 'file' && lyricsFileList.value.length > 0) {
      try {
        const formData = new FormData()
        formData.append('file', lyricsFileList.value[0].originFileObj)
        const response = await http.post('/api/upload/lyrics', formData)
        if (response.data.success) {
          formState.lyrics = response.data.data.content
        } else {
          throw new Error('歌词文件上传失败')
        }
      } catch (error) {
        console.error('上传歌词失败:', error)
        message.error('上传歌词失败')
        return
      }
    }

    // 提交表单数据
    console.log('提交的表单数据:', formState)
    const url = props.musicId 
      ? `/api/admin/music/${props.musicId}`
      : '/api/admin/music'
    
    const response = await http[props.musicId ? 'put' : 'post'](url, formState)
    
    if (response.data.success) {
      message.success(props.musicId ? '更新音乐成功' : '添加音乐成功')
      emit('success')
      emit('update:visible', false)
    } else {
      message.error(response.data.message || '操作失败')
    }
  } catch (error: any) {
    console.error('提交表单失败:', error)
    message.error(error.response?.data?.message || error.message || '提交失败')
  }
}

const handleCancel = () => {
  formRef.value?.resetFields()
  formState.url = ''
  formState.cover_image = ''
  audioFileList.value = []
  imageFileList.value = []
  lyricsFileList.value = []
  lyricsInputType.value = 'manual'
  // 清空所有选项
  formState.artist_id = undefined
  formState.album_id = undefined
  formState.tags = []
  albums.value = [] // 清空专辑列表
  formState.duration = 0
  emit('update:visible', false)
}

// 监听艺人变化，加载对应的专辑
watch(() => formState.artist_id, (newVal) => {
  if (newVal) {
    fetchAlbums(newVal)
  } else {
    albums.value = []
  }
})

// 搜索防抖
const useDebounce = (fn: Function, delay: number) => {
  let timer: number | null = null
  return (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(null, args)
    }, delay) as unknown as number
  }
}

// 搜索艺人
const searchArtists = async (keyword: string) => {
  if (!keyword) {
    fetchArtists()
    return
  }
  
  artistsLoading.value = true
  try {
    const response = await http.get('/api/admin/artists', {
      params: { 
        page: 1, 
        limit: 100,
        keyword
      }
    })
    if (response.data.success) {
      artists.value = response.data.data.list
    }
  } catch (error) {
    console.error('搜索艺人失败:', error)
  } finally {
    artistsLoading.value = false
  }
}

// 搜索专辑
const searchAlbums = async (keyword: string) => {
  if (!keyword) {
    fetchAlbums(formState.artist_id)
    return
  }

  albumsLoading.value = true
  try {
    const response = await http.get('/api/albums', {
      params: { 
        page: 1, 
        limit: 100,
        artist_id: formState.artist_id,
        keyword
      }
    })
    if (response.data.success) {
      albums.value = response.data.data.albums
    }
  } catch (error) {
    console.error('搜索专辑失败:', error)
  } finally {
    albumsLoading.value = false
  }
}

// 使用防抖处理搜索
const handleArtistSearch = useDebounce((value: string) => {
  searchArtists(value)
}, 300)

const handleAlbumSearch = useDebounce((value: string) => {
  searchAlbums(value)
}, 300)
</script>

<style scoped>
.ant-upload-list-picture-card .ant-upload-list-item {
  float: left;
  width: 104px;
  height: 104px;
  margin: 0 8px 8px 0;
}

.ant-upload.ant-upload-select-picture-card {
  width: 104px;
  height: 104px;
  margin: 0;
}

:deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

:deep(.ant-radio-group) {
  margin-bottom: 8px;
}
</style> 