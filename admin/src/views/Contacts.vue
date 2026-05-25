<template>
  <div>
    <div class="page-header">
      <h2>联系人管理</h2>
      <p>管理用户的紧急联系人信息</p>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 14px; color: #909399;">当前用户: </span>
          <span style="font-weight: 600;">{{ user?.nickname || '未命名' }}</span>
          <span v-if="user?.phone" style="color: #909399; margin-left: 12px;">{{ user.phone }}</span>
        </div>
        <el-button type="primary" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
    </div>

    <div class="card">
      <div class="flex-between" style="margin-bottom: 24px;">
        <div class="card-title" style="margin-bottom: 0;">紧急联系人列表</div>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加联系人
        </el-button>
      </div>

      <el-table :data="contacts" v-loading="loading" stripe>
        <el-table-column label="联系人" width="200">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="contact-avatar">{{ row.name.charAt(0) }}</div>
              <div>
                <div style="font-weight: 500;">{{ row.name }}</div>
                <div style="font-size: 12px; color: #909399;">{{ row.phone }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="relationship" label="关系" width="120">
          <template #default="{ row }">
            {{ getRelationshipText(row.relationship) }}
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.priority > 1" class="priority-tag">×{{ row.priority }}</span>
            <span v-else style="color: #909399;">普通</span>
          </template>
        </el-table-column>
        <el-table-column label="通知方式" width="200">
          <template #default="{ row }">
            <el-tag v-if="row.notifyMethods?.sms" type="success" size="small" style="margin-right: 4px;">短信</el-tag>
            <el-tag v-if="row.notifyMethods?.call" type="warning" size="small" style="margin-right: 4px;">电话</el-tag>
            <el-tag v-if="row.notifyMethods?.wechat" type="primary" size="small">微信</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notificationCount" label="通知次数" width="100" align="center" />
        <el-table-column prop="lastNotified" label="上次通知" width="180">
          <template #default="{ row }">
            {{ row.lastNotified ? formatTime(row.lastNotified) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="enabled" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? '已启用' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" size="small" text @click="editContact(row)">编辑</el-button>
              <el-button type="success" size="small" text @click="testNotify(row)">测试</el-button>
              <el-button type="danger" size="small" text @click="deleteContact(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="contacts.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">👥</div>
        <p>暂无紧急联系人</p>
        <p style="font-size: 13px; color: #c0c4cc; margin-top: 4px;">点击上方按钮添加紧急联系人</p>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑联系人' : '添加联系人'"
      width="500px"
      @close="resetForm"
    >
      <el-form ref="contactFormRef" :model="contactForm" :rules="contactRules" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="contactForm.name" placeholder="请输入联系人姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="contactForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="关系" prop="relationship">
          <el-select v-model="contactForm.relationship" placeholder="请选择关系">
            <el-option label="配偶" value="spouse" />
            <el-option label="子女" value="child" />
            <el-option label="父母" value="parent" />
            <el-option label="兄弟姐妹" value="sibling" />
            <el-option label="朋友" value="friend" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-slider v-model="contactForm.priority" :min="1" :max="10" :step="1" show-stops />
          <div style="font-size: 12px; color: #909399; text-align: right;">数字越大，越先被通知</div>
        </el-form-item>
        <el-form-item label="通知方式">
          <el-checkbox v-model="contactForm.notifyMethods.sms">短信通知</el-checkbox>
          <el-checkbox v-model="contactForm.notifyMethods.call">电话通知</el-checkbox>
          <el-checkbox v-model="contactForm.notifyMethods.wechat">微信通知</el-checkbox>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="contactForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveContact" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import request from '../utils/request'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userId = computed(() => route.params.userId)

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const user = ref(null)
const contacts = ref([])
const contactFormRef = ref<FormInstance>()

const contactForm = reactive({
  name: '',
  phone: '',
  relationship: 'other',
  priority: 1,
  notifyMethods: {
    sms: true,
    call: false,
    wechat: false
  },
  enabled: true
})

const contactRules: FormRules = {
  name: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const loadData = async () => {
  try {
    loading.value = true
    
    const [userResult, contactsResult] = await Promise.all([
      request.get(`/admin/users/${userId.value}`),
      request.get('/contacts', { params: { targetUserId: userId.value } })
    ])
    
    user.value = userResult.user
    contacts.value = contactsResult.contacts || []
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  editId.value = ''
  resetForm()
  dialogVisible.value = true
}

const editContact = (row) => {
  isEdit.value = true
  editId.value = row._id
  contactForm.name = row.name
  contactForm.phone = row.phone
  contactForm.relationship = row.relationship
  contactForm.priority = row.priority
  contactForm.notifyMethods = { ...row.notifyMethods }
  contactForm.enabled = row.enabled
  dialogVisible.value = true
}

const resetForm = () => {
  contactForm.name = ''
  contactForm.phone = ''
  contactForm.relationship = 'other'
  contactForm.priority = 1
  contactForm.notifyMethods = {
    sms: true,
    call: false,
    wechat: false
  }
  contactForm.enabled = true
  contactFormRef.value?.resetFields()
}

const saveContact = async () => {
  if (!contactFormRef.value) return
  
  try {
    await contactFormRef.value.validate()
    
    saving.value = true
    
    if (isEdit.value) {
      await request.put(`/contacts/${editId.value}`, {
        ...contactForm,
        targetUserId: userId.value
      })
      ElMessage.success('更新成功')
    } else {
      await request.post('/contacts', {
        ...contactForm,
        targetUserId: userId.value
      })
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    saving.value = false
  }
}

const deleteContact = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除联系人「${row.name}」吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await request.delete(`/contacts/${row._id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

const testNotify = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要向「${row.name} (${row.phone})」发送测试短信吗？`,
      '测试通知',
      {
        confirmButtonText: '发送',
        cancelButtonText: '取消',
        type: 'primary'
      }
    )
    
    const result = await request.post(`/contacts/${row._id}/test`)
    
    if (result.success) {
      ElMessage.success('测试通知已发送')
    } else {
      ElMessageBox.alert(result.message || '发送失败', '发送结果', { type: 'warning' })
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('发送失败:', error)
    }
  }
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

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
}

const goBack = () => {
  router.back()
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
</style>
