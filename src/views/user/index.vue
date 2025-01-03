<template>
  <div class="user-list">
    <div class="operation-bar">
      <a-space>
        <!-- 左侧筛选描述 -->
        <span v-if="hasFilters" class="filter-label">
          筛选条件：
          <template v-if="queryParams.role">
            <a-tag closable @close="clearFilter('role')">
              角色：{{ roleMap[queryParams.role] }}
            </a-tag>
          </template>
          <template v-if="queryParams.status">
            <a-tag closable @close="clearFilter('status')">
              状态：{{ statusMap[queryParams.status] }}
            </a-tag>
          </template>
          <template v-if="queryParams.keyword">
            <a-tag closable @close="clearFilter('keyword')">
              关键词：{{ queryParams.keyword }}
            </a-tag>
          </template>
        </span>

        <!-- 筛选控件 -->
        <a-select
          v-if="userStore.role === 'superadmin'"
          v-model:value="queryParams.role"
          placeholder="选择角色"
          style="width: 120px"
          allowClear
          @change="handleFilter"
        >
          <a-select-option value="superadmin">超级管理员</a-select-option>
          <a-select-option value="admin">管理员</a-select-option>
          <a-select-option value="user">普通用户</a-select-option>
        </a-select>

        <a-select
          v-model:value="queryParams.status"
          placeholder="选择状态"
          style="width: 120px"
          allowClear
          @change="handleFilter"
        >
          <a-select-option value="active">正常</a-select-option>
          <a-select-option value="inactive">禁用</a-select-option>
          <a-select-option value="banned">封禁</a-select-option>
        </a-select>

        <a-input-search
          v-model:value="queryParams.keyword"
          placeholder="搜索用户名或邮箱"
          style="width: 200px"
          @search="handleSearch"
          @change="handleInputChange"
        />
      </a-space>
      <!-- 添加授权管理员按钮 -->
      <a-button 
        v-if="userStore.role === 'superadmin'"
        type="primary"
        @click="showGrantAdminModal"
      >
        <user-add-outlined />
        授权管理员
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="users"
      row-key="id"
      :pagination="{
        total: total,
        current: queryParams.page,
        pageSize: queryParams.limit,
        onChange: handlePageChange,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`
      }"
      :loading="loading"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :color="getRoleColor(record.role)">
            {{ roleMap[record.role] }}
          </a-tag>
        </template>
        <template v-if="column.key === 'status'">
          <a-badge
            :status="record.status === 'active' ? 'success' : 'error'"
            :text="record.status === 'active' ? '正常' : '禁用'"
          />
        </template>
        <template v-if="column.key === 'is_online'">
          <a-badge
            :status="record.is_online ? 'success' : 'default'"
            :text="record.is_online ? '在线' : '离线'"
          />
        </template>
        <template v-if="column.key === 'connection_count'">
          {{ record.connection_count ? `${record.connection_count}台设备` : '无' }}
        </template>
        <template v-if="column.key === 'action'">
          <a-button type="link" @click="showUserDetail(record.id)">详情</a-button>
        </template>
      </template>
    </a-table>

    <!-- 用户详情抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      title="用户详情"
      placement="right"
      width="600"
    >
      <template #extra>
        <a-dropdown>
          <a-button type="primary">
            修改状态
            <down-outlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item 
                key="active" 
                :disabled="currentUser?.status === 'active'"
                @click="showStatusConfirm('active')"
              >
                <check-circle-outlined style="color: #52c41a" />
                <span>设为正常</span>
              </a-menu-item>
              <a-menu-item 
                key="inactive" 
                :disabled="currentUser?.status === 'inactive'"
                @click="showStatusConfirm('inactive')"
              >
                <pause-circle-outlined style="color: #faad14" />
                <span>设为禁用</span>
              </a-menu-item>
              <a-menu-item 
                key="banned" 
                :disabled="currentUser?.status === 'banned'"
                @click="showStatusConfirm('banned')"
              >
                <stop-outlined style="color: #ff4d4f" />
                <span>设为封禁</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </template>

      <a-descriptions v-if="currentUser" bordered :column="1">
        <a-descriptions-item label="用户名">{{ currentUser.username }}</a-descriptions-item>
        <a-descriptions-item label="邮箱">{{ currentUser.email }}</a-descriptions-item>
        <a-descriptions-item label="角色">
          <a-tag :color="getRoleColor(currentUser.role)">
            {{ roleMap[currentUser.role] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-badge
            :status="currentUser.status === 'active' ? 'success' : 'error'"
            :text="statusMap[currentUser.status]"
          />
        </a-descriptions-item>
        <a-descriptions-item label="在线状态">
          <a-badge
            :status="currentUser.is_online ? 'success' : 'default'"
            :text="currentUser.is_online ? '在线' : '离线'"
          />
        </a-descriptions-item>
        <a-descriptions-item label="连接数">{{ currentUser.connection_count }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ dayjs(currentUser.created_at).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>
        <a-descriptions-item label="更新时间">
          {{ dayjs(currentUser.updated_at).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>
      </a-descriptions>

      <template v-if="currentUser?.active_connections?.length">
        <a-divider>活动连接</a-divider>
        <a-collapse>
          <a-collapse-panel 
            v-for="(conn, index) in currentUser.active_connections" 
            :key="conn.connection_id"
            :header="`连接 ${index + 1}`"
          >
            <a-descriptions bordered :column="1" size="small">
              <a-descriptions-item label="连接ID">
                <a-typography-text copyable>{{ conn.connection_id }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="IP地址" v-if="conn.client_info?.ip">
                {{ conn.client_info.ip }}
              </a-descriptions-item>
              <a-descriptions-item label="设备" v-if="conn.client_info?.device">
                {{ conn.client_info.device }}
              </a-descriptions-item>
              <a-descriptions-item label="浏览器" v-if="conn.client_info?.browser">
                {{ conn.client_info.browser }}
              </a-descriptions-item>
              <a-descriptions-item label="操作系统" v-if="conn.client_info?.os">
                {{ conn.client_info.os }}
              </a-descriptions-item>
              <a-descriptions-item label="User Agent" v-if="conn.client_info?.userAgent">
                <a-typography-paragraph 
                  :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
                  style="margin-bottom: 0"
                >
                  {{ conn.client_info.userAgent }}
                </a-typography-paragraph>
              </a-descriptions-item>
            </a-descriptions>
          </a-collapse-panel>
        </a-collapse>
      </template>
    </a-drawer>

    <!-- 状态修改确认对话框 -->
    <a-modal
      v-model:visible="statusModalVisible"
      :title="getStatusModalTitle"
      @ok="confirmStatusChange"
      :okButtonProps="{ danger: pendingStatus === 'banned' }"
    >
      <p>{{ getStatusModalContent }}</p>
    </a-modal>

    <!-- 授权管理员对话框 -->
    <a-modal
      v-model:visible="grantAdminModalVisible"
      title="授权管理员"
      @ok="handleGrantAdmin"
      :confirmLoading="grantLoading"
    >
      <a-form :model="grantForm" :rules="rules" ref="grantFormRef">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="grantForm.username" placeholder="请输入用户名" />
        </a-form-item>
        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="grantForm.password" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="grantForm.confirmPassword" placeholder="请再次输入密码" />
        </a-form-item>
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="grantForm.email" placeholder="请输入邮箱" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message, Modal, Form } from 'ant-design-vue'
import {
  getUsers,
  getUserDetail,
  updateUserStatus,
  type User,
  type UserDetail
} from '@/api/user'
import {
  DownOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  DesktopOutlined,
  GlobalOutlined,
  UserAddOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { useUserStore } from '@/store/user'
import type { FormInstance } from 'ant-design-vue'
import { grantAdmin } from '@/api/auth'  // 需要从 auth.ts 导入

// 角色映射
const roleMap = {
  superadmin: '超级管理员',
  admin: '管理员',
  user: '普通用户'
} as const

// 角色标签颜色
const getRoleColor = (role: string) => {
  const colorMap = {
    superadmin: 'red',
    admin: 'blue',
    user: 'green'
  }
  return colorMap[role as keyof typeof colorMap] || 'default'
}

const columns = [
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: '15%'
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
    width: '20%'
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    width: '12%'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: '10%'
  },
  {
    title: '在线状态',
    dataIndex: 'is_online',
    key: 'is_online',
    width: '10%'
  },
  {
    title: '连接设备',
    dataIndex: 'connection_count',
    key: 'connection_count',
    width: '8%'
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: '15%',
    customRender: ({ text }: { text: string }) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
  },
  {
    title: '操作',
    key: 'action',
    width: '10%',
    fixed: 'right'
  }
]

const userStore = useUserStore()

const queryParams = ref({
  page: 1,
  limit: 10,
  keyword: '',
  role: userStore.role === 'superadmin' ? undefined : 'user',
  status: 'active' as 'active' | 'inactive' | 'banned' | undefined  // 默认显示正常用户
})

const users = ref<User[]>([])
const total = ref(0)
const loading = ref(false)

// 状态映射
const statusMap = {
  active: '正常',
  inactive: '禁用',
  banned: '封禁'
} as const

const drawerVisible = ref(false)
const currentUser = ref<UserDetail | null>(null)
const statusModalVisible = ref(false)
const pendingStatus = ref<'active' | 'inactive' | 'banned' | null>(null)

// 获取状态修改对话框标题
const getStatusModalTitle = computed(() => {
  const statusText = statusMap[pendingStatus.value || 'active']
  return `确认修改用户状态为"${statusText}"`
})

// 获取状态修改对话框内容
const getStatusModalContent = computed(() => {
  if (!currentUser.value) return ''
  const statusText = statusMap[pendingStatus.value || 'active']
  let content = `是否确认将用户"${currentUser.value.username}"的状态修改为"${statusText}"？`
  
  if (pendingStatus.value === 'banned') {
    content += '\n封禁后用户将无法登录系统。'
  } else if (pendingStatus.value === 'inactive') {
    content += '\n禁用后用户将被强制下线且无法登录系统。'
  }
  
  return content
})

// 显示状态修改确认对话框
const showStatusConfirm = (status: 'active' | 'inactive' | 'banned') => {
  pendingStatus.value = status
  statusModalVisible.value = true
}

// 确认修改状态
const confirmStatusChange = async () => {
  if (!currentUser.value || !pendingStatus.value) return
  
  try {
    const res = await updateUserStatus(currentUser.value.id, { status: pendingStatus.value })
    if (res.success) {
      message.success('状态更新成功')
      fetchUsers()  // 刷新列表
      showUserDetail(currentUser.value.id)  // 刷新详情
      statusModalVisible.value = false
    }
  } catch (error) {
    message.error('状态更新失败')
  }
}

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: queryParams.value.page,
      limit: queryParams.value.limit
    }

    // 添加关键词搜索
    if (queryParams.value.keyword.trim()) {
      params.keyword = queryParams.value.keyword.trim()
    }

    // 添加状态筛选
    if (queryParams.value.status) {
      params.status = queryParams.value.status
    }

    // 添加角色筛选
    if (userStore.role === 'superadmin') {
      if (queryParams.value.role) {
        params.role = queryParams.value.role
      }
    } else {
      params.role = 'user'  // 非超级管理员只能查看普通用户
    }

    const res = await getUsers(params)
    if (res.success) {
      users.value = res.data.users
      total.value = res.data.total
      queryParams.value.page = res.data.page
      queryParams.value.limit = res.data.limit
    }
  } catch (error) {
    message.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 处理页码变化
const handlePageChange = (page: number, pageSize: number) => {
  queryParams.value.page = page
  queryParams.value.limit = pageSize
  fetchUsers()
}

// 处理搜索
const handleSearch = () => {
  queryParams.value.page = 1
  fetchUsers()
}

// 显示用户详情
const showUserDetail = async (id: number) => {
  try {
    const res = await getUserDetail(id)
    if (res.success) {
      currentUser.value = res.data
      drawerVisible.value = true
    }
  } catch (error) {
    message.error('获取用户详情失败')
  }
}

// 处理筛选条件变化
const handleFilter = () => {
  queryParams.value.page = 1  // 重置页码
  fetchUsers()
}

// 判断是否有筛选条件
const hasFilters = computed(() => {
  return !!(queryParams.value.role || queryParams.value.status || queryParams.value.keyword)
})

// 清除单个筛选条件
const clearFilter = (type: 'role' | 'status' | 'keyword') => {
  if (type === 'role' && userStore.role !== 'superadmin') {
    return // 非超级管理员不能清除角色筛选
  }
  queryParams.value[type] = type === 'role' && userStore.role !== 'superadmin' ? 'user' : undefined
  handleFilter()
}

// 清除所有筛选条件
const clearAllFilters = () => {
  queryParams.value = {
    ...queryParams.value,
    keyword: '',
    role: userStore.role === 'superadmin' ? undefined : 'user',
    status: undefined
  }
  handleFilter()
}

// 处理输入框变化
const handleInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.value) {
    handleFilter()
  }
}

const grantAdminModalVisible = ref(false)
const grantLoading = ref(false)
const grantFormRef = ref<FormInstance>()
const grantForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  email: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }],
  confirmPassword: [
    { required: true, message: '请确认密码' },
    {
      validator: async (_rule: any, value: string) => {
        if (value && value !== grantForm.value.password) {
          throw new Error('两次输入的密码不一致')
        }
      }
    }
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入正确的邮箱格式' }
  ]
}

const showGrantAdminModal = () => {
  grantAdminModalVisible.value = true
}

const handleGrantAdmin = () => {
  grantFormRef.value?.validate().then(async () => {
    try {
      grantLoading.value = true
      const res = await grantAdmin({
        username: grantForm.value.username,
        password: grantForm.value.password,
        email: grantForm.value.email
      })
      if (res.success) {
        message.success('授权管理员成功')
        grantAdminModalVisible.value = false
        grantForm.value = {
          username: '',
          password: '',
          confirmPassword: '',
          email: ''
        }
        fetchUsers()  // 刷新用户列表
      }
    } catch (error) {
      message.error('授权管理员失败')
    } finally {
      grantLoading.value = false
    }
  })
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-list {
  padding: 24px;
}

.operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.ant-space {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

:deep(.ant-collapse) {
  margin-top: 16px;
}

:deep(.ant-descriptions) {
  margin-bottom: 0;
}

:deep(.ant-modal-confirm-content) {
  white-space: pre-line;
}

.operation-bar .ant-space {
  gap: 16px !important;
}

.filter-label {
  color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.ant-tag) {
  margin: 0;
  cursor: pointer;
}

.operation-bar .ant-space {
  gap: 16px !important;
}

/* 移除不需要的样式 */
.filter-wrapper,
.filter-tags {
  display: none;
}
</style> 