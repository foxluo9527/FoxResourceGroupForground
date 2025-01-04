<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { wsService } from '@/utils/websocket'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

onMounted(() => {
  console.log('App mounted, token:', userStore.token)
  if (userStore.token) {
    console.log('正在连接 WebSocket...')
    wsService.connect()
  }
})

onUnmounted(() => {
  wsService.disconnect()
})
</script>

<template>
  <router-view />
</template>

<style>
#app {
  height: 100vh;
}
</style> 