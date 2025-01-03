<template>
  <div class="announcements">
    <div class="operation-bar">
      <a-space>
        <a-select
          v-model:value="queryParams.type"
          placeholder="选择公告类型"
          style="width: 200px"
          allowClear
        >
          <a-select-option value="system">系统公告</a-select-option>
          <a-select-option value="activity">活动公告</a-select-option>
          <a-select-option value="maintenance">维护公告</a-select-option>
          <a-select-option value="update">更新公告</a-select-option>
        </a-select>

        <a-input-search
          v-model:value="queryParams.keyword"
          placeholder="搜索公告"
          style="width: 200px"
          @search="handleSearch"
        />

        <a-button type="primary" @click="showCreateModal">
          <plus-outlined />
          发布公告
        </a-button>
      </a-space>
    </div>

    <a-table 
      :columns="columns" 
      :data-source="announcements" 
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
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="handleEdit(record)">编辑</a-button>
            <a-popconfirm
              title="确定要删除这条公告吗？"
              @confirm="handleDelete(record.id)"
            >
              <a-button type="link" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
        <template v-else-if="column.key === 'content'">
          <span :title="record.content">{{ record.content }}</span>
        </template>
        <template v-else-if="column.key === 'createdAt' || column.key === 'updatedAt'">
          {{ formatDate(record[column.key]) }}
        </template>
      </template>
    </a-table>

    <a-modal
    v-model:visible="modalVisible"
    :title="modalTitle"
    @ok="handleModalOk"
    @cancel="handleModalCancel"
    :maskClosable="false"
    :destroyOnClose="true"
    :keyboard="true"
    width="720px"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      :label-col="{ span: 4 }"
      :wrapper-col="{ span: 20 }"
    >
      <a-form-item label="标题" name="title">
        <a-input v-model:value="formState.title" placeholder="请输入公告标题" />
      </a-form-item>
      
      <a-form-item label="内容" name="content">
        <a-textarea
          v-model:value="formState.content"
          :rows="4"
          placeholder="请输入公告内容"
        />
      </a-form-item>

      <a-form-item label="类型" name="type">
        <a-select v-model:value="formState.type" placeholder="请选择公告类型">
          <a-select-option value="system">系统公告</a-select-option>
          <a-select-option value="activity">活动公告</a-select-option>
          <a-select-option value="maintenance">维护公告</a-select-option>
          <a-select-option value="update">更新公告</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="优先级" name="priority">
        <a-input-number 
          v-model:value="formState.priority" 
          :min="1" 
          :max="10"
          placeholder="请输入优先级(1-10)"
        />
      </a-form-item>

      <a-form-item label="发布时间" name="publish_time">
        <a-date-picker 
          v-model:value="formState.publish_time" 
          :show-time="false"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          placeholder="选择发布时间"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item label="过期时间" name="expire_time">
        <a-date-picker 
          v-model:value="formState.expire_time" 
          :show-time="false"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          placeholder="选择过期时间"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item label="显示类型" name="show_type">
        <a-select v-model:value="formState.show_type" placeholder="请选择显示类型">
          <a-select-option value="banner">横幅</a-select-option>
          <a-select-option value="popup">弹窗</a-select-option>
          <a-select-option value="notification">通知</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type Announcement
} from '@/api/announcement'
import dayjs from 'dayjs'

const columns = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    width: '15%'
  },
  {
    title: '内容',
    dataIndex: 'content',
    key: 'content',
    ellipsis: true,
    width: '25%'
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: '10%',
    customRender: ({ text }: { text: string }) => announcementTypeMap[text as keyof typeof announcementTypeMap] || text
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: '10%'
  },
  {
    title: '发布时间',
    dataIndex: 'publish_time',
    key: 'publish_time',
    width: '15%',
    customRender: ({ text }: { text: string }) => formatDate(text)
  },
  {
    title: '过期时间',
    dataIndex: 'expire_time',
    key: 'expire_time',
    width: '15%',
    customRender: ({ text }: { text: string }) => formatDate(text)
  },
  {
    title: '操作',
    key: 'action',
    width: '10%',
    fixed: 'right'
  }
]

const queryParams = ref({
  page: 1,
  limit: 20,
  status: 'published' as const,
  type: undefined as string | undefined,
  keyword: ''
})

const announcements = ref<Announcement[]>([])
const total = ref(0)
const loading = ref(false)
const modalVisible = ref(false)
const modalTitle = ref('发布公告')
const formRef = ref<FormInstance>()
const currentId = ref<number>()

