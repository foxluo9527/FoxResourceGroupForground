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
              @search="handleArtistSearch"
              @change="handleArtistChange"
              style="width: 100%"
              :default-value="formState.artist_id"
            >
              <template #notFoundContent>
                <span v-if="artistsLoading">搜索中...</span>
                <span v-else>未找到相关艺人</span>
              </template>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="专辑" name="album_id">
            <a-select
              v-model:value="formState.album_id"
              placeholder="请选择专辑"
              show-search
              :loading="albumsLoading"
              :options="albums"
              :filter-option="false"
              @search="handleAlbumSearch"
              @change="handleAlbumChange"
              style="width: 100%"
              :default-value="formState.album_id"
            >
              <template #notFoundContent>
                <span v-if="albumsLoading">搜索中...</span>
                <span v-else>未找到相关专辑</span>
              </template>
            </a-select>
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
              :before-upload="beforeAudioUpload"
              :maxCount="1"
              :auto-upload="false"
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
import { ref, reactive, watch, defineProps, defineEmits, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import type { UploadProps } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { service } from '@/utils/request'

interface Props {
  visible: boolean
  title?: string
  musicId?: number
  music?: any
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
const albums = ref<{ label: string; value: number }[]>([])
const tags = ref<Tag[]>([])
const artistsLoading = ref(false)
const albumsLoading = ref(false)
const tagsLoading = ref(false)
const lyricsInputType = ref<'manual' | 'file'>('manual')

const audioFileList = ref<any[]>([])
const imageFileList = ref<any[]>([])

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
  language: [{ required: true, message: '请选择语言' }],
  url: [{ 
    validator: async (_rule: any, value: string) => {
      // 如果有已上传的 URL 或者有选择的文件，都算通过验证
      if (value || audioFileList.value.length > 0) {
        return Promise.resolve();
      }
      return Promise.reject('请选择音乐文件');
    }
  }]
}

// 获取艺人列表
const fetchArtists = async () => {
  artistsLoading.value = true
  try {
    const response = await service.get('/api/admin/artists', {
      params: { page: 1, limit: 100 }
    })
    if (response.success) {
      artists.value = response.data.list
    }
  } catch (error) {
    console.error('获取艺人列表失败:', error)
  } finally {
    artistsLoading.value = false
  }
}

// 获取专辑列表
const fetchAlbums = async (artistId: number) => {
  if (!artistId) return

  albumsLoading.value = true
  try {
    const response = await service.get('/api/admin/albums', {
      params: { 
        page: 1, 
        limit: 100,
        artistId
      }
    })
    if (response.success && response.data?.list) {
      // 更新专辑列表
      albums.value = response.data.list.map(album => ({
        label: album.title,
        value: album.id
      }))
    }
  } catch (error) {
    console.error('获取专辑列表失败:', error)
    message.error('获取专辑列表失败')
  } finally {
    albumsLoading.value = false
  }
}

// 获取标签列表
const fetchTags = async () => {
  tagsLoading.value = true
  try {
    const response = await service.get('/api/admin/tags', {
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

// 音频文件上传前的验证
const beforeAudioUpload = (file: File) => {
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
  return false  // 返回 false 阻止自动上传
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
    options.onSuccess()
  }
  reader.onerror = () => {
    options.onError()
  }
  reader.readAsText(file)
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
    message.error('只能选择 LRC 或 TXT 文件!')
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
    const response = await service.get(`/api/admin/music/${id}`)
    if (response.success) {
      const music = response.data

      // 填充基本表单数据
      formState.title = music.title
      formState.description = music.description || ''
      formState.url = music.url || ''
      formState.cover_image = music.cover_image || ''
      formState.genre = music.genre || '流行'
      formState.language = music.language || '中文'
      formState.lyrics = music.lyrics || ''
      formState.duration = music.duration || 0
      formState.tags = music.tags?.map(tag => tag.name) || []

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
      }

      // 处理艺人信息
      if (music.artist) {
        // 设置艺人ID
        formState.artist_id = music.artist.id
        
        // 确保艺人在列表中
        if (!artists.value.find(a => a.id === music.artist.id)) {
          artists.value = [...artists.value, {
            id: music.artist.id,
            name: music.artist.name
          }]
        }

        // 获取并设置专辑列表
        await fetchAlbums(music.artist.id)

        // 处理专辑信息
        if (music.album) {
          // 设置专辑ID
          formState.album_id = music.album.id
          
          // 确保专辑在列表中
          if (!albums.value.find(a => a.value === music.album.id)) {
            albums.value = [...albums.value, {
              label: music.album.title,
              value: music.album.id
            }]
          }
        }
      }
    }
  } catch (error) {
    console.error('获取音乐详情失败:', error)
    message.error('获取音乐详情失败')
  }
}

// 监听 visible 变化
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // 加载艺人列表和标签
    await fetchArtists()
    await fetchTags()

    // 如果是编辑模式
    if (props.music && props.music.artist) {
      // 设置艺人信息
      formState.artist_id = props.music.artist.id
      
      // 如果艺人不在列表中，添加到列表
      if (!artists.value.find(a => a.id === props.music.artist.id)) {
        artists.value.push({
          id: props.music.artist.id,
          name: props.music.artist.name
        })
      }

      // 先获取该艺人的专辑列表
      await fetchAlbums(props.music.artist.id)

      // 等专辑列表加载完成后，再设置专辑ID
      if (props.music.album) {
        // 延迟一帧设置专辑ID，确保专辑列表已经渲染
        nextTick(() => {
          formState.album_id = props.music.album.id
        })
      }
    } else if (props.musicId) {
      // 如果是通过 ID 编辑，获取详情
      await fetchMusicDetail(props.musicId)
    } else {
      // 新增模式：重置表单
      formRef.value?.resetFields()
      resetFormState()
    }
  }
})

