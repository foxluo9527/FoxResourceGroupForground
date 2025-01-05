<template>
  <div class="profile-page">
    <a-card title="个人信息">
      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="头像">
          <a-avatar 
            :size="64" 
            :src="userInfo?.avatar"
          >
            {{ userInfo?.nickname?.[0]?.toUpperCase() || userInfo?.username?.[0]?.toUpperCase() }}
          </a-avatar>
        </a-descriptions-item>

        <a-descriptions-item label="用户名">
          {{ userInfo?.username }}
        </a-descriptions-item>

        <a-descriptions-item label="昵称">
          {{ userInfo?.nickname || '未设置' }}
        </a-descriptions-item>

        <a-descriptions-item label="邮箱">
          {{ userInfo?.email }}
        </a-descriptions-item>

        <a-descriptions-item label="角色">
          <a-tag :color="getRoleColor(userInfo?.role)">
            {{ getRoleText(userInfo?.role) }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item label="状态">
          <a-tag :color="getStatusColor(userInfo?.status)">
            {{ getStatusText(userInfo?.status) }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item label="个性签名">
          {{ userInfo?.signature || '未设置' }}
        </a-descriptions-item>

        <a-descriptions-item label="注册时间">
          {{ dayjs(userInfo?.created_at).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>

        <a-descriptions-item label="最后登录">
          {{ dayjs(userInfo?.last_login).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>
      </a-descriptions>

      <div class="actions">
        <a-button type="primary" @click="showEditModal">
          编辑资料
        </a-button>
      </div>
    </a-card>

    <!-- 编辑资料模态框 -->
    <a-modal
      v-model:visible="editModalVisible"
      title="编辑个人资料"
      @ok="handleEditSubmit"
      :confirmLoading="submitting"
    >
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="昵称">
          <a-input v-model:value="editForm.nickname" placeholder="请输入昵称" />
        </a-form-item>

        <a-form-item label="头像">
          <div class="avatar-wrapper">
            <a-upload
              v-model:file-list="fileList"
              name="file"
              list-type="picture-card"
              class="avatar-uploader"
              :show-upload-list="false"
              :before-upload="beforeUpload"
              :customRequest="() => {}"
            >
              <div v-if="previewImage || editForm.avatar">
                <img 
                  :src="previewImage || editForm.avatar" 
                  alt="avatar" 
                  style="width: 100%" 
                />
              </div>
              <div v-else>
                <plus-outlined />
                <div style="margin-top: 8px">上传头像</div>
              </div>
            </a-upload>
            <a-button 
              v-if="previewImage" 
              type="link" 
              class="remove-avatar" 
              @click="removePreview"
            >
              重新选择
            </a-button>
          </div>
        </a-form-item>

        <a-form-item label="个性签名">
          <a-textarea 
            v-model:value="editForm.signature" 
            placeholder="请输入个性签名"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { service } from '@/utils/request'
import dayjs from 'dayjs'
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons-vue'

const userInfo = ref(null)
const editModalVisible = ref(false)
const submitting = ref(false)
const fileList = ref([])
const uploadLoading = ref(false)

const editForm = reactive({
  nickname: '',
  avatar: '',
  signature: ''
})

// 添加预览图片的状态
const previewImage = ref('')
const selectedFile = ref<File | null>(null)

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const response = await service.get('/api/auth/profile')
    if (response.success) {
      userInfo.value = response.data
      // 初始化编辑表单
      editForm.nickname = response.data.nickname || ''
      editForm.avatar = response.data.avatar || ''
      editForm.signature = response.data.signature || ''
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    message.error('获取用户信息失败')
  }
}

// 显示编辑模态框
const showEditModal = () => {
  editModalVisible.value = true
  // 重置预览状态
  previewImage.value = ''
  selectedFile.value = null
}

// 修改头像上传前的校验
const beforeUpload = (file: File) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!isJpgOrPng) {
    message.error('只能上传 JPG/PNG 格式的图片!')
    return false
  }
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    message.error('图片大小不能超过 2MB!')
    return false
  }

  // 创建本地预览
  const reader = new FileReader()
  reader.onload = (e) => {
    previewImage.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
  
  // 保存文件以供后续上传
  selectedFile.value = file
  return false // 阻止自动上传
}

// 移除预览图片
const removePreview = () => {
  previewImage.value = ''
  selectedFile.value = null
}

// 修改编辑提交函数
const handleEditSubmit = async () => {
  submitting.value = true
  try {
    let avatarUrl = userInfo.value?.avatar

    // 如果有选择新文件，先上传图片
    if (selectedFile.value) {
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      
      try {
        const uploadResponse = await service.post('/api/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        if (uploadResponse.success) {
          avatarUrl = uploadResponse.data.url
        } else {
          message.error('头像上传失败')
          return
        }
      } catch (error) {
        console.error('上传头像失败:', error)
        message.error('头像上传失败')
        return
      }
    }

    // 构建要提交的数据
    const updateData: any = {
      nickname: editForm.nickname,
      signature: editForm.signature
    }
    
    // 只有当头像发生变化时才包含头像字段
    if (avatarUrl !== userInfo.value?.avatar) {
      updateData.avatar = avatarUrl
    }

    const response = await service.put('/api/auth/profile', updateData)
    if (response.success) {
      message.success('更新成功')
      editModalVisible.value = false
      fetchUserInfo() // 重新获取用户信息
      // 清理预览状态
      previewImage.value = ''
      selectedFile.value = null
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    message.error('更新失败')
  } finally {
    submitting.value = false
  }
}

// 获取角色显示文本
const getRoleText = (role: string) => {
  const roleMap = {
    'superadmin': '超级管理员',
    'admin': '管理员',
    'user': '普通用户'
  }
  return roleMap[role] || role
}

// 获取角色标签颜色
const getRoleColor = (role: string) => {
  const colorMap = {
    'superadmin': 'red',
    'admin': 'blue',
    'user': 'default'
  }
  return colorMap[role] || 'default'
}

// 获取状态显示文本
const getStatusText = (status: string) => {
  const statusMap = {
    'active': '正常',
    'inactive': '禁用'
  }
  return statusMap[status] || status
}

// 获取状态标签颜色
const getStatusColor = (status: string) => {
  const colorMap = {
    'active': 'success',
    'inactive': 'error'
  }
  return colorMap[status] || 'default'
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
.profile-page {
  padding: 24px;
}

.actions {
  margin-top: 24px;
  text-align: center;
}

.avatar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.remove-avatar {
  padding: 0;
  height: auto;
}

:deep(.avatar-uploader) {
  .ant-upload {
    width: 128px;
    height: 128px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 0;
  }
  
  img {
    width: 128px;
    height: 128px;
    object-fit: cover;
  }
}

:deep(.ant-upload-select) {
  border-radius: 50% !important;
}
</style> 