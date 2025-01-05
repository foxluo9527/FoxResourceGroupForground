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
      :customRow="customRow"
      :row-class-name="() => 'clickable-row'"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'username'">
          <a-space class="user-info">
            <a-avatar 
              :size="32" 
              :src="record.avatar"
              :style="{ 
                backgroundColor: record.avatar ? undefined : '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }"
            >
              {{ getAvatarText(record) }}
            </a-avatar>
            <div class="user-info-text">
              <div class="username">{{ record.username }}</div>
              <div class="nickname" v-if="record.nickname">{{ record.nickname }}</div>
            </div>
          </a-space>
        </template>
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
      :title="currentUser?.nickname || currentUser?.username"
      placement="right"
      width="600"
    >
      <template #extra>
        <a-button @click="showUserPosts">
          <read-outlined />
          查看帖子
        </a-button>
      </template>

      <a-descriptions v-if="currentUser" bordered :column="1">
        <a-descriptions-item label="头像">
          <a-avatar 
            :size="64" 
            :src="currentUser.avatar"
            shape="square"
          >
            {{ currentUser.nickname?.[0] || currentUser.username?.[0] }}
          </a-avatar>
        </a-descriptions-item>
        <a-descriptions-item label="用户名">{{ currentUser.username }}</a-descriptions-item>
        <a-descriptions-item label="昵称">{{ currentUser.nickname || '-' }}</a-descriptions-item>
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

      <!-- 用户帖子子抽屉 -->
      <a-drawer
        v-model:visible="postsDrawerVisible"
        :title="`${currentUser?.nickname || currentUser?.username} 的帖子`"
        placement="right"
        :width="800"
      >
        <a-table
          :columns="postColumns"
          :data-source="userPosts"
          :loading="postsLoading"
          :pagination="postsPagination"
          row-key="id"
          @change="handlePostsTableChange"
          :customRow="customPostRow"
        >
          <template #tags="{ record }">
            <a-space wrap>
              <a-tag 
                v-for="tag in record.tags" 
                :key="tag"
                class="clickable-tag"
                @click.stop="handleTagClick"
              >
                {{ tag }}
              </a-tag>
            </a-space>
          </template>
        </a-table>

        <!-- 添加帖子详情抽屉 -->
        <a-drawer
          v-model:visible="postDetailDrawerVisible"
          :title="postDetail?.title"
          placement="right"
          width="600"
        >
          <a-descriptions v-if="postDetail" bordered :column="1">
            <a-descriptions-item label="作者">
              <a-space>
                <a-avatar :src="postDetail.author_avatar" />
                <span>{{ postDetail.author_name }}</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="内容">{{ postDetail.content }}</a-descriptions-item>
            <a-descriptions-item label="标签">
              <a-space wrap>
                <a-tag 
                  v-for="tag in postDetail.tags" 
                  :key="tag"
                  class="clickable-tag"
                  @click.stop="handleTagClick"
                >
                  {{ tag }}
                </a-tag>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="浏览数">{{ postDetail.view_count }}</a-descriptions-item>
            <a-descriptions-item label="点赞数">{{ postDetail.like_count }}</a-descriptions-item>
            <a-descriptions-item label="评论数">{{ postDetail.comment_count }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">
              {{ new Date(postDetail.created_at).toLocaleString() }}
            </a-descriptions-item>
            <a-descriptions-item label="更新时间">
              {{ new Date(postDetail.updated_at).toLocaleString() }}
            </a-descriptions-item>
            <a-descriptions-item label="图片" v-if="postDetail.images?.length">
              <a-image-preview-group>
                <a-space wrap size="middle">
                  <a-image
                    v-for="image in postDetail.images"
                    :key="image.id"
                    :src="image.url"
                    :width="120"
                    style="object-fit: cover; border-radius: 4px;"
                  />
                </a-space>
              </a-image-preview-group>
            </a-descriptions-item>
          </a-descriptions>
        </a-drawer>
      </a-drawer>
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
import { ref, onMounted, computed, watch } from 'vue'
import { message, Modal, Form, Avatar } from 'ant-design-vue'
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
  UserAddOutlined,
  ReadOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { useUserStore } from '@/store/user'
import type { FormInstance } from 'ant-design-vue'
import { grantAdmin } from '@/api/auth'
import { useRoute, useRouter } from 'vue-router'
import { getPosts, getPostDetail } from '@/api/posts'

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
    width: '15%',
    slots: { customRender: 'username' }
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
    width: '13%'
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: '20%',
    customRender: ({ text }: { text: string }) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
  }
]

const route = useRoute()
const router = useRouter()

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

