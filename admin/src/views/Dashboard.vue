<template>
  <div>
    <div class="page-header">
      <h2>数据看板</h2>
      <p>实时监控所有用户的状态和签到情况</p>
    </div>

    <el-alert
      v-if="activeSOS.length > 0"
      type="error"
      show-icon
      class="sos-alert"
    >
      <template #title>
        <div class="sos-alert">
          <div class="alert-text">
            <span class="alert-icon">🚨</span>
            <span>有 {{ activeSOS.length }} 个未处理的SOS呼救</span>
          </div>
          <el-button type="danger" @click="goToSOS">去处理</el-button>
        </div>
      </template>
    </el-alert>

    <el-row :gutter="16" class="stats-grid">
      <el-col :span="6">
        <div class="stats-card active">
          <div class="label">正常用户</div>
          <div class="value">{{ stats.activeUsers || 0 }}</div>
          <div class="trend">24小时内有签到</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stats-card warning">
          <div class="label">需注意</div>
          <div class="value">{{ stats.warningUsers || 0 }}</div>
          <div class="trend">超过24小时未签到</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stats-card timeout">
          <div class="label">已超时</div>
          <div class="value">{{ stats.timeoutUsers || 0 }}</div>
          <div class="trend">超过48小时未签到</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stats-card sos">
          <div class="label">SOS呼救</div>
          <div class="value">{{ stats.sosUsers || 0 }}</div>
          <div class="trend">待处理呼救</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 24px;">
      <el-col :span="12">
        <div class="card">
          <div class="card-title">今日概览</div>
          <el-row :gutter="16">
            <el-col :span="8" style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #67c23a;">
                {{ stats.todayCheckIns || 0 }}
              </div>
              <div style="font-size: 13px; color: #909399; margin-top: 4px;">今日已签到</div>
            </el-col>
            <el-col :span="8" style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #409eff;">
                {{ stats.totalUsers || 0 }}
              </div>
              <div style="font-size: 13px; color: #909399; margin-top: 4px;">总用户数</div>
            </el-col>
            <el-col :span="8" style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #f56c6c;">
                {{ stats.activeSOSCount || 0 }}
              </div>
              <div style="font-size: 13px; color: #909399; margin-top: 4px;">待处理SOS</div>
            </el-col>
          </el-row>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="card">
          <div class="card-title">状态分布</div>
          <div ref="chartRef" style="height: 200px;"></div>
        </div>
      </el-col>
    </el-row>

    <div class="card" style="margin-top: 24px;">
      <div class="card-title flex-between">
        <span>最近签到用户</span>
        <el-button type="primary" text @click="goToUsers">查看全部</el-button>
      </div>
      <el-table :data="recentUsers" v-loading="loading">
        <el-table-column label="用户" width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="user-avatar-small">
                {{ row.nickname ? row.nickname.charAt(0) : '用' }}
              </div>
              <div>
                <div style="font-weight: 500;">{{ row.nickname || '未命名' }}</div>
                <div style="font-size: 12px; color: #909399;">{{ row.phone || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="最后签到">
          <template #default="{ row }">
            {{ row.lastCheckIn ? formatTime(row.lastCheckIn) : '从未签到' }}
          </template>
        </el-table-column>
        <el-table-column label="连续签到" width="120" align="center">
          <template #default="{ row }">
            {{ row.checkInStreak || 0 }} 天
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <span class="status-tag status-{{ getComputedStatus(row) }}">
              {{ getStatusText(getComputedStatus(row)) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" text @click="viewUser(row._id)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import request from '../utils/request'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const stats = reactive({})
const activeSOS = ref([])
const recentUsers = ref([])
const chartRef = ref(null)
let chart = null

const loadData = async () => {
  try {
    loading.value = true
    
    const [dashboardResult, usersResult, sosResult] = await Promise.all([
      request.get('/admin/dashboard'),
      request.get('/admin/users?limit=10&sortBy=lastCheckIn'),
      request.get('/sos/active')
    ])
    
    Object.assign(stats, dashboardResult.stats || {})
    recentUsers.value = usersResult.users || []
    activeSOS.value = sosResult.activeSOS || []
    
    await nextTick()
    renderChart()
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  
  if (chart) {
    chart.dispose()
  }
  
  chart = echarts.init(chartRef.value)
  
  const data = [
    { value: stats.activeUsers || 0, name: '正常', itemStyle: { color: '#67c23a' } },
    { value: stats.warningUsers || 0, name: '注意', itemStyle: { color: '#e6a23c' } },
    { value: stats.timeoutUsers || 0, name: '超时', itemStyle: { color: '#f56c6c' } },
    { value: stats.sosUsers || 0, name: 'SOS', itemStyle: { color: '#dc2626' } }
  ]
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center'
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: false
          }
        },
        data: data.filter(item => item.value > 0)
      }
    ]
  }
  
  chart.setOption(option)
}

const getComputedStatus = (user) => {
  if (user.computedStatus) return user.computedStatus
  if (user.status === 'sos') return 'sos'
  
  if (!user.lastCheckIn) return 'never'
  
  const hours = (Date.now() - new Date(user.lastCheckIn).getTime()) / 3600000
  if (hours >= 48) return 'timeout'
  if (hours >= 24) return 'warning'
  return 'active'
}

const getStatusText = (status) => {
  const map = {
    active: '正常',
    warning: '注意',
    timeout: '超时',
    sos: 'SOS',
    never: '待签到'
  }
  return map[status] || '未知'
}

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const viewUser = (id) => {
  router.push(`/users/${id}`)
}

const goToUsers = () => {
  router.push('/users')
}

const goToSOS = () => {
  router.push('/sos')
}

onMounted(() => {
  loadData()
})

window.addEventListener('resize', () => {
  chart?.resize()
})
</script>

<style scoped>
.stats-grid {
  margin-bottom: 24px;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sos-alert {
  margin-bottom: 24px;
}
</style>
