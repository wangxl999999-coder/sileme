<template>
  <div>
    <div class="page-header">
      <h2>SOS记录</h2>
      <p>查看和处理所有SOS呼救记录</p>
    </div>

    <el-alert
      v-if="activeCount > 0"
      type="error"
      show-icon
      class="sos-alert"
    >
      <template #title>
        <div class="sos-alert">
          <div class="alert-text">
            <span class="alert-icon">🚨</span>
            <span>有 {{ activeCount }} 个未处理的SOS呼救</span>
          </div>
        </div>
      </template>
    </el-alert>

    <div class="card">
      <div class="filter-bar">
        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 160px;" clearable @change="loadData">
          <el-option label="待处理" value="active" />
          <el-option label="已处理" value="resolved" />
        </el-select>

        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <el-table :data="sosList" v-loading="loading" stripe>
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
        <el-table-column label="处理人" width="120">
          <template #default="{ row }">
            {{ row.resolvedBy?.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="通知联系人" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.notifiedContacts && row.notifiedContacts.length > 0">
              {{ row.notifiedContacts.filter(c => c.notified).length }}/{{ row.notifiedContacts.length }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="acknowledged" label="用户确认" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.acknowledged ? 'success' : 'warning'" size="small">
              {{ row.acknowledged ? '已确认' : '待确认' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" size="small" text @click="viewDetail(row.user?._id)">
                用户详情
              </el-button>
              <el-button 
                v-if="!row.resolved" 
                type="success" 
                size="small" 
                text 
                @click="resolveSOS(row)"
              >
                标记处理
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const sosList = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const statusFilter = ref('')
const activeCount = ref(0)

const loadData = async () => {
  try {
    loading.value = true
    
    const params = {
      limit: pageSize.value,
      skip: (page.value - 1) * pageSize.value
    }
    
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    
    const result = await request.get('/sos', { params })
    
    sosList.value = result.records || []
    total.value = result.total || 0
    activeCount.value = sosList.value.filter(s => !s.resolved).length
  } catch (error) {
    console.error('加载SOS记录失败:', error)
  } finally {
    loading.value = false
  }
}

const resolveSOS = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要将该SOS呼救标记为已处理吗？`,
      '处理确认',
      {
        confirmButtonText: '标记处理',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await request.put(`/sos/${row._id}/resolve`)
    
    ElMessage.success('已标记为处理')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('处理失败:', error)
    }
  }
}

const viewDetail = (userId) => {
  if (userId) {
    router.push(`/users/${userId}`)
  }
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
