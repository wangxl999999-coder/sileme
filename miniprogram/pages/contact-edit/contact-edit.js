const app = getApp();

Page({
  data: {
    isEdit: false,
    contactId: '',
    saving: false,
    form: {
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
    },
    relationships: [
      { value: 'spouse', label: '配偶' },
      { value: 'child', label: '子女' },
      { value: 'parent', label: '父母' },
      { value: 'sibling', label: '兄弟姐妹' },
      { value: 'friend', label: '朋友' },
      { value: 'other', label: '其他' }
    ]
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ 
        isEdit: true, 
        contactId: options.id 
      });
      this.loadContact(options.id);
      wx.setNavigationBarTitle({ title: '编辑联系人' });
    } else {
      wx.setNavigationBarTitle({ title: '添加联系人' });
    }
  },

  async loadContact(id) {
    try {
      app.showLoading();
      const result = await app.request('/contacts', 'GET');
      const contact = result.contacts.find(c => c._id === id);
      
      if (contact) {
        this.setData({
          form: {
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
            priority: contact.priority,
            notifyMethods: { ...contact.notifyMethods },
            enabled: contact.enabled
          }
        });
      }
      app.hideLoading();
    } catch (error) {
      app.hideLoading();
      app.showToast(error.message || '加载失败');
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value });
  },

  selectRelationship(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ 'form.relationship': value });
  },

  onPriorityChange(e) {
    this.setData({ 'form.priority': e.detail.value });
  },

  onNotifyMethodChange(e) {
    const { method } = e.currentTarget.dataset;
    this.setData({ [`form.notifyMethods.${method}`]: e.detail.value });
  },

  onEnabledChange(e) {
    this.setData({ 'form.enabled': e.detail.value });
  },

  validateForm() {
    const { name, phone } = this.data.form;
    
    if (!name.trim()) {
      app.showToast('请输入联系人姓名');
      return false;
    }

    if (!phone.trim()) {
      app.showToast('请输入手机号');
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      app.showToast('请输入正确的手机号');
      return false;
    }

    const { sms, call, wechat } = this.data.form.notifyMethods;
    if (!sms && !call && !wechat) {
      app.showToast('请至少选择一种通知方式');
      return false;
    }

    return true;
  },

  async saveContact() {
    if (!this.validateForm()) return;
    
    try {
      this.setData({ saving: true });
      app.showLoading('保存中...');

      const { form, isEdit, contactId } = this.data;
      
      let result;
      if (isEdit) {
        result = await app.request(`/contacts/${contactId}`, 'PUT', form);
      } else {
        result = await app.request('/contacts', 'POST', form);
      }

      app.hideLoading();
      this.setData({ saving: false });
      
      app.showToast(isEdit ? '更新成功' : '添加成功', 'success');
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      app.hideLoading();
      this.setData({ saving: false });
      app.showToast(error.message || '保存失败');
    }
  }
});
