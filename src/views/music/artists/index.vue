<template>
  <div class="artists-list">
    <div class="table-operations">
      <a-space>
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="搜索艺人名称"
          style="width: 200px"
          @search="handleSearch"
          allowClear
        />
        <a-button type="primary" @click="handleAdd">
          <plus-outlined />添加艺人
        </a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="artists"
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
      <!-- 头像 -->
      <template #avatar="{ record }">
        <template v-if="record.avatar">
          <a-avatar :src="record.avatar" :size="50">
            {{ record.name?.charAt(0) }}
          </a-avatar>
        </template>
        <template v-else>
          <a-avatar :size="50" style="background-color: #1890ff">
            {{ record.name?.charAt(0) || '?' }}
          </a-avatar>
        </template>
      </template>

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

      <!-- 别名 -->
      <template #alias="{ record }">
        <a-space wrap>
          <template v-if="record.alias">
            <a-tag v-for="alias in record.alias.split(';')" :key="alias">
              {{ alias }}
            </a-tag>
          </template>
          <template v-else>-</template>
        </a-space>
      </template>

      <!-- 操作 -->
      <template #action="{ record }">
        <a-space @click.stop>
          <a @click="handleEdit(record)">编辑</a>
          <a-divider type="vertical" />
          <a-popconfirm
            title="确定要删除这个艺人吗？"
            @confirm="handleDelete(record)"
          >
            <a class="danger">删除</a>
          </a-popconfirm>
        </a-space>
      </template>
    </a-table>

    <!-- 添加/编辑艺人表单 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="formTitle"
      width="800px"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="艺人名称" name="name">
              <a-input v-model:value="formState.name" placeholder="请输入艺人名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="艺名/别名" name="alias">
              <a-input v-model:value="formState.alias" placeholder="多个别名用分号(;)分隔" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="头像" name="avatar">
              <a-upload
                v-model:file-list="avatarFileList"
                :customRequest="handleAvatarUpload"
                :before-upload="beforeImageUpload"
                accept="image/*"
                list-type="picture-card"
                :maxCount="1"
              >
                <div v-if="avatarFileList.length < 1">
                  <plus-outlined />
                  <div style="margin-top: 8px">上传</div>
                </div>
              </a-upload>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="封面图" name="cover_image">
              <a-upload
                v-model:file-list="coverFileList"
                :customRequest="handleCoverUpload"
                :before-upload="beforeImageUpload"
                accept="image/*"
                list-type="picture-card"
                :maxCount="1"
              >
                <div v-if="coverFileList.length < 1">
                  <plus-outlined />
                  <div style="margin-top: 8px">上传</div>
                </div>
              </a-upload>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="出生日期" name="birth_date">
              <a-date-picker
                v-model:value="formState.birth_date"
                style="width: 100%"
                :show-time="false"
                format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="性别" name="gender">
              <a-select v-model:value="formState.gender">
                <a-select-option value="male">男</a-select-option>
                <a-select-option value="female">女</a-select-option>
                <a-select-option value="other">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="出道日期" name="debut_date">
              <a-date-picker
                v-model:value="formState.debut_date"
                style="width: 100%"
                :show-time="false"
                format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="地区" name="region">
              <a-input v-model:value="formState.region" placeholder="请输入地区，如：中国.广东" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="简介" name="description">
          <a-textarea
            v-model:value="formState.description"
            :rows="4"
            placeholder="请输入艺人简介"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加详情抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="currentArtist?.name"
      placement="right"
      width="800"
      @close="handleDrawerClose"
    >
      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="头像">
          <template v-if="currentArtist?.avatar">
            <a-avatar :src="currentArtist.avatar" :size="100">
              {{ currentArtist.name?.charAt(0) }}
            </a-avatar>
          </template>
          <template v-else>
            <a-avatar :size="100" style="background-color: #1890ff">
              {{ currentArtist?.name?.charAt(0) || '?' }}
            </a-avatar>
          </template>
        </a-descriptions-item>
        <a-descriptions-item label="封面">
          <template v-if="currentArtist?.cover_image">
            <a-image
              :width="200"
              :src="currentArtist.cover_image"
              :fallback="defaultCover"
            />
          </template>
          <template v-else>
            <div class="empty-cover" style="width: 200px; height: 120px">
              <picture-outlined />
            </div>
          </template>
        </a-descriptions-item>
        <a-descriptions-item label="艺人名称">
          {{ currentArtist?.name }}
        </a-descriptions-item>
        <a-descriptions-item label="别名">
          <template v-if="currentArtist?.alias">
            <a-tag v-for="alias in currentArtist.alias.split(';')" :key="alias">
              {{ alias }}
            </a-tag>
          </template>
        </a-descriptions-item>
        <a-descriptions-item label="性别">
          {{ genderMap[currentArtist?.gender] || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="地区">
          {{ currentArtist?.region || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="出生日期">
          {{ currentArtist?.birth_date ? dayjs(currentArtist.birth_date).format('YYYY-MM-DD') : '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="出道日期">
          {{ currentArtist?.debut_date ? dayjs(currentArtist.debut_date).format('YYYY-MM-DD') : '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="简介">
          {{ currentArtist?.description || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { PlusOutlined, PictureOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { http } from '@/utils/http'
import defaultCover from '@/assets/default-cover.png'
import dayjs from 'dayjs'
import { useRouter, useRoute } from 'vue-router'

const columns = [
  {
    title: '头像',
    dataIndex: 'avatar',
    width: 80,
    slots: { customRender: 'avatar' }
  },
  {
    title: '封面',
    dataIndex: 'cover_image',
    width: 100,
    slots: { customRender: 'coverImage' }
  },
  {
    title: '艺人名称',
    dataIndex: 'name',
    width: 150,
    customRender: ({ text }) => text || '-'
  },
  {
    title: '别名',
    dataIndex: 'alias',
    slots: { customRender: 'alias' }
  },
  {
    title: '地区',
    dataIndex: 'region',
    width: 120,
    customRender: ({ text }) => text || '-'
  },
  {
    title: '出生日期',
    dataIndex: 'birth_date',
    width: 120,
    customRender: ({ text }) => text ? dayjs(text).format('YYYY-MM-DD') : '-'
  },
  {
    title: '出道日期',
    dataIndex: 'debut_date',
    width: 120,
    customRender: ({ text }) => text ? dayjs(text).format('YYYY-MM-DD') : '-'
  },
  {
    title: '性别',
    dataIndex: 'gender',
    width: 80,
    customRender: ({ text }) => {
      const genderMap = {
        male: '男',
        female: '女',
        other: '其他'
      }
      return genderMap[text as keyof typeof genderMap] || '-'
    }
  },
  {
    title: '音乐数',
    dataIndex: 'music_count',
    width: 100,
    customRender: ({ text }) => text || '-'
  },
  {
    title: '专辑数',
    dataIndex: 'album_count',
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
const artists = ref([])
const pagination = ref<TablePaginationConfig>({
  total: 0,
  current: 1,
  pageSize: 10
})

const modalVisible = ref(false)
const formTitle = ref('添加艺人')
const formRef = ref<FormInstance>()
const avatarFileList = ref([])
const coverFileList = ref([])
const searchKeyword = ref('')

const formState = reactive({
  id: undefined,
  name: '',
  alias: '',
  avatar: '',
  cover_image: '',
  description: '',
  region: '',
  birth_date: undefined,
  debut_date: undefined,
  gender: 'other'
})

const rules = {
  name: [{ required: true, message: '请输入艺人名称' }],
  region: [{ required: true, message: '请输入地区' }],
  gender: [{ required: true, message: '请选择性别' }]
}

const router = useRouter()
const route = useRoute()

const drawerVisible = ref(false)
const currentArtist = ref(null)

const genderMap = {
  male: '男',
  female: '女',
  other: '其他'
}

// 获取艺人列表
const fetchArtists = async () => {
  loading.value = true
  try {
    const response = await http.get('/api/admin/artists', {
      params: {
        page: pagination.value.current,
        limit: pagination.value.pageSize,
        keyword: searchKeyword.value
      }
    })
    if (response.data.success) {
      artists.value = response.data.data.list
      pagination.value.total = response.data.data.total
    }
  } catch (error) {
    console.error('获取艺人列表失败:', error)
    message.error('获取艺人列表失败')
  } finally {
    loading.value = false
  }
}

// 处理表格分页变化
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchArtists()
}

// 处理搜索
const handleSearch = () => {
  pagination.value.current = 1
  fetchArtists()
}

// 图片上传前验证
const beforeImageUpload = (file: File) => {
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

// 修改头像上传处理
const handleAvatarUpload = async (options: any) => {
  avatarFileList.value = [{
    uid: '1',
    name: options.file.name,
    status: 'done',
    originFileObj: options.file,
    url: URL.createObjectURL(options.file)
  }]
  options.onSuccess()
}

// 修改封面上传处理
const handleCoverUpload = async (options: any) => {
  coverFileList.value = [{
    uid: '1',
    name: options.file.name,
    status: 'done',
    originFileObj: options.file,
    url: URL.createObjectURL(options.file)
  }]
  options.onSuccess()
}

// 添加艺人
const handleAdd = () => {
  formTitle.value = '添加艺人'
  resetForm()
  modalVisible.value = true
}

// 编辑艺人
const handleEdit = (record: any) => {
  formTitle.value = '编辑艺人'
  formState.id = record.id
  formState.name = record.name
  formState.alias = record.alias
  formState.avatar = record.avatar
  formState.cover_image = record.cover_image
  formState.description = record.description
  formState.region = record.region
  formState.birth_date = record.birth_date ? dayjs(record.birth_date) : undefined
  formState.debut_date = record.debut_date ? dayjs(record.debut_date) : undefined
  formState.gender = record.gender || 'other'

  if (record.avatar) {
    avatarFileList.value = [{
      uid: '1',
      name: '头像',
      status: 'done',
      url: record.avatar
    }]
  }
  if (record.cover_image) {
    coverFileList.value = [{
      uid: '1',
      name: '封面',
      status: 'done',
      url: record.cover_image
    }]
  }

  modalVisible.value = true
}

// 删除艺人
const handleDelete = async (record: any) => {
  try {
    const response = await http.delete(`/api/admin/artists/${record.id}`)
    if (response.data.success) {
      message.success('删除成功')
      if (artists.value.length === 1 && pagination.value.current > 1) {
        pagination.value.current--
      }
      fetchArtists()
    }
  } catch (error) {
    console.error('删除艺人失败:', error)
    message.error('删除失败')
  }
}

// 重置表单
const resetForm = () => {
  formState.id = undefined
  formState.name = ''
  formState.alias = ''
  formState.avatar = ''
  formState.cover_image = ''
  formState.description = ''
  formState.region = ''
  formState.birth_date = undefined
  formState.debut_date = undefined
  avatarFileList.value = []
  coverFileList.value = []
  formRef.value?.resetFields()
  formState.gender = 'other'
}

// 修改提交表单函数
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    // 上传文件前显示加载状态
    const updateFileStatus = (fileList: any[], index: number, status: 'uploading' | 'done' | 'error') => {
      if (fileList[index]) {
        fileList[index] = { ...fileList[index], status }
      }
    }

    // 上传头像
    if (avatarFileList.value.length > 0 && avatarFileList.value[0].originFileObj) {
      updateFileStatus(avatarFileList.value, 0, 'uploading')
      try {
        const formData = new FormData()
        formData.append('file', avatarFileList.value[0].originFileObj)
        const response = await http.post('/api/upload/image', formData)
        if (response.data.success) {
          formState.avatar = response.data.data.url
          updateFileStatus(avatarFileList.value, 0, 'done')
        } else {
          throw new Error('头像上传失败')
        }
      } catch (error) {
        updateFileStatus(avatarFileList.value, 0, 'error')
        throw error
      }
    }

    // 上传封面
    if (coverFileList.value.length > 0 && coverFileList.value[0].originFileObj) {
      updateFileStatus(coverFileList.value, 0, 'uploading')
      try {
        const formData = new FormData()
        formData.append('file', coverFileList.value[0].originFileObj)
        const response = await http.post('/api/upload/image', formData)
        if (response.data.success) {
          formState.cover_image = response.data.data.url
          updateFileStatus(coverFileList.value, 0, 'done')
        } else {
          throw new Error('封面上传失败')
        }
      } catch (error) {
        updateFileStatus(coverFileList.value, 0, 'error')
        throw error
      }
    }

    // 准备提交的数据
    const data = {
      ...formState,
      birth_date: formState.birth_date ? dayjs(formState.birth_date).format('YYYY-MM-DD') : null,
      debut_date: formState.debut_date ? dayjs(formState.debut_date).format('YYYY-MM-DD') : null
    }

    // 提交表单
    const response = await (formState.id
      ? http.put(`/api/admin/artists/${formState.id}`, data)
      : http.post('/api/admin/artists', data))

    if (response.data.success) {
      message.success(formState.id ? '更新成功' : '添加成功')
      modalVisible.value = false
      fetchArtists()
    } else {
      message.error(response.data.message || (formState.id ? '更新失败' : '添加失败'))
    }
  } catch (error: any) {
    console.error('提交表单失败:', error)
    message.error(error.message || '提交失败')
  }
}

// 添加取消处理函数
const handleCancel = () => {
  modalVisible.value = false
  resetForm()
}

// 监听模态框可见性变化
watch(modalVisible, (newVal) => {
  if (!newVal) {
    resetForm() // 当模态框关闭时重置表单
  }
})

// 获取艺人详情
const fetchArtistDetail = async (id: number) => {
  try {
    const response = await http.get(`/api/admin/artists/${id}`)
    if (response.data.success) {
      currentArtist.value = response.data.data.data
      drawerVisible.value = true
    }
  } catch (error) {
    console.error('获取艺人详情失败:', error)
    message.error('获取详情失败')
  }
}

// 添加行点击处理
const customRow = (record: any) => {
  return {
    onClick: () => {
      handleView(record)
    }
  }
}

// 查看详情
const handleView = async (record: any) => {
  await fetchArtistDetail(record.id)
  drawerVisible.value = true
}

// 关闭抽屉
const handleDrawerClose = () => {
  drawerVisible.value = false
  currentArtist.value = null
  // 清除路由参数
  router.replace({
    query: {}
  })
}

// 监听路由参数变化
watch(
  () => route.query.artistId,
  async (newArtistId) => {
    if (newArtistId) {
      await fetchArtistDetail(Number(newArtistId))
      drawerVisible.value = true
    } else {
      drawerVisible.value = false
      currentArtist.value = null
    }
  },
  { immediate: true }
)

// 初始加载
fetchArtists()
</script>

<style scoped>
.artists-list {
  padding: 24px;
}

.table-operations {
  margin-bottom: 16px;
}

.danger {
  color: #ff4d4f;
}

:deep(.ant-upload-select-picture-card) {
  width: 100px;
  height: 100px;
  margin: 0;
}

:deep(.ant-upload-list-picture-card-container) {
  width: 100px;
  height: 100px;
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

.clickable-row {
  cursor: pointer;
  transition: background-color 0.3s;
}

.clickable-row:hover {
  background-color: #f5f5f5;
}
</style> 