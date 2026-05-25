<template>
  <div>
    <div class="page-header">
      <h2>用户详情</h2>
      <p>查看用户的详细信息和签到记录</p>
    </div>

    <div v-if="user" class="card" style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; gap: 24px; align-items: center;">
          <div class="user-avatar-small" style="width: 80px; height: 80px; font-size: 32px;">
            {{ user.nickname ? user.nickname.charAt(0) : '用' }}
          </div>
          <div>
            <div style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">
              {{ user.nickname || '未命名' }}
              <span class="status-tag status-{{ user.computedStatus }}" style="margin-left: 12px;">
                {{ getStatusText(user.computedStatus) }}
              </span>
            </div>
            <div style="color: #909399; margin-bottom: 4px;">
              {{ user.phone || '未绑定手机号' }}
            </div>
            <div style="font-size: 13px; color: #c0c4cc;">
              注册时间: {{ formatTime(user.createdAt) }}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 12px;">
          <el-button type="primary" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-button type="success" @click="manualCheckIn">
            <el-icon><Check /></el-icon>
            手动补签
          </el-button>
          <el-button @click="manageContacts">
            <el-icon><UserFilled /></el-icon>
            管理联系人
          </el-button>
        </div>
      </div>

      <el-divider />

      <el-row :gutter="24">
        <el-col :span="6">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #67c23a;">
              {{ user.checkInStreak || 0 }}
            </div>
            <div style="font-size: 13px; color: #909399; margin-top: 4px;">连续签到天数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #409eff;">
              {{ checkInStats.checkInCount || 0 }}
            </div>
            <div style="font-size: 13px; color: #909399; margin-top: 4px;">本月签到</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #e6a23c;">
              {{ checkInStats.checkInRate || 0 }}%
            </div>
            <div style="font-size: 13px; color: #909399; margin-top: 4px;">签到率</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: 700;" :class="hoursSinceLastCheckIn < 24 ? 'text-success' : hoursSinceLastCheckIn < 48 ? 'text-warning' : 'text-danger'">
              {{ hoursSinceLastCheckIn !== null ? formatDuration(hoursSinceLastCheckIn) : '从未' }}
            </div>
            <div style="font-size: 13px; color: #909399; margin-top: 4px;">距上次签到</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="24">
      <el-col :span="12">
        <div class="card">
          <div class="card-title flex-between">
            <span>紧急联系人</span>
            <el-button type="primary" size="small" text @click="manageContacts">管理</el-button>
          </div>
          
          <div v-if="contacts.length > 0">
            <div v-for="contact in contacts" :key="contact._id" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #f0f0f0;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <div class="contact-avatar">{{ contact.name.charAt(0) }}</div>
                <div>
                  <div style="font-weight: 500;">
                    {{ contact.name }}
                    <span v-if="contact.priority > 1" class="priority-tag">优先×{{ contact.priority }}</span>
                  </div>
                  <div style="font-size: 13px; color: #909399;">{{ contact.phone }}</div>
                  <div style="font-size: 12px; color: #c0c4cc;">
                    {{ getRelationshipText(contact.relationship) }} · 
                    {{ contact.notifyMethods.sms ? '短信' : '' }}
                    {{ contact.notifyMethods.call ? ' 电话' : '' }}
                    {{ contact.notifyMethods.wechat ? ' 微信' : '' }}
                  </div>
                </div>
              </div>
              <el-tag :type="contact.enabled ? 'success' : 'info'" size="small">
                {{ contact.enabled ? '已启用' : '已停用' }}
              </el-tag>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">👥</div>
            <p>暂无紧急联系人</p>
          </div>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="card">
          <div class="card-title">签到日历</div>
          <div class="calendar-weekdays">
            <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
          </div>
          <div class="calendar-days">
            <div 
              v-for="(day, index) in calendarDays" 
              :key="index"
              class="calendar-day"
              :class="{ 
                checked: day.checkedIn, 
                today: day.today,
                empty: day.empty 
              }"
            >
              <span>{{ day.day }}</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="card" style="margin-top: 24px;">
      <div class="card-title">最近签到记录</div>
      <el-table :data="recentCheckIns" v-loading="loading">
        <el-table-column prop="checkInTime" label="签到时间" width="200">
          <template #default="{ row }">
            {{ formatTime(row.checkInTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="签到类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'warning'" size="small">
              {{ row.status === 'success' ? '手动签到' : '自动补签' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注">
          <template #default="{ row }">
            {{ row.note || '-' }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="card" style="margin-top: 24px;">
      <div class="card-title">最近SOS记录</div>
      <el-table :data="recentSOS" v-loading="loading">
        <el-table-column prop="triggerTime" label="触发时间" width="200">
          <template #default="{ row }">
            {{ formatTime(row.triggerTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.resolved ? 'success' : 'danger'" size="small">
              {{ row.resolved ? '已处理' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理时间" width="200">
          <template #default="{ row }">
            {{ row.resolvedTime ? formatTime(row.resolvedTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="通知联系人">
          <template #default="{ row }">
            <span v-if="row.notifiedContacts && row.notifiedContacts.length > 0">
              {{ row.notifiedContacts.filter(c => c.notified).length }}/{{ row.notifiedContacts.length }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userId = computed(() => route.params.id)

const loading = ref(false)
const user = ref(null)
const contacts = ref([])
const recentCheckIns = ref([])
const recentSOS = ref([])
const checkInStats = reactive({})
const calendarDays = ref([])
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const hoursSinceLastCheckIn = computed(() => {
  if (!user.value?.lastCheckIn) return null
  return (Date.now() - new Date(user.value.lastCheckIn).getTime()) / 3600000
})

const loadData = async () => {
  try {
    loading.value = true
    
    const result = await request.get(`/admin/users/${userId.value}`)
    
    user.value = result.user
    contacts.value = result.contacts || []
    recentCheckIns.value = result.recentCheckIns || []
    recentSOS.value = result.recentSOS || []
    
    calculateStats(result.recentCheckIns || [])
    buildCalendar(result.recentCheckIns || [])
    
    if (user.value) {
      let computedStatus = user.value.status
      if (computedStatus !== 'sos') {
        if (!user.value.lastCheckIn) {
          computedStatus = 'never'
        } else if (hoursSinceLastCheckIn.value >= 48) {
          computedStatus = 'timeout'
        } else if (hoursSinceLastCheckIn.value >= 24) {
          computedStatus = 'warning'
        } else {
          computedStatus = 'active'
        }
      }
      user.value.computedStatus = computedStatus
      
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      user.value.hasCheckedInToday = user.value.lastCheckIn && new Date(user.value.lastCheckIn) >= todayStart
    }
  } catch (error) {
    console.error('加载用户详情失败:', error)
  } finally {
    loading.value = false
  }
}

const calculateStats = (checkIns) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const thisMonthCheckIns = checkIns.filter(c => new Date(c.checkInTime) >= monthStart)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  
  const uniqueDays = new Set()
  thisMonthCheckIns.forEach(c => {
    const date = new Date(c.checkInTime)
    uniqueDays.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
  })

  checkInStats.checkInCount = uniqueDays.size
  checkInStats.checkInRate = ((uniqueDays.size / daysInMonth) * 100).toFixed(1)
}

const buildCalendar = (checkIns) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  
  const checkInMap = {}
  checkIns.forEach(c => {
    const date = new Date(c.checkInTime)
    checkInMap[`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`] = true
  })
  
  const days = []
  
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ empty: true })
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${month}-${day}`
    const isToday = day === now.getDate()
    const checkedIn = !!checkInMap[dateStr]
    
    days.push({
      day,
      today: isToday,
      checkedIn,
      empty: false
    })
  }
  
  calendarDays.value = days
}

const manualCheckIn = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要为用户「${user.value?.nickname || '未命名'}」进行手动补签吗？`,
      '手动补签',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await request.post(`/admin/users/${userId.value}/manage`, {
      action: 'resetCheckIn'
    })

    ElMessage.success('补签成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('补签失败:', error)
    }
  }
}

const manageContacts = () => {
  router.push(`/contacts/${userId.value}`)
}

const goBack = () => {
  router.back()
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

const getRelationshipText = (relationship) => {
  const map = {
    spouse: '配偶',
    child: '子女',
    parent: '父母',
    sibling: '兄弟姐妹',
    friend: '朋友',
    other: '其他'
  }
  return map[relationship] || '其他'
}

const formatDuration = (hours) => {
  if (hours < 1) return `${Math.floor(hours * 60)}分钟`
  if (hours < 24) return `${Math.floor(hours)}小时`
  const days = Math.floor(hours / 24)
  const remainingHours = Math.floor(hours % 24)
  return `${days}天${remainingHours > 0 ? remainingHours + '小时' : ''}`
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 13px;
  color: #909399;
  padding: 8px 0;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 13px;
  background: #f5f7fa;
}

.calendar-day.empty {
  background: transparent;
}

.calendar-day.today {
  border: 2px solid #ff6b6b;
  font-weight: 600;
}

.calendar-day.checked {
  background: #e6f7ea;
  color: #67c23a;
  font-weight: 600;
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.text-danger {
  color: #f56c6c;
}
</style>
