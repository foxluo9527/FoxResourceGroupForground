<template>
  <div class="grant-admin">
    <a-card title="授权新管理员">
      <a-form
        :model="formState"
        :rules="rules"
        ref="formRef"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="formState.username" placeholder="请输入用户名" />
        </a-form-item>

        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="formState.password" placeholder="请输入密码" @change="checkPasswordStrength" />
          <div class="password-strength" v-if="formState.password">
            <span>密码强度：</span>
            <a-progress :percent="passwordStrength" :status="passwordStrengthStatus" />
          </div>
        </a-form-item>

        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="formState.confirmPassword" placeholder="请再次输入密码" />
        </a-form-item>

        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formState.email" placeholder="请输入邮箱" />
        </a-form-item>

        <a-form-item label="手机号" name="phone">
          <a-input v-model:value="formState.phone" placeholder="请输入手机号" />
        </a-form-item>

        <a-form-item :wrapper-col="{ offset: 4, span: 16 }">
          <a-button type="primary" @click="handleSubmit">授权管理员</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { grantAdmin } from '@/api/auth'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

// 检查是否为超级管理员
if (userStore.role !== 'superadmin') {
  message.error('只有超级管理员可以授权新管理员')
}

const formRef = ref<FormInstance>()
const formState = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  phone: '',
  role: 'admin' as const
})

// 密码强度相关
const passwordStrength = ref(0)
const passwordStrengthStatus = computed(() => {
  if (passwordStrength.value < 40) return 'exception'
  if (passwordStrength.value < 70) return 'normal'
  return 'success'
})

// 检查密码强度
const checkPasswordStrength = () => {
  const password = formState.password
  let strength = 0

  // 长度检查
  if (password.length >= 8) strength += 20
  if (password.length >= 12) strength += 10

  // 包含数字
  if (/\d/.test(password)) strength += 10
  // 包含小写字母
  if (/[a-z]/.test(password)) strength += 10
  // 包含大写字母
  if (/[A-Z]/.test(password)) strength += 10
  // 包含特殊字符
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 20
  // 包含多种字符组合
  if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) strength += 20

  passwordStrength.value = Math.min(strength, 100)
}

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度必须在 3-20 个字符之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能小于 8 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string) => {
        if (value !== formState.password) {
          return Promise.reject('两次输入的密码不一致')
        }
        return Promise.resolve()
      },
      trigger: 'change'
    }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message: '请输入有效的邮箱地址',
      trigger: 'blur'
    }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号格式',
      trigger: 'blur'
    }
  ]
}

const handleSubmit = () => {
  formRef.value?.validate().then(async () => {
    try {
      // 提交前删除确认密码字段
      const submitData = {
        username: formState.username,
        password: formState.password,
        email: formState.email,
        phone: formState.phone,
        role: formState.role
      }
      const res = await grantAdmin(submitData)
      if (res.success) {
        message.success(res.message)
        formRef.value?.resetFields()
        passwordStrength.value = 0
      }
    } catch (error) {
      message.error('授权失败')
    }
  })
}
</script>

<style scoped>
.grant-admin {
  padding: 24px;
}

.password-strength {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ant-progress {
  flex: 1;
}
</style> 