const formState = ref({
  title: '',
  content: '',
  type: 'system',
  status: 'published',
  priority: 5,
  publish_time: null,
  expire_time: null,
  target_users: 'all',
  show_type: 'banner'
})

const rules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }],
  type: [{ required: true, message: '请选择公告类型', trigger: 'change' }],
  priority: [{ required: true, message: '请输入优先级', trigger: 'change' }],
  publish_time: [{ required: true, message: '请选择发布时间', trigger: 'change' }],
  expire_time: [{ required: true, message: '请选择过期时间', trigger: 'change' }],
  show_type: [{ required: true, message: '请选择显示类型', trigger: 'change' }]
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return dayjs(dateStr).format('YYYY-MM-DD')
}

// 获取公告列表
const fetchAnnouncements = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: queryParams.value.page,
      limit: queryParams.value.limit,
      status: queryParams.value.status
    }

    if (queryParams.value.type) {
      params.type = queryParams.value.type
    }

    if (queryParams.value.keyword.trim()) {
      params.keyword = queryParams.value.keyword.trim()
    }

    const res = await getAnnouncements(params)
    if (res.success) {
      announcements.value = res.data.announcements
      total.value = res.data.total
      queryParams.value.page = res.data.current
      queryParams.value.limit = res.data.pageSize
    }
  } catch (error) {
    message.error('获取公告列表失败')
  } finally {
    loading.value = false
  }
}

// 处理页码变化
const handlePageChange = (page: number, pageSize: number) => {
  queryParams.value.page = page
  queryParams.value.limit = pageSize
  fetchAnnouncements()
}

// 处理搜索
const handleSearch = () => {
  queryParams.value.page = 1  // 重置页码
  fetchAnnouncements()
}

// 监听筛选条件变化
watch(
  () => queryParams.value.type,
  () => {
    queryParams.value.page = 1  // 重置页码
    fetchAnnouncements()
  }
)

// 更新重置表单的方法
const resetForm = () => {
  formState.value = {
    title: '',
    content: '',
    type: 'system',
    status: 'published',
    priority: 5,
    publish_time: null,
    expire_time: null,
    target_users: 'all',
    show_type: 'banner'
  }
}

// 更新显示创建模态框的方法
const showCreateModal = () => {
  modalTitle.value = '发布公告'
  currentId.value = undefined
  resetForm()
  modalVisible.value = true
}

// 更新编辑方法
const handleEdit = (record: Announcement) => {
  modalTitle.value = '编辑公告'
  currentId.value = record.id
  formState.value = {
    ...record,
    publish_time: record.publish_time ? dayjs(record.publish_time).format('YYYY-MM-DD') : null,
    expire_time: record.expire_time ? dayjs(record.expire_time).format('YYYY-MM-DD') : null
  }
  modalVisible.value = true
}

// 处理模态框确认
const handleModalOk = () => {
  formRef.value?.validate().then(async () => {
    try {
      const submitData = {
        ...formState.value,
        publish_time: formState.value.publish_time,
        expire_time: formState.value.expire_time
      }

      if (currentId.value) {
        // 更新公告
        const res = await updateAnnouncement(currentId.value, submitData)
        if (res.success) {
          message.success('更新成功')
          modalVisible.value = false
          fetchAnnouncements()
        }
      } else {
        // 创建公告
        const res = await createAnnouncement(submitData)
        if (res.success) {
          message.success('发布成功')
          modalVisible.value = false
          fetchAnnouncements()
        }
      }
    } catch (error) {
      message.error(currentId.value ? '更新失败' : '发布失败')
    }
  })
}

// 处理模态框取消
const handleModalCancel = () => {
  modalVisible.value = false
  formRef.value?.resetFields()
}

// 处理删除
const handleDelete = async (id: number) => {
  try {
    const res = await deleteAnnouncement(id)
    if (res.success) {
      message.success('删除成功')
      fetchAnnouncements()
    }
  } catch (error) {
    message.error('删除失败')
  }
}

// 添加公告类型映射
const announcementTypeMap = {
  system: '系统公告',
  activity: '活动公告',
  maintenance: '维护公告',
  update: '更新公告'
} as const

onMounted(() => {
  fetchAnnouncements()
})
</script>

<style scoped>
.announcements {
  padding: 24px;
}

.operation-bar {
  margin-bottom: 16px;
}

.ant-space {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
</style> 