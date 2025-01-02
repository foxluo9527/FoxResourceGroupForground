<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-title">
        <!-- 暂时注释掉 logo -->
        <!-- <img src="@/assets/logo.png" alt="Fox Admin" /> -->
        <h1>Fox Admin</h1>
      </div>
      <a-form
        :model="loginForm"
        @finish="handleSubmit"
        class="login-form"
      >
        <a-form-item
          name="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        >
          <a-input
            v-model:value="loginForm.username"
            size="large"
            placeholder="用户名"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="loginForm.password"
            size="large"
            placeholder="密码"
          >
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item>
          <a-checkbox
            v-model:checked="rememberMe"
          >
            记住我
          </a-checkbox>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            :loading="loading"
            block
          >
            登录
          </a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store/user'

interface LoginForm {
  username: string
  password: string
}

const router = useRouter()
const userStore = useUserStore()

const loginForm = reactive<LoginForm>({
  username: '',
  password: ''
})

const loading = ref(false)
const rememberMe = ref(false)

// 从localStorage获取保存的登录信息
const savedUsername = localStorage.getItem('remembered_username')
if (savedUsername) {
  loginForm.username = savedUsername
  rememberMe.value = true
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const success = await userStore.login(loginForm.username, loginForm.password)
    if (success) {
      // 如果选择记住我,保存用户名
      if (rememberMe.value) {
        localStorage.setItem('remembered_username', loginForm.username)
      } else {
        localStorage.removeItem('remembered_username')
      }
      router.push('/')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f0f2f5;
}

.login-box {
  width: 368px;
  padding: 32px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.login-title {
  text-align: center;
  margin-bottom: 40px;
}

.login-title img {
  height: 44px;
  margin-bottom: 16px;
}

.login-title h1 {
  font-weight: 600;
  font-size: 24px;
  color: rgba(0, 0, 0, 0.85);
  margin: 0;
}

.login-form {
  margin-top: 24px;
}
</style> 