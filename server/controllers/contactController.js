const Contact = require('../models/Contact');
const { validationResult } = require('express-validator');

exports.getContacts = async (req, res) => {
  try {
    const { targetUserId } = req.query;
    let userId = req.user._id;

    if (targetUserId && (req.user.isAdmin || req.user.managedUsers?.includes(targetUserId))) {
      userId = targetUserId;
    }

    const contacts = await Contact.find({ userId })
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      contacts
    });
  } catch (error) {
    res.status(500).json({ message: '获取联系人失败', error: error.message });
  }
};

exports.addContact = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { targetUserId } = req.query;
    let userId = req.user._id;

    if (targetUserId && (req.user.isAdmin || req.user.managedUsers?.includes(targetUserId))) {
      userId = targetUserId;
    }

    const { name, phone, relationship, priority, notifyMethods, enabled } = req.body;

    const existingContact = await Contact.findOne({ userId, phone });
    if (existingContact) {
      return res.status(400).json({ message: '该手机号已添加为联系人' });
    }

    const contact = new Contact({
      userId,
      name,
      phone,
      relationship: relationship || 'other',
      priority: priority || 1,
      notifyMethods: {
        sms: notifyMethods?.sms !== false,
        call: notifyMethods?.call || false,
        wechat: notifyMethods?.wechat || false
      },
      enabled: enabled !== false
    });

    await contact.save();

    res.status(201).json({
      message: '联系人添加成功',
      contact
    });
  } catch (error) {
    console.error('添加联系人失败:', error);
    res.status(500).json({ message: '添加联系人失败', error: error.message });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, phone, relationship, priority, notifyMethods, enabled } = req.body;

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }

    const isOwner = contact.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;
    const isManager = req.user.managedUsers?.includes(contact.userId.toString());

    if (!isOwner && !isAdmin && !isManager) {
      return res.status(403).json({ message: '无权限修改此联系人' });
    }

    if (phone && phone !== contact.phone) {
      const existingContact = await Contact.findOne({ 
        userId: contact.userId, 
        phone,
        _id: { $ne: contactId }
      });
      if (existingContact) {
        return res.status(400).json({ message: '该手机号已添加为联系人' });
      }
    }

    if (name !== undefined) contact.name = name;
    if (phone !== undefined) contact.phone = phone;
    if (relationship !== undefined) contact.relationship = relationship;
    if (priority !== undefined) contact.priority = priority;
    if (notifyMethods !== undefined) {
      contact.notifyMethods = {
        sms: notifyMethods.sms !== false,
        call: notifyMethods.call || false,
        wechat: notifyMethods.wechat || false
      };
    }
    if (enabled !== undefined) contact.enabled = enabled;

    await contact.save();

    res.json({
      message: '联系人更新成功',
      contact
    });
  } catch (error) {
    res.status(500).json({ message: '更新联系人失败', error: error.message });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }

    const isOwner = contact.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;
    const isManager = req.user.managedUsers?.includes(contact.userId.toString());

    if (!isOwner && !isAdmin && !isManager) {
      return res.status(403).json({ message: '无权限删除此联系人' });
    }

    await Contact.findByIdAndDelete(contactId);

    res.json({
      message: '联系人删除成功'
    });
  } catch (error) {
    res.status(500).json({ message: '删除联系人失败', error: error.message });
  }
};

exports.testNotification = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: '联系人不存在' });
    }

    const isOwner = contact.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '无权限发送测试通知' });
    }

    const notificationService = require('../services/notificationService');
    const result = await notificationService.sendNotification({
      userId: contact.userId,
      contactId: contact._id,
      type: 'test',
      method: 'sms',
      recipient: {
        name: contact.name,
        phone: contact.phone
      },
      content: `【死了么】测试通知：这是一条测试短信，${req.user.nickname}正在测试紧急联系人通知功能。`,
      templateParams: {
        name: req.user.nickname
      }
    });

    res.json({
      message: result.success ? '测试通知已发送' : '测试通知发送失败',
      success: result.success,
      result
    });
  } catch (error) {
    res.status(500).json({ message: '发送测试通知失败', error: error.message });
  }
};
