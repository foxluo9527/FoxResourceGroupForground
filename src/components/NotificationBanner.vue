<template>
  <a-alert
    v-if="currentNotification"
    class="notification-banner"
    :message="currentNotification.title"
    :description="currentNotification.content"
    banner
    closable
    @close="handleClose"
  >
    <template #icon>
      <notification-outlined />
    </template>
  </a-alert>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NotificationOutlined } from '@ant-design/icons-vue'

interface Notification {
  id: number
  title: string
  content: string
}

const currentNotification = ref<Notification | null>(null)

// 更新通知内容
const updateNotification = (notification: Notification) => {
  currentNotification.value = notification
}

// 关闭通知
const handleClose = () => {
  currentNotification.value = null
}

// 暴露方法给父组件
defineExpose({
  updateNotification
})
</script>

<style scoped>
.notification-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}
</style> 