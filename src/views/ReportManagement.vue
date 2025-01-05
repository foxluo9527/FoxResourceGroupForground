<template>
  <div class="report-management">
    <a-card>
      <template #title>
        <a-space>
          <a-select
            v-model:value="queryParams.status"
            style="width: 120px"
            placeholder="状态筛选"
            @change="handleFilter"
            allowClear
          >
            <a-select-option value="pending">待处理</a-select-option>
            <a-select-option value="resolved">已解决</a-select-option>
            <a-select-option value="rejected">已拒绝</a-select-option>
          </a-select>
          <a-select
            v-model:value="queryParams.type"
            style="width: 120px"
            placeholder="类型筛选"
            @change="handleFilter"
            allowClear
          >
            <a-select-option value="post">帖子</a-select-option>
            <a-select-option value="post_comment">帖子评论</a-select-option>
            <a-select-option value="music">音乐</a-select-option>
            <a-select-option value="music_comment">音乐评论</a-select-option>
          </a-select>
          <a-input-search
            v-model:value="queryParams.keyword"
            placeholder="搜索举报内容"
            style="width: 200px"
            @search="handleSearch"
            allowClear
          />
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="reports"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
        :custom-row="customRow"
        :row-class-name="() => 'clickable-row'"
      >
        <!-- 举报者 -->
        <template #reporter="{ record }">
          <a-space>
            <a-avatar :src="record.reporter_avatar" :size="32">
              {{ record.reporter_nickname?.[0] }}
            </a-avatar>
            <span>{{ record.reporter_nickname }}</span>
          </a-space>
        </template>

        <!-- 举报类型 -->
        <template #type="{ record }">
          <a-tag :color="getTypeColor(record.target_type)">
            {{ typeMap[record.target_type] }}
          </a-tag>
        </template>

        <!-- 状态 -->
        <template #status="{ record }">
          <a-tag :color="getStatusColor(record.status)">
            {{ statusMap[record.status] }}
          </a-tag>
        </template>

        <!-- 操作 -->
        <template #action="{ record }">
          <a-space>
            <a-button 
              type="link" 
              :disabled="record.status === 'handled'"
              @click="handleReport(record)"
            >
              {{ record.status === 'handled' ? '已处理' : '处理' }}
            </a-button>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 处理举报的抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="currentReport ? '处理举报' : '查看举报'"
      placement="right"
      width="600"
      :footer="currentReport?.status === 'pending'"
    >
      <template #footer v-if="currentReport?.status === 'pending'">
        <a-space>
          <a-button @click="drawerVisible = false">取消</a-button>
          <a-button type="danger" @click="handleReject">拒绝</a-button>
          <a-button type="primary" @click="showProcessModal">处理</a-button>
        </a-space>
      </template>

      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="举报者">
          <a-space>
            <a-avatar :src="currentReport?.reporter_avatar">
              {{ currentReport?.reporter_nickname?.[0] }}
            </a-avatar>
            <span>{{ currentReport?.reporter_nickname }}</span>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="举报类型">
          <a-tag :color="getTypeColor(currentReport?.target_type)">
            {{ typeMap[currentReport?.target_type] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="举报原因">
          {{ currentReport?.reason }}
        </a-descriptions-item>
        <a-descriptions-item label="举报时间">
          {{ currentReport?.created_at ? dayjs(currentReport.created_at).format('YYYY-MM-DD HH:mm:ss') : '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="getStatusColor(currentReport?.status)">
            {{ statusMap[currentReport?.status] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="处理结果" v-if="currentReport?.result">
          {{ currentReport.result }}
        </a-descriptions-item>
        <a-descriptions-item label="处理时间" v-if="currentReport?.processed_at">
          {{ dayjs(currentReport.processed_at).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>
        <a-descriptions-item label="详细说明">
          {{ currentReport?.description }}
        </a-descriptions-item>
        <a-descriptions-item label="证据">
          {{ currentReport?.evidence }}
        </a-descriptions-item>
        <a-descriptions-item label="处理人" v-if="currentReport?.handler_nickname">
          {{ currentReport?.handler_nickname || currentReport?.handler_username }}
        </a-descriptions-item>
        <a-descriptions-item label="举报对象">
          <a-button 
            type="link" 
            @click="handleViewTarget(currentReport)"
            v-if="currentReport?.target_id"
          >
            {{ getTargetText(currentReport) }}
          </a-button>
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>

    <!-- 处理举报的模态框 -->
    <a-modal
      v-model:visible="handleModalVisible"
      title="处理举报"
      @ok="submitHandle"
      :confirmLoading="loading"
    >
      <a-form :model="handleForm" layout="vertical">
        <a-form-item label="处理状态" required>
          <a-select v-model:value="handleForm.status" style="width: 100%">
            <a-select-option value="resolved">已解决</a-select-option>
            <a-select-option value="rejected">已拒绝</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="处理结果" required>
          <a-textarea
            v-model:value="handleForm.result"
            :rows="4"
            placeholder="请输入处理结果"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { service } from '@/utils/request'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'

const router = useRouter()

const loading = ref(false)
const reports = ref([])
const drawerVisible = ref(false)
const currentReport = ref(null)
const processModalVisible = ref(false)
const processForm = reactive({
  status: 'processing',
  result: ''
})

const queryParams = reactive({
  status: undefined as string | undefined,
  type: undefined as string | undefined,
  keyword: '',
  page: 1,
  limit: 10
})

const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const typeMap = {
  'post': '帖子',
  'post-comment': '帖子评论',
  'music': '音乐',
  'music-comment': '音乐评论'
}

const statusMap = {
  pending: '待处理',
  resolved: '已解决',
  rejected: '已拒绝'
}

const columns = [
  {
    title: '举报者',
    key: 'reporter',
    slots: { customRender: 'reporter' }
  },
  {
    title: '举报类型',
    key: 'type',
    slots: { customRender: 'type' }
  },
  {
    title: '举报原因',
    dataIndex: 'reason',
    ellipsis: true
  },
  {
    title: '举报时间',
    dataIndex: 'created_at',
    width: 180,
    customRender: ({ text }) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    slots: { customRender: 'status' }
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    slots: { customRender: 'action' }
  }
]

const getTypeColor = (type: string) => {
  const colorMap = {
    'post': 'blue',
    'post-comment': 'cyan',
    'music': 'purple',
    'music-comment': 'magenta'
  }
  return colorMap[type] || 'default'
}

const getStatusColor = (status: string) => {
  const colorMap = {
    pending: 'warning',
    processing: 'processing',
    resolved: 'success',
    rejected: 'error'
  }
  return colorMap[status] || 'default'
}

// 获取举报列表
const fetchReports = async () => {
  loading.value = true
  try {
    const response = await service.get('/api/admin/reports', {
      params: {
        ...queryParams,
        page: pagination.current,
        limit: pagination.pageSize
      }
    })
    if (response.success) {
      reports.value = response.data.list
      pagination.total = response.data.total
      // 如果后端没有返回当前页和每页数量，就使用前端的值
      pagination.current = response.data.current || queryParams.page
      pagination.pageSize = response.data.pageSize || queryParams.limit
    }
  } catch (error) {
    message.error('获取举报列表失败')
  } finally {
    loading.value = false
  }
}

// 处理筛选
const handleFilter = () => {
  queryParams.page = 1
  pagination.current = 1
  fetchReports()
}

// 处理搜索
const handleSearch = () => {
  queryParams.page = 1
  pagination.current = 1
  fetchReports()
}

// 处理表格变化
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current || 1
  pagination.pageSize = pag.pageSize || 10
  queryParams.page = pagination.current
  queryParams.limit = pagination.pageSize
  fetchReports()
}

// 获取举报详情
const fetchReportDetail = async (id: number) => {
  try {
    const response = await service.get(`/api/admin/reports/${id}`)
    if (response.success) {
      currentReport.value = response.data
    }
  } catch (error) {
    console.error('获取举报详情失败:', error)
    message.error('获取详情失败')
  }
}

// 查看举报
const handleView = async (record: any) => {
  await fetchReportDetail(record.id)
  drawerVisible.value = true
}

// 显示处理模态框
const showProcessModal = () => {
  processForm.result = ''
  processModalVisible.value = true
}

// 处理举报
const handleProcess = async () => {
  if (!processForm.result.trim()) {
    message.warning('请输入处理结果')
    return
  }

  try {
    const response = await service.put(`/api/admin/reports/${currentReport.value.id}/process`, processForm)
    if (response.success) {
      message.success('处理成功')
      processModalVisible.value = false
      drawerVisible.value = false
      fetchReports()
    }
  } catch (error) {
    console.error('处理举报失败:', error)
    message.error('处理失败')
  }
}

// 处理拒绝
const handleReject = async () => {
  try {
    const response = await service.put(`/api/admin/reports/${currentReport.value.id}/process`, {
      status: 'rejected',
      result: '举报内容不符合要求，已拒绝'
    })
    if (response.success) {
      message.success('已拒绝举报')
      drawerVisible.value = false
      fetchReports()
    }
  } catch (error) {
    message.error('操作失败')
  }
}

// 获取举报对象的显示文本
const getTargetText = (report: any) => {
  if (!report) return ''
  
  switch (report.target_type) {
    case 'music':
      return '查看音乐'
    case 'music-comment':
      return '查看音乐评论'
    case 'post':
      return '查看帖子'
    case 'post-comment':
      return '查看帖子评论'
    default:
      return '查看详情'
  }
}

// 处理查看举报对象
const handleViewTarget = (report: any) => {
  if (!report?.target_id) return

  switch (report.target_type) {
    case 'music':
      // 跳转到音乐详情
      router.push({
        path: '/music/songs',
        query: { musicId: report.target_id }
      })
      break
      
    case 'music-comment':
      // 跳转到音乐评论
      router.push({
        path: '/music/comments',
        query: { commentId: report.target_id }
      })
      break
      
    case 'post':
      // 跳转到帖子详情，使用 state 传递数据
      router.push({
        path: '/posts/list',
        query: { postId: report.target_id },
        state: { openDetail: true }
      })
      break
      
    case 'post-comment':
      // 跳转到帖子评论
      router.push({
        path: '/posts/comments',
        query: { commentId: report.target_id }
      })
      break
      
    default:
      message.warning('未知的举报对象类型')
  }
}

// 处理举报相关的状态
const handleModalVisible = ref(false)
const handleForm = reactive({
  status: 'resolved',
  result: ''
})
const currentHandleReport = ref<any>(null)

// 修改处理举报的函数
const handleReport = (record: any) => {
  currentHandleReport.value = record
  handleForm.status = 'resolved'
  handleForm.result = ''
  handleModalVisible.value = true
}

// 添加处理提交函数
const submitHandle = async () => {
  if (!handleForm.result.trim()) {
    message.error('请输入处理结果')
    return
  }

  try {
    const response = await service.put(`/api/admin/reports/${currentHandleReport.value.id}/process`, {
      result: handleForm.result,
      status: handleForm.status
    })
    
    if (response.success) {
      message.success('处理成功')
      handleModalVisible.value = false
      fetchReports()
    } else {
      message.error(response.message || '处理失败')
    }
  } catch (error) {
    message.error('处理失败')
    console.error('处理举报失败:', error)
  }
}

// 添加表格行点击配置
const customRow = (record: any) => {
  return {
    onClick: (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // 如果点击的是按钮或链接，不触发详情打开
      if (target.closest('.ant-btn') || target.closest('a')) {
        return
      }
      handleView(record)
    }
  }
}

// 初始加载
fetchReports()
</script>

<style scoped>
.report-management {
  padding: 24px;
}

:deep(.ant-descriptions-item-label) {
  width: 100px;
}

:deep(.ant-btn-link) {
  padding: 0;
  height: auto;
}

:deep(.report-handle-modal .ant-modal-confirm-content) {
  margin-top: 8px;
}

:deep(.report-handle-modal .ant-textarea) {
  margin-top: 8px;
}

:deep(.report-handle-modal) {
  .ant-modal-confirm-content {
    margin-top: 16px;
  }
  
  .modal-form-item {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .modal-form-label {
    margin-bottom: 8px;
    color: rgba(0, 0, 0, 0.85);
    font-size: 14px;
  }
  
  .report-result-input {
    width: 100%;
  }
  
  .ant-modal-confirm-btns {
    margin-top: 24px;
  }
}

:deep(.ant-modal-body) {
  padding: 24px;
}

:deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

:deep(.clickable-row) {
  cursor: pointer;
}

:deep(.clickable-row:hover) {
  background-color: #f5f5f5;
}
</style>