// 添加重置表单状态的函数
const resetFormState = () => {
  formState.title = ''
  formState.description = ''
  formState.url = ''
  formState.cover_image = ''
  formState.genre = '流行'
  formState.language = '中文'
  formState.lyrics = ''
  formState.artist_id = undefined
  formState.album_id = undefined
  formState.tags = []
  formState.duration = 0
  audioFileList.value = []
  imageFileList.value = []
  lyricsInputType.value = 'manual'
  albums.value = []
}

// 修改表单提交
const handleSubmit = async () => {
  try {
    // 先上传文件，再验证表单
    if (audioFileList.value.length > 0 && audioFileList.value[0].originFileObj) {
      try {
        const formData = new FormData()
        formData.append('file', audioFileList.value[0].originFileObj)
        const response = await service.post('/api/upload/audio', formData)
        if (response.success) {
          formState.url = response.data.url
        } else {
          throw new Error('音乐文件上传失败')
        }
      } catch (error) {
        console.error('上传音乐文件失败:', error)
        message.error('上传音乐文件失败')
        return
      }
    }

    // 上传封面图片（如果有新图片）
    if (imageFileList.value.length > 0 && imageFileList.value[0].originFileObj) {
      try {
        const formData = new FormData()
        formData.append('file', imageFileList.value[0].originFileObj)
        const response = await service.post('/api/upload/image', formData)
        if (response.success) {
          formState.cover_image = response.data.url
        } else {
          throw new Error('封面图片上传失败')
        }
      } catch (error) {
        console.error('上传封面图片失败:', error)
        message.error('上传封面图片失败')
        return
      }
    }

    // 文件上传完成后再验证表单
    await formRef.value?.validate()

    // 提交表单数据
    const submitData = {
      ...formState,
      artist_id: formState.artist_id,  // 确保包含艺人ID
      album_id: formState.album_id     // 确保包含专辑ID
    }

    const url = props.musicId 
      ? `/api/admin/music/${props.musicId}`
      : '/api/admin/music'
    
    const response = await service[props.musicId ? 'put' : 'post'](url, submitData)
    
    if (response.success) {
      message.success(props.musicId ? '更新音乐成功' : '添加音乐成功')
      emit('success')
      emit('update:visible', false)
    } else {
      message.error(response.message || '操作失败')
    }
  } catch (error: any) {
    console.error('提交表单失败:', error)
    message.error(error.message || '提交失败')
  }
}

const handleCancel = () => {
  formRef.value?.resetFields()
  resetFormState()
  emit('update:visible', false)
}

// 修改艺人变化处理函数
const handleArtistChange = async (value: number) => {
  // 清空专辑相关数据
  formState.album_id = undefined
  albums.value = []

  if (value) {
    formState.artist_id = value
    // 获取该艺人的专辑列表
    await fetchAlbums(value)
  }
}

// 修改专辑变化处理函数
const handleAlbumChange = (value: number) => {
  formState.album_id = value
}

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
    const response = await service.get('/api/admin/artists', {
      params: { 
        page: 1, 
        limit: 100,
        keyword
      }
    })
    if (response.success) {
      artists.value = response.data.list
    }
  } catch (error) {
    console.error('搜索艺人失败:', error)
  } finally {
    artistsLoading.value = false
  }
}

// 搜索专辑
const handleAlbumSearch = async (keyword: string) => {
  if (!formState.artist_id) {
    message.warning('请先选择艺人')
    return
  }

  albumsLoading.value = true
  try {
    const response = await service.get('/api/admin/albums', {
      params: {
        title: keyword,
        artistId: formState.artist_id,
        page: 1,
        limit: 20
      }
    })
    
    if (response.success && response.data?.list) {
      albums.value = response.data.list.map(item => ({
        label: item.title,
        value: item.id
      }))
    }
  } catch (error) {
    console.error('搜索专辑失败:', error)
    message.error('搜索专辑失败')
  } finally {
    albumsLoading.value = false
  }
}

// 使用防抖处理搜索
const handleArtistSearch = useDebounce((value: string) => {
  searchArtists(value)
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