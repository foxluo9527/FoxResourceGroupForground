import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'

export interface TabItem {
  key: string
  title: string
  path: string
  closable: boolean
}

export const useTabStore = defineStore('tabs', () => {
  const activeTab = ref('Dashboard') // 默认激活仪表盘
  const tabs = ref<TabItem[]>([
    {
      key: 'Dashboard',
      title: '仪表盘',
      path: '/dashboard',
      closable: false
    }
  ])

  const addTab = (route: RouteLocationNormalized) => {
    const { path, meta, name } = route
    const key = name as string

    // 如果是仪表盘，不做任何处理
    if (key === 'Dashboard') {
      activeTab.value = key
      return
    }
    
    // 如果标签已存在，只激活它
    const existingTab = tabs.value.find(tab => tab.key === key)
    if (existingTab) {
      activeTab.value = key
      return
    }

    // 添加新标签
    tabs.value.push({
      key,
      title: meta.title as string,
      path,
      closable: true
    })
    activeTab.value = key
  }

  const removeTab = (targetKey: string) => {
    // 不允许关闭仪表盘
    if (targetKey === 'Dashboard') {
      return
    }

    const targetIndex = tabs.value.findIndex(tab => tab.key === targetKey)
    
    // 如果关闭的是当前激活的标签，需要激活其他标签
    if (targetKey === activeTab.value) {
      if (targetIndex === tabs.value.length - 1) {
        // 如果关闭的是最后一个，激活前一个
        activeTab.value = tabs.value[targetIndex - 1].key
      } else {
        // 否则激活下一个
        activeTab.value = tabs.value[targetIndex + 1].key
      }
    }

    tabs.value = tabs.value.filter(tab => tab.key !== targetKey)
  }

  // 根据路由名称获取标签
  const getTabByName = (name: string) => {
    return tabs.value.find(tab => tab.key === name)
  }

  return {
    tabs,
    activeTab,
    addTab,
    removeTab,
    getTabByName
  }
}) 