<template>
  <div>
    <div class="page-header">
      <h2>用户管理</h2>
      <p>查看和管理所有用户信息</p>
    </div>

    <div class="card">
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索昵称或手机号"
          style="width: 240px;"
          clearable
          @keyup.enter="loadData"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 160px;" clearable @change="loadData">
          <el-option label="正常" value="active" />
          <el-option label="注意" value="warning" />
          <el-option label="超时" value="timeout" />
          <el-option label="SOS" value="sos" />
        </el-select>

        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column label="用户" width="240">
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
        
        <el-table-column label="最后签到" width="180">
          <template #default="{ row }">
            {{ row.lastCheckIn ? formatTime(row.lastCheckIn) : '从未签到' }}
          </template>
        </el-table-column>

        <el-table-column label="距上次签到" width="160">
          <template #default="{ row }">
            <span v-if="row.hoursSinceLastCheckIn !== null" :class="getTimeClass(row.hoursSinceLastCheckIn)">
              {{ formatDuration(row.hoursSinceLastCheckIn) }}
            </span>
            <span v-else class="text-danger">从未</span>
          </template>
        </el-table-column>

        <el-table-column label="最后在线" width="180">
          <template #default="{ row }">
            {{ row.lastOnline ? formatTime(row.lastOnline) : '-' }}
          </template>
        </el-table-column>

        <el-table-column label="连续签到" width="120" align="center">
          <template #default="{ row }">
            {{ row.checkInStreak || 0 }} 天
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <span class="status-tag status-{{ row.computedStatus }}">
              {{ getStatusText(row.computedStatus) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="今日签到" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.hasCheckedInToday ? 'success' : 'danger'" size="small">
              {{ row.hasCheckedInToday ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" size="small" text @click="viewDetail(row._id)">
                详情
              </el-button>
              <el-button type="success" size="small" text @click="manualCheckIn(row)">
                补签
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import request from '../utils/request'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const statusFilter = ref('')

const loadData = async () => {
  try {
    loading.value = true
    
    const params = {
      limit: pageSize.value,
      skip: (page.value - 1) * pageSize.value
    }
    
    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    const result = await request.get('/admin/users', { params })
    
    users.value = result.users.map(user => {
      let computedStatus = user.computedStatus || 'active'
      let hoursSinceLastCheckIn = user.hoursSinceLastCheckIn
      
      if (hoursSinceLastCheckIn === null || hoursSinceLastCheckIn === undefined) {
        if (user.lastCheckIn) {
          hoursSinceLastCheckIn = (Date.now() - new Date(user.lastCheckIn).getTime()) / 3600000
        } else {
          hoursSinceLastCheckIn = null
        }
      }

      if (user.status !== 'sos') {
        if (hoursSinceLastCheckIn === null) {
          computedStatus = 'never'
        } else if (hoursSinceLastCheckIn >= 48) {
          computedStatus = 'timeout'
        } else if (hoursSinceLastCheckIn >= 24) {
          computedStatus = 'warning'
        } else {
          computedStatus = 'active'
        }
      }

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const hasCheckedInToday = user.lastCheckIn && new Date(user.lastCheckIn) >= todayStart

      return {
        ...user,
        hoursSinceLastCheckIn,
        computedStatus,
        hasCheckedInToday
      }
    })
    
    total.value = result.total || 0
  } catch (error) {
    console.error('加载用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

const viewDetail = (id) => {
  router.push(`/users/${id}`)
}

const manualCheckIn = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要为用户「${row.nickname || '未命名'}」进行手动补签吗？`,
      '手动补签',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await request.post(`/admin/users/${row._id}/manage`, {
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

const getTimeClass = (hours) => {
  if (hours < 24) return 'text-success'
  if (hours < 48) return 'text-warning'
  return 'text-danger'
}

const formatDuration = (hours) => {
  if (hours < 1) return `${Math.floor(hours * 60)}分钟`
  if (hours < 24) return `${Math.floor(hours)}小时`
  const days = Math.floor(hours / 24)
  const remainingHours = Math.floor(hours % 24)
  return `${days}天${remainingHours > 0 ? remainingHours + '小时' : ''}`
}

const formatTime = (time) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
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
