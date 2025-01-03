<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { wsService } from '@/utils/websocket'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

onMounted(() => {
  if (userStore.token) {
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