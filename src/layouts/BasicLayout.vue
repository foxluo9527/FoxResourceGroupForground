<template>
  <a-layout class="layout">
    <notification-banner ref="notificationBannerRef" />
    <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible>
      <div class="logo">
        <span v-show="!collapsed">Fox Admin</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        mode="inline"
        theme="dark"
      >
        <template v-for="item in menuConfig" :key="item.key">
          <template v-if="item.children">
            <a-sub-menu :key="item.key">
              <template #title>
                <component :is="item.icon" />
                <span>{{ item.title }}</span>
              </template>
              <a-menu-item v-for="child in item.children" :key="child.key">
                <router-link :to="child.path">{{ child.title }}</router-link>
              </a-menu-item>
            </a-sub-menu>
          </template>
          <template v-else>
            <a-menu-item :key="item.key">
              <router-link :to="item.path">
                <component :is="item.icon" />
                <span>{{ item.title }}</span>
              </router-link>
            </a-menu-item>
          </template>
        </template>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
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
            <div class="user-dropdown">
              <a-avatar :src="userInfo?.avatar">
                {{ userInfo?.nickname?.[0]?.toUpperCase() || userInfo?.username?.[0]?.toUpperCase() }}
              </a-avatar>
              <span class="username">{{ userInfo?.nickname || userInfo?.username }}</span>
            </div>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile" @click="goToProfile">
                  <user-outlined />
                  <span>个人主页</span>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">
                  <logout-outlined />
                  <span>退出登录</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <a-tabs
          v-model:activeKey="tabStore.activeTab"
          type="editable-card"
          hide-add
          @edit="onTabEdit"
          @change="handleTabChange"
          class="main-tabs"
        >
          <a-tab-pane
            v-for="tab in tabStore.tabs"
            :key="tab.key"
            :tab="tab.title"
            :closable="tab.closable"
          >
            <keep-alive>
              <component 
                :is="tab.key === tabStore.activeTab ? 'router-view' : null"
                :key="tab.path"
              />
            </keep-alive>
          </a-tab-pane>
        </a-tabs>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons-vue'
import { menuConfig } from '@/config/menu'
import NotificationBanner from '@/components/NotificationBanner.vue'
import { wsService } from '@/utils/websocket'
import { useTabStore } from '@/store/tabs'
import { service } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const collapsed = ref(false)
const selectedKeys = ref<string[]>([])
const openKeys = ref<string[]>([])
const notificationBannerRef = ref()
const tabStore = useTabStore()
const userInfo = ref(null)

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}

// 根据当前路由更新选中的菜单项
watch(
  () => route.path,
  (path) => {
    // 找到当前路由对应的菜单项
    for (const item of menuConfig) {
      if (item.children) {
        const child = item.children.find(child => path.startsWith(child.path))
        if (child) {
          selectedKeys.value = [child.key]
          openKeys.value = [item.key]
          break
        }
      } else if (path === item.path) {
        selectedKeys.value = [item.key]
        break
      }
    }
  },
  { immediate: true }
)

// 监听路由变化，添加标签页
watch(
  () => route.path,
  (path) => {
    if (route.name && route.name !== 'Login') {
      // 确保标签存在并且激活它
      const tab = tabStore.getTabByName(route.name as string)
      if (tab) {
        tabStore.activeTab = tab.key
      } else {
        tabStore.addTab(route)
      }
    }
  },
  { immediate: true }
)

// 处理标签页的编辑（关闭）
const onTabEdit = (targetKey: string, action: 'add' | 'remove') => {
  if (action === 'remove') {
    tabStore.removeTab(targetKey)
    // 跳转到当前激活的标签页
    const activeTab = tabStore.tabs.find(tab => tab.key === tabStore.activeTab)
    if (activeTab && activeTab.path !== route.path) {
      router.push(activeTab.path)
    }
  }
}

// 监听标签切换
const handleTabChange = (key: string) => {
  const tab = tabStore.tabs.find(tab => tab.key === key)
  if (tab && tab.path !== route.path) {
    router.push(tab.path)
  }
}

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const response = await service.get('/api/auth/profile')
    if (response.success) {
      userInfo.value = response.data
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// 跳转到个人主页
const goToProfile = () => {
  router.push('/profile')
}

onMounted(() => {
  if (notificationBannerRef.value) {
    wsService.setNotificationBanner(notificationBannerRef.value)
  }
  fetchUserInfo()
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
}

.logo {
  height: 32px;
  margin: 16px;
  color: white;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header {
  background: #fff;
  padding: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trigger {
  padding: 0 24px;
  font-size: 18px;
  line-height: 64px;
  cursor: pointer;
  transition: color 0.3s;
}

.trigger:hover {
  color: #1890ff;
}

.header-right {
  margin-right: 24px;
}

.ant-dropdown-link {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.content {
  margin: 0;
  padding: 0;
  background: #fff;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

:deep(.main-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.ant-tabs-nav) {
  margin: 0;
  padding: 6px 16px 0;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.ant-tabs-content) {
  flex: 1;
  height: 0;
}

:deep(.ant-tabs-content-holder) {
  padding: 16px;
  height: 100%;
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0 12px;
}

.username {
  margin-left: 8px;
  color: rgba(0, 0, 0, 0.85);
}

:deep(.ant-dropdown-trigger) {
  display: flex;
  align-items: center;
}
</style> 