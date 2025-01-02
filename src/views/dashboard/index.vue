<template>
  <div class="dashboard">
    <a-row :gutter="24">
      <a-col :span="6">
        <a-card>
          <template #title>总用户数</template>
          <h2>1,234</h2>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <template #title>音乐数量</template>
          <h2>5,678</h2>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <template #title>视频数量</template>
          <h2>912</h2>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <template #title>小说数量</template>
          <h2>345</h2>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="最近一周访问量">
          <!-- 这里可以放图表组件 -->
          <div style="height: 300px; display: flex; align-items: center; justify-content: center">
            图表区域
          </div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="系统通知">
          <a-list :data-source="notifications" :pagination="false">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :title="item.title">
                  <template #description>
                    {{ item.time }}
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const notifications = ref([
  {
    title: '系统更新通知',
    time: '2024-01-02 10:00'
  },
  {
    title: '新功能发布',
    time: '2024-01-01 14:30'
  },
  {
    title: '维护通知',
    time: '2024-01-01 09:00'
  }
])
</script>

<style scoped>
.dashboard {
  padding: 24px;
}

.ant-card {
  margin-bottom: 24px;
}

h2 {
  margin: 0;
  color: #1890ff;
}
</style> 