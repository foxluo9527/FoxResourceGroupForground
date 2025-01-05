<template>
  <div class="tags-manage">
    <a-card>
      <template #title>
        <a-space>
          <a-select
            v-model:value="currentType"
            style="width: 120px"
            @change="handleTypeChange"
          >
            <a-select-option value="music">音乐标签</a-select-option>
            <a-select-option value="video">视频标签</a-select-option>
            <a-select-option value="novel">小说标签</a-select-option>
            <a-select-option value="post">帖子标签</a-select-option>
          </a-select>
          <a-button type="primary" @click="handleAdd">
            <plus-outlined />添加标签
          </a-button>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="tags"
        :loading="loading"
        :pagination="{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100']
        }"
        @change="handleTableChange"
        row-key="id"
      >
        <template #action="{ record }">
          <a-space>
            <a @click="handleEdit(record)">编辑</a>
            <a-divider type="vertical" />
            <a-popconfirm
              title="确定要删除这个标签吗？"
              @confirm="() => handleDelete(record)"
            >
              <a class="danger">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 添加/编辑标签对话框 -->
    <a-modal
      :visible="modalVisible"
      :title="editingTag ? '编辑标签' : '添加标签'"
      @cancel="handleCancel"
      @ok="handleSave"
    >
      <a-form :model="formState" layout="vertical">
        <a-form-item label="标签名称" required>
          <a-input v-model:value="formState.name" placeholder="请输入标签名称" />
        </a-form-item>
        <a-form-item label="分类">
          <a-select v-model:value="formState.category">
            <a-select-option value="genre">类型</a-select-option>
            <a-select-option value="mood">心情</a-select-option>
            <a-select-option value="scene">场景</a-select-option>
            <a-select-option value="style">风格</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="formState.description" placeholder="请输入标签描述" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import { service } from '@/utils/request'
import type { Tag } from '@/types/tag'
import { useRoute, useRouter } from 'vue-router'

const columns = [
  {
    title: '标签名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category'
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description'
  },
  {
    title: '使用次数',
    dataIndex: 'count',
    key: 'count'
  },
  {
    title: '排序',
    dataIndex: 'order_num',
    key: 'order_num'
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    slots: { customRender: 'action' }
  }
]

const currentType = ref('music')
const loading = ref(false)
const tags = ref<Tag[]>([])
const pagination = ref<TablePaginationConfig>({
  total: 0,
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  pageSizeOptions: ['10', '20', '50', '100']
})
const modalVisible = ref(false)
const editingTag = ref<Tag | null>(null)
const formState = reactive({
  name: '',
  type: '',
  category: 'genre',
  description: ''
})

const route = useRoute()
const router = useRouter()
const queryParams = ref({
  type: '',
  keyword: ''
})

// 监听路由参数变化
watch(
  () => route.query,
  (query) => {
    if (query.type) {
      const type = query.type as string
      // 确保类型有效
      const validTypes = ['music', 'video', 'novel', 'post']
      if (validTypes.includes(type)) {
        currentType.value = type
        // 延迟执行 fetchTags，确保组件完全挂载
        nextTick(() => {
          fetchTags()
        })
      }
    }
  },
  { immediate: true }
)

// 监听类型变化
watch(currentType, (newType) => {
  // 更新路由参数但不触发路由变化
  router.replace({
    path: route.path,
    query: { 
      ...route.query,
      type: newType
    }
  })
  fetchTags()
})

const fetchTags = async () => {
  loading.value = true
  try {
    const response = await service.get('/api/admin/tags', {
      params: {
        type: currentType.value,
        page: pagination.value.current,
        limit: pagination.value.pageSize
      }
    })
    if (response.success) {
      tags.value = response.data.list
      pagination.value = {
        ...pagination.value,
        total: response.data.total,
        current: response.data.current,
        pageSize: response.data.pageSize
      }
    }
  } catch (error) {
    console.error('获取标签失败:', error)
    message.error('获取标签失败')
  } finally {
    loading.value = false
  }
}

const handleTypeChange = () => {
  pagination.value.current = 1
  fetchTags()
}

const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.value.current = pag.current || 1
  pagination.value.pageSize = pag.pageSize || 10
  fetchTags()
}

const resetForm = () => {
  formState.name = ''
  formState.type = ''
  formState.category = 'genre'
  formState.description = ''
  editingTag.value = null
}

const handleAdd = () => {
  resetForm()
  formState.type = currentType.value
  modalVisible.value = true
}

const handleEdit = (record: Tag) => {
  editingTag.value = record
  formState.name = record.name
  formState.type = record.type
  formState.category = record.category
  formState.description = record.description || ''
  modalVisible.value = true
}

const handleSave = async () => {
  if (!formState.name) {
    message.warning('请输入标签名称')
    return
  }

  try {
    const data = {
      name: formState.name,
      type: currentType.value,
      category: formState.category,
      description: formState.description
    }

    if (editingTag.value) {
      const response = await service.put(`/api/admin/tags/${editingTag.value.id}`, data)
      if (response.success) {
        message.success('更新标签成功')
        modalVisible.value = false
        fetchTags()
      } else {
        message.error(response.message || '更新失败')
      }
    } else {
      const response = await service.post('/api/admin/tags', data)
      if (response.success) {
        message.success('添加标签成功')
        modalVisible.value = false
        fetchTags()
      } else {
        message.error(response.message || '添加失败')
      }
    }
  } catch (error: any) {
    console.error('保存标签失败:', error)
    message.error(error.message || '保存失败')
  }
}

const handleDelete = async (record: Tag) => {
  try {
    const response = await service.delete(`/api/admin/tags/${record.id}`)
    if (response.success) {
      message.success('删除标签成功')
      if (tags.value.length === 1 && pagination.value.current > 1) {
        pagination.value.current--
      }
      fetchTags()
    } else {
      message.error(response.message || '删除失败')
    }
  } catch (error: any) {
    console.error('删除标签失败:', error)
    message.error(error.message || '删除失败')
  }
}

const handleCancel = () => {
  modalVisible.value = false
}

fetchTags()
</script>

<style scoped>
.tags-manage {
  padding: 24px;
}

.danger {
  color: #ff4d4f;
}
</style> 