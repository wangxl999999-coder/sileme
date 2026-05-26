<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-icon">📱</div>
      <h1 class="login-title">死了么</h1>
      <p class="login-subtitle">管理后台 · 每日签到报平安</p>
      
      <div class="form-item">
        <input
          class="form-input"
          v-model="phone"
          type="text"
          placeholder="请输入手机号"
          maxlength="11"
          autocomplete="off"
        />
      </div>
      
      <div class="form-item">
        <input
          class="form-input"
          v-model="password"
          type="password"
          placeholder="请输入密码"
          autocomplete="new-password"
          @keyup.enter="handleLogin"
        />
      </div>
      
      <button 
        class="login-btn" 
        :disabled="loading"
        @click="handleLogin"
      >
        {{ loading ? '登录中...' : '登录' }}
      </button>
      
      <div class="login-tips">
        <p>管理员: 13800138000 / 123456</p>
        <p>普通用户: 13900139000 / 123456</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const phone = ref('')
const password = ref('')

const handleLogin = async () => {
  if (!phone.value.trim()) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!password.value) {
    ElMessage.warning('请输入密码')
    return
  }
  
  try {
    loading.value = true
    await userStore.login(phone.value.trim(), password.value)
    
    ElMessage.success('登录成功')
    
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (error) {
    console.error('登录失败:', error)
    const msg = error.response?.data?.message || error.message || '登录失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-icon {
  font-size: 64px;
  text-align: center;
  margin-bottom: 16px;
}

.login-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #303133;
}

.login-subtitle {
  text-align: center;
  color: #909399;
  margin-bottom: 32px;
  font-size: 14px;
}

.form-item {
  margin-bottom: 20px;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 16px;
  color: #303133;
  box-sizing: border-box;
  transition: border-color 0.2s;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.form-input::placeholder {
  color: #c0c4cc;
}

.form-input:focus {
  border-color: #667eea;
}

.login-btn {
  width: 100%;
  height: 48px;
  line-height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-tips {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: #909399;
}

.login-tips p {
  margin: 4px 0;
}
</style>
