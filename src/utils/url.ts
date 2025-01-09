// 获取 API 基础 URL
export const getBaseUrl = () => {
  return `http://39.106.30.151:9000/`
}

// 获取资源 URL
export const getResourceUrl = () => {
  return `http://39.106.30.151:9000/`
}

// 获取完整的资源 URL
export const getFullUrl = (path: string | any) => {
  // 如果 path 不是字符串，直接返回
  if (typeof path !== 'string') {
    console.warn('Invalid path type:', path)
    return ''
  }
  
  if (!path) return ''
  
  // 已经是完整 URL 的情况
  if (path.startsWith('http')) return path
  
  // 处理本地资源路径
  if (path.startsWith('/src/')) {
    return path.replace('/src/', '/')
  }
  
  // 处理上传文件路径
  if (path.startsWith('/uploads/')) {
    return `${getResourceUrl()}${path}`
  }
  
  // 处理其他路径
  if (path.startsWith('/')) {
    return `${getResourceUrl()}${path}`
  }
  
  return path
}

// 获取 WebSocket 基础 URL
export const getWsBaseUrl = () => {
  return `ws://39.106.30.151:9000/ws`
} 