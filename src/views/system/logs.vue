<template>
  <div class="logs">
    <div class="operation-bar">
      <a-space>
        <!-- 操作类型筛选 -->
        <a-select
          v-model:value="queryParams.action"
          placeholder="操作类型"
          style="width: 120px"
          allowClear
          @change="handleFilter"
        >
          <a-select-option value="create">创建</a-select-option>
          <a-select-option value="update">更新</a-select-option>
          <a-select-option value="delete">删除</a-select-option>
          <a-select-option value="batch_operation">批量操作</a-select-option>
        </a-select>

        <!-- 操作对象筛选 -->
        <a-select
          v-model:value="queryParams.target"
          placeholder="操作对象"
          style="width: 120px"
          allowClear
          @change="handleFilter"
        >
          <a-select-option value="music_comments">音乐评论</a-select-option>
          <a-select-option value="users">用户</a-select-option>
          <a-select-option value="announcements">公告</a-select-option>
        </a-select>

        <!-- 日期范围选择 -->
        <a-range-picker
          v-model:value="dateRange"
          @change="handleDateRangeChange"
          :placeholder="['开始日期', '结束日期']"
        />
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="logs"
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
          <a-tag :color="getActionColor(record.action)">
            {{ actionMap[record.action] }}
          </a-tag>
        </template>
        <template v-if="column.key === 'target'">
          {{ targetMap[record.target] || record.target }}
        </template>
        <template v-if="column.key === 'details'">
          <a-button type="link" @click="showDetails(record)">查看详情</a-button>
        </template>
      </template>
    </a-table>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      title="操作详情"
      placement="right"
      width="600"
    >
      <a-descriptions v-if="currentLog" bordered :column="1">
        <a-descriptions-item label="操作人">
          {{ currentLog.admin_username }}
        </a-descriptions-item>
        <a-descriptions-item label="操作类型">
          <a-tag :color="getActionColor(currentLog.action)">
            {{ actionMap[currentLog.action] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="操作对象">
          {{ targetMap[currentLog.target] || currentLog.target }}
        </a-descriptions-item>
        <a-descriptions-item label="对象ID">
          {{ currentLog.target_id }}
        </a-descriptions-item>
        <a-descriptions-item label="IP地址">
          {{ currentLog.ip }}
        </a-descriptions-item>
        <a-descriptions-item label="User Agent">
          <a-typography-paragraph 
            :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
          >
            {{ currentLog.user_agent }}
          </a-typography-paragraph>
        </a-descriptions-item>
        <a-descriptions-item label="操作时间">
          {{ dayjs(currentLog.created_at).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>
        <a-descriptions-item label="详细信息">
          <pre>{{ JSON.stringify(currentLog.details, null, 2) }}</pre>
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getLogs, type Log } from '@/api/log'
import dayjs from 'dayjs'

// 操作类型映射
const actionMap = {
  create: '创建',
  update: '更新',
  delete: '删除',
  batch_operation: '批量操作'
} as const

// 操作对象映射
const targetMap = {
  music_comments: '音乐评论',
  users: '用户',
  announcements: '公告'
} as const

// 操作类型颜色
const getActionColor = (action: string) => {
  const colorMap = {
    create: 'success',
    update: 'warning',
    delete: 'error',
    batch_operation: 'processing'
  }
  return colorMap[action as keyof typeof colorMap] || 'default'
}

const columns = [
  {
    title: '操作人',
    dataIndex: 'admin_username',
    key: 'admin_username',
    width: '12%'
  },
  {
    title: '操作类型',
    dataIndex: 'action',
    key: 'action',
    width: '10%'
  },
  {
    title: '操作对象',
    dataIndex: 'target',
    key: 'target',
    width: '12%'
  },
  {
    title: '对象ID',
    dataIndex: 'target_id',
    key: 'target_id',
    width: '10%'
  },
  {
    title: 'IP地址',
    dataIndex: 'ip',
    key: 'ip',
    width: '12%'
  },
  {
    title: '操作时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: '15%',
    customRender: ({ text }: { text: string }) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
  },
  {
    title: '详情',
    key: 'details',
    width: '10%'
  }
]

const queryParams = ref({
  page: 1,
  limit: 10,
  action: undefined as string | undefined,
  target: undefined as string | undefined,
  start_date: undefined as string | undefined,
  end_date: undefined as string | undefined
})

const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
const logs = ref<Log[]>([])
const total = ref(0)
const loading = ref(false)
const drawerVisible = ref(false)
const currentLog = ref<Log | null>(null)

// 获取日志列表
const fetchLogs = async () => {
  loading.value = true
  try {
    const params = { ...queryParams.value }
    const res = await getLogs(params)
    if (res.success) {
      logs.value = res.data.logs
      total.value = res.data.total
      queryParams.value.page = res.data.current
      queryParams.value.limit = res.data.pageSize
    }
  } catch (error) {
    message.error('获取日志列表失败')
  } finally {
    loading.value = false
  }
}

// 处理日期范围变化
const handleDateRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
  if (dates) {
    queryParams.value.start_date = dates[0].format('YYYY-MM-DD')
    queryParams.value.end_date = dates[1].format('YYYY-MM-DD')
  } else {
    queryParams.value.start_date = undefined
    queryParams.value.end_date = undefined
  }
  handleFilter()
}

// 处理筛选条件变化
const handleFilter = () => {
  queryParams.value.page = 1
  fetchLogs()
}

// 处理页码变化
const handlePageChange = (page: number, pageSize: number) => {
  queryParams.value.page = page
  queryParams.value.limit = pageSize
  fetchLogs()
}

// 显示详情
const showDetails = (log: Log) => {
  currentLog.value = log
  drawerVisible.value = true
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.logs {
  padding: 24px;
}

.operation-bar {
  margin-bottom: 16px;
}

.ant-space {
  display: flex;
  justify-content: flex-start;
  gap: 16px !important;
}

pre {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style> 