// 修改路由参数监听，使用防抖
const debouncedShowUserDetail = (id: number) => {
  // 如果已经打开了相同用户的详情，直接返回
  if (currentUser.value?.id === id && drawerVisible.value) {
    return
  }

  // 如果正在获取用户详情，直接返回
  if (loading.value) {
    return
  }

  loading.value = true
  getUserDetail(id)
    .then(res => {
      if (res.success) {
        currentUser.value = res.data
        drawerVisible.value = true
      }
    })
    .catch(() => {
      message.error('获取用户详情失败')
      console.error('获取用户详情失败:', error)
    })
    .finally(() => {
      loading.value = false
    })
}

// 修改路由参数监听
watch(
  () => route.query.userId,
  (newUserId) => {
    if (newUserId) {
      debouncedShowUserDetail(Number(newUserId))
    } else {
      drawerVisible.value = false
    }
  },
  { immediate: true }
)

// 修改显示用户详情函数
const showUserDetail = (id: number) => {
  // 通过修改路由参数来触发详情显示
  router.push({
    path: route.path,
    query: {
      ...route.query,
      userId: String(id)
    }
  })
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

// 帖子相关状态
const postsDrawerVisible = ref(false)
const userPosts = ref([])
const postsLoading = ref(false)
const postsPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`
})

// 添加帖子详情相关状态
const postDetailDrawerVisible = ref(false)
const postDetail = ref<PostDetail | null>(null)

// 添加帖子行点击处理
const customPostRow = (record: any) => {
  return {
    onClick: async () => {
      try {
        const response = await getPostDetail(record.id)
        if (response.success) {
          postDetail.value = response.data
          postDetailDrawerVisible.value = true
        }
      } catch (error) {
        message.error('获取帖子详情失败')
      }
    }
  }
}

// 修改抽屉关闭处理
watch([drawerVisible, postsDrawerVisible], ([drawer, posts]) => {
  if (!drawer) {
    // 清理状态
    currentUser.value = null
    
    // 清除路由参数
    if (route.query.userId) {
      router.replace({
        path: route.path,
        query: {
          ...route.query,
          userId: undefined
        }
      })
    }
  }
  if (!posts) {
    userPosts.value = []
    postsPagination.value.current = 1
  }
})

// 添加行点击处理
const customRow = (record: User) => {
  return {
    onClick: () => {
      showUserDetail(record.id)
    }
  }
}

// 获取头像文字
const getAvatarText = (user: User) => {
  return (user.nickname?.[0] || user.username?.[0])?.toUpperCase() || '?'
}

// 帖子列表列定义
const postColumns = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
    slots: { customRender: 'tags' }
  },
  {
    title: '浏览数',
    dataIndex: 'view_count',
    key: 'view_count'
  },
  {
    title: '点赞数',
    dataIndex: 'like_count',
    key: 'like_count'
  },
  {
    title: '评论数',
    dataIndex: 'comment_count',
    key: 'comment_count'
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) => new Date(text).toLocaleString()
  }
]

// 获取用户帖子
const fetchUserPosts = async () => {
  if (!currentUser.value) return
  
  postsLoading.value = true
  try {
    const response = await getPosts({
      page: postsPagination.value.current,
      limit: postsPagination.value.pageSize,
      author_id: currentUser.value.id
    })
    if (response.success) {
      userPosts.value = response.data.list
      postsPagination.value.total = response.data.total
      postsPagination.value.current = response.data.current
      postsPagination.value.pageSize = response.data.pageSize
    }
  } catch (error) {
    message.error('获取用户帖子失败')
  } finally {
    postsLoading.value = false
  }
}

// 处理帖子表格分页变化
const handlePostsTableChange = (paginationConfig: any) => {
  postsPagination.value.current = paginationConfig.current
  postsPagination.value.pageSize = paginationConfig.pageSize
  fetchUserPosts()
}

// 显示用户帖子
const showUserPosts = () => {
  postsDrawerVisible.value = true
  fetchUserPosts()
}

// 监听帖子抽屉关闭
watch(postsDrawerVisible, (newVal) => {
  if (!newVal) {
    userPosts.value = []
    postsPagination.value.current = 1
  }
})

// 处理标签点击
const handleTagClick = () => {
  router.push({
    name: 'Tags',  // 使用命名路由
    query: { 
      type: 'post'
    },
    replace: false  // 确保不使用 replace
  }).then(() => {
    // 关闭抽屉
    postsDrawerVisible.value = false
    drawerVisible.value = false
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

.clickable-row {
  cursor: pointer;
  transition: background-color 0.3s;
}

.clickable-row:hover {
  background-color: #f5f5f5;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.username {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.nickname {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

:deep(.ant-avatar) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background-color: #1890ff;
  color: #fff;
  font-weight: 500;
}

:deep(.ant-drawer-header) {
  padding: 16px 24px;
}

:deep(.ant-drawer .ant-drawer) {
  position: absolute;
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.clickable-tag:hover {
  opacity: 0.8;
}
</style> 