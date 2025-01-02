<template>
  <div class="music-management">
    <a-button type="primary" @click="showCreateModal">添加音乐</a-button>
    <a-table :columns="columns" :data-source="musicList" row-key="id" style="margin-top: 16px">
      <template #actions="{ record }">
        <a-space>
          <a-button type="link" @click="editMusic(record)">编辑</a-button>
          <a-button type="link" @click="deleteMusic(record.id)">删除</a-button>
        </a-space>
      </template>
    </a-table>

    <a-modal v-model:visible="isModalVisible" title="添加音乐" @ok="handleOk" @cancel="handleCancel">
      <a-form :model="form" :rules="rules" ref="formRef">
        <a-form-item label="标题" name="title">
          <a-input v-model:value="form.title" />
        </a-form-item>
        <a-form-item label="艺术家" name="artist">
          <a-input v-model:value="form.artist" />
        </a-form-item>
        <a-form-item label="专辑" name="album">
          <a-input v-model:value="form.album" />
        </a-form-item>
        <a-form-item label="时长" name="duration">
          <a-input-number v-model:value="form.duration" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'

const musicList = ref([
  { id: 1, title: 'Song 1', artist: 'Artist 1', album: 'Album 1', duration: 180 },
  { id: 2, title: 'Song 2', artist: 'Artist 2', album: 'Album 2', duration: 200 }
])

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title' },
  { title: '艺术家', dataIndex: 'artist', key: 'artist' },
  { title: '专辑', dataIndex: 'album', key: 'album' },
  { title: '时长', dataIndex: 'duration', key: 'duration' },
  { title: '操作', key: 'actions', scopedSlots: { customRender: 'actions' } }
]

const isModalVisible = ref(false)
const form = reactive({
  title: '',
  artist: '',
  album: '',
  duration: 0
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  artist: [{ required: true, message: '请输入艺术家', trigger: 'blur' }],
  album: [{ required: true, message: '请输入专辑', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入时长', trigger: 'blur' }]
}

const formRef = ref()

const showCreateModal = () => {
  isModalVisible.value = true
}

const handleOk = () => {
  formRef.value.validate().then(() => {
    musicList.value.push({ ...form, id: Date.now() })
    message.success('音乐添加成功')
    isModalVisible.value = false
  }).catch(() => {
    message.error('请填写完整信息')
  })
}

const handleCancel = () => {
  isModalVisible.value = false
}

const editMusic = (record) => {
  // 编辑音乐逻辑
  console.log('编辑音乐', record)
}

const deleteMusic = (id) => {
  musicList.value = musicList.value.filter(music => music.id !== id)
  message.success('音乐删除成功')
}
</script>

<style scoped>
.music-management {
  padding: 24px;
}
</style> 