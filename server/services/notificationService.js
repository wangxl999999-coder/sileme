const Notification = require('../models/Notification');
const Contact = require('../models/Contact');
const smsService = require('./smsService');

class NotificationService {
  async sendInactivityAlert(user, daysInactive) {
    const contacts = await Contact.find({
      userId: user._id,
      enabled: true
    }).sort({ priority: -1 });

    if (contacts.length === 0) {
      console.log(`用户 ${user._id} 没有配置紧急联系人`);
      return [];
    }

    const results = [];
    const message = smsService.generateInactivityMessage(user.nickname, daysInactive);

    for (const contact of contacts) {
      if (contact.notifyMethods.sms) {
        const result = await this.sendNotification({
          userId: user._id,
          contactId: contact._id,
          type: 'inactivity_alert',
          method: 'sms',
          recipient: {
            name: contact.name,
            phone: contact.phone
          },
          content: message,
          daysInactive,
          templateParams: {
            name: user.nickname,
            days: daysInactive.toString()
          }
        });
        results.push(result);
      }
    }

    return results;
  }

  async sendSOSAlert(user, sosRecordId) {
    const contacts = await Contact.find({
      userId: user._id,
      enabled: true
    }).sort({ priority: -1 });

    if (contacts.length === 0) {
      console.log(`用户 ${user._id} 没有配置紧急联系人`);
      return [];
    }

    const results = [];
    const message = smsService.generateSOSMessage(user.nickname);

    for (const contact of contacts) {
      if (contact.notifyMethods.sms) {
        const result = await this.sendNotification({
          userId: user._id,
          contactId: contact._id,
          type: 'sos_alert',
          method: 'sms',
          recipient: {
            name: contact.name,
            phone: contact.phone
          },
          content: message,
          sosRecordId,
          templateParams: {
            name: user.nickname
          }
        });
        results.push(result);
      }

      await Contact.findByIdAndUpdate(contact._id, {
        $inc: { notificationCount: 1 },
        lastNotified: new Date()
      });
    }

    return results;
  }

  async sendNotification({
    userId,
    contactId,
    type,
    method,
    recipient,
    content,
    daysInactive,
    sosRecordId,
    templateParams = {}
  }) {
    const notification = new Notification({
      userId,
      contactId,
      type,
      method,
      recipient,
      content,
      status: 'pending',
      daysInactive,
      sosRecordId
    });

    try {
      let sendResult;
      
      if (method === 'sms') {
        sendResult = await smsService.sendSMS(
          recipient.phone,
          content,
          templateParams
        );
      }

      notification.status = sendResult?.success ? 'sent' : 'failed';
      notification.sentAt = new Date();
      notification.provider = sendResult?.provider;
      notification.providerResponse = sendResult;
      
      if (!sendResult?.success) {
        notification.failedReason = sendResult?.error || '未知错误';
      }

      await notification.save();

      return {
        success: sendResult?.success || false,
        notification,
        contact: recipient,
        error: sendResult?.error
      };
    } catch (error) {
      notification.status = 'failed';
      notification.failedReason = error.message;
      await notification.save();
      
      return {
        success: false,
        notification,
        contact: recipient,
        error: error.message
      };
    }
  }

  async getNotificationHistory(userId, options = {}) {
    const { limit = 50, skip = 0, type } = options;
    const query = { userId };
    if (type) query.type = type;

    return Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('contactId', 'name phone');
  }
}

module.exports = new NotificationService();
