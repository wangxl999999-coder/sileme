<template>
  <div>
    <div class="page-header">
      <h2>通知记录</h2>
      <p>查看所有短信通知的发送记录</p>
    </div>

    <div class="card">
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索手机号或用户"
          style="width: 240px;"
          clearable
          @keyup.enter="loadData"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="typeFilter" placeholder="类型筛选" style="width: 160px;" clearable @change="loadData">
          <el-option label="超时提醒" value="inactivity" />
          <el-option label="SOS呼救" value="sos" />
          <el-option label="测试" value="test" />
        </el-select>

        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 160px;" clearable @change="loadData">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>

        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <el-table :data="notifications" v-loading="loading" stripe>
        <el-table-column label="用户" width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="user-avatar-small">
                {{ row.user?.nickname ? row.user.nickname.charAt(0) : '用' }}
              </div>
              <div>
                <div style="font-weight: 500;">{{ row.user?.nickname || '未知用户' }}</div>
                <div style="font-size: 12px; color: #909399;">{{ row.user?.phone || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="contactName" label="联系人" width="120" />
        <el-table-column prop="contactPhone" label="联系电话" width="140" />
        <el-table-column prop="type" label="通知类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="发送时间" width="200">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="message" label="短信内容" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="font-family: monospace; font-size: 12px;">{{ row.message }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === 'failed'"
              type="primary" 
              size="small" 
              text 
              @click="retrySend(row)"
            >
              重发
            </el-button>
            <el-button type="primary" size="small" text @click="viewUser(row.user?._id)">
              详情
            </el-button>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import request from '../utils/request'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const notifications = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const typeFilter = ref('')
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
    if (typeFilter.value) {
      params.type = typeFilter.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    const result = await request.get('/notifications', { params })
    
    notifications.value = result.notifications || []
    total.value = result.total || 0
  } catch (error) {
    console.error('加载通知记录失败:', error)
  } finally {
    loading.value = false
  }
}

const retrySend = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新发送通知给「${row.contactName} (${row.contactPhone})」吗？`,
      '重发确认',
      {
        confirmButtonText: '重发',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const result = await request.post(`/notifications/${row._id}/retry`)
    
    if (result.success) {
      ElMessage.success('重发成功')
    } else {
      ElMessage.error('重发失败: ' + (result.message || '未知错误'))
    }
    
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重发失败:', error)
    }
  }
}

const viewUser = (userId) => {
  if (userId) {
    router.push(`/users/${userId}`)
  }
}

const getTypeText = (type) => {
  const map = {
    inactivity: '超时提醒',
    sos: 'SOS呼救',
    test: '测试',
    checkin: '签到提醒'
  }
  return map[type] || type
}

const getTypeTagType = (type) => {
  const map = {
    inactivity: 'warning',
    sos: 'danger',
    test: 'info',
    checkin: 'primary'
  }
  return map[type] || 'info'
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
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
</style>
