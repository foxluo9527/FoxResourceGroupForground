<template>
  <a-layout class="layout">
    <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible>
      <div class="logo">
        <span v-show="!collapsed">Fox Admin</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        theme="dark"
        mode="inline"
      >
        <a-menu-item key="dashboard">
          <router-link to="/dashboard">
            <dashboard-outlined />
            <span>仪表盘</span>
          </router-link>
        </a-menu-item>
        <a-sub-menu key="resource">
          <template #title>
            <span>
              <folder-outlined />
              <span>资源管理</span>
            </span>
          </template>
          <a-menu-item key="music">
            <router-link to="/music">
              <customer-service-outlined />
              <span>音乐管理</span>
            </router-link>
          </a-menu-item>
          <a-menu-item key="video">
            <router-link to="/video">视频管理</router-link>
          </a-menu-item>
          <a-menu-item key="novel">
            <router-link to="/novel">小说管理</router-link>
          </a-menu-item>
          <a-menu-item key="post">
            <router-link to="/post">帖子管理</router-link>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="user">
          <template #title>
            <span>
              <user-outlined />
              <span>用户管理</span>
            </span>
          </template>
          <a-menu-item key="user-list">
            <router-link to="/users">用户列表</router-link>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="system">
          <template #title>
            <span>
              <setting-outlined />
              <span>系统管理</span>
            </span>
          </template>
          <a-menu-item key="announcement">
            <router-link to="/announcements">公告管理</router-link>
          </a-menu-item>
          <a-menu-item key="config">
            <router-link to="/configs">系统配置</router-link>
          </a-menu-item>
          <a-menu-item key="grant-admin" v-if="userStore.role === 'superadmin'">
            <router-link to="/grant-admin">
              <user-add-outlined />
              <span>授权管理员</span>
            </router-link>
          </a-menu-item>
        </a-sub-menu>
      </a-menu>
    </a-layout-sider>
    
    <a-layout>
      <a-layout-header style="background: #fff; padding: 0">
        <menu-unfold-outlined
          v-if="collapsed"
          class="trigger"
          @click="() => (collapsed = !collapsed)"
        />
        <menu-fold-outlined
          v-else
          class="trigger"
          @click="() => (collapsed = !collapsed)"
        />
        <div class="header-right">
          <a-dropdown>
            <a class="ant-dropdown-link" @click.prevent>
              <a-avatar :size="32" icon="user" />
              <span>{{ userStore.username }} ({{ userStore.roleLabel }})</span>
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile">
                  <user-outlined />个人信息
                </a-menu-item>
                <a-menu-item key="logout" @click="handleLogout">
                  <logout-outlined />退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>
      
      <a-layout-content style="margin: 24px 16px; padding: 24px; background: #fff">
        <router-view></router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  FolderOutlined,
  SettingOutlined,
  LogoutOutlined,
  DashboardOutlined,
  CustomerServiceOutlined,
  MusicOutlined,
  UserAddOutlined
} from '@ant-design/icons-vue'

const collapsed = ref<boolean>(false)
const selectedKeys = ref<string[]>(['dashboard'])
const openKeys = ref<string[]>(['resource'])

const router = useRouter()
const userStore = useUserStore()
const route = useRoute()

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}

watch(
  () => route.path,
  (path) => {
    selectedKeys.value = [path.split('/')[1] || 'dashboard']
    if (path.includes('music') || path.includes('video') || path.includes('novel') || path.includes('post')) {
      openKeys.value = ['resource']
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.layout {
  min-height: 100vh;
}

.logo {
  height: 32px;
  margin: 16px;
  display: flex;
  align-items: center;
  color: white;
}

.logo img {
  height: 32px;
  margin-right: 8px;
}

.trigger {
  font-size: 18px;
  line-height: 64px;
  padding: 0 24px;
  cursor: pointer;
  transition: color 0.3s;
}

.trigger:hover {
  color: #1890ff;
}

.header-right {
  float: right;
  margin-right: 24px;
}

.ant-dropdown-link {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style> 