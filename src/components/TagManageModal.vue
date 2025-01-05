<template>
  <a-modal
    :visible="visible"
    title="标签管理"
    @cancel="handleCancel"
    @ok="handleOk"
    width="800px"
  >
    <div class="tag-manage">
      <div class="tag-form">
        <a-form layout="inline">
          <a-form-item label="标签名称">
            <a-input v-model:value="newTag.name" placeholder="输入标签名称" />
          </a-form-item>
          <a-form-item label="描述">
            <a-input v-model:value="newTag.description" placeholder="输入标签描述" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="handleAddTag">
              <plus-outlined />添加标签
            </a-button>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="columns"
        :data-source="tags"
        :pagination="false"
        :loading="loading"
        row-key="id"
      >
        <template #action="{ record }">
          <a-space>
            <a-popconfirm
              title="确定要删除这个标签吗？"
              @confirm="() => handleDeleteTag(record)"
            >
              <a class="danger">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { service } from '@/utils/request'
import type { Tag } from '@/types/tag'

const props = defineProps<{
  visible: boolean
  type: string
}>()

const emit = defineEmits(['update:visible', 'refresh'])

const loading = ref(false)
const tags = ref<Tag[]>([])
const newTag = ref({
  name: '',
  description: '',
  type: props.type
})

const columns = [
  {
    title: '标签名称',
    dataIndex: 'name'
  },
  {
    title: '描述',
    dataIndex: 'description'
  },
  {
    title: '使用次数',
    dataIndex: 'count'
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    slots: { customRender: 'action' }
  }
]

const fetchTags = async () => {
  loading.value = true
  try {
    const response = await service.get('/api/admin/tags', {
      params: {
        type: props.type,
        page: 1,
        limit: 100
      }
    })
    if (response.success) {
      tags.value = response.data.list
    }
  } catch (error) {
    console.error('获取标签失败:', error)
    message.error('获取标签失败')
  } finally {
    loading.value = false
  }
}

const handleAddTag = async () => {
  if (!newTag.value.name) {
    message.warning('请输入标签名称')
    return
  }

  try {
    const response = await service.post('/api/admin/tags', newTag.value)
    if (response.success) {
      message.success('添加标签成功')
      newTag.value.name = ''
      newTag.value.description = ''
      await fetchTags()
      emit('refresh')
    }
  } catch (error) {
    console.error('添加标签失败:', error)
    message.error('添加标签失败')
  }
}

const handleDeleteTag = async (tag: Tag) => {
  try {
    const response = await service.delete(`/api/admin/tags/${tag.id}`)
    if (response.success) {
      message.success('删除标签成功')
      await fetchTags()
      emit('refresh')
    }
  } catch (error) {
    console.error('删除标签失败:', error)
    message.error('删除标签失败')
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}

const handleOk = () => {
  emit('update:visible', false)
}

// 初始加载标签
fetchTags()
</script>

<style scoped>
.tag-manage {
  .tag-form {
    margin-bottom: 16px;
  }
}

.danger {
  color: #ff4d4f;
}
</style> 