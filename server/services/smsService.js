const axios = require('axios');
const crypto = require('crypto');

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'aliyun';
    this.accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    this.accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    this.signName = process.env.ALIYUN_SMS_SIGN_NAME || '死了么';
    this.templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || 'SMS_TEMPLATE';
  }

  async sendSMS(phone, content, templateParams = {}) {
    if (process.env.NODE_ENV === 'development' || !this.accessKeyId) {
      console.log(`[DEV MODE] 发送短信到 ${phone}: ${content}`);
      return {
        success: true,
        provider: 'mock',
        phone,
        content,
        mock: true
      };
    }

    try {
      switch (this.provider) {
        case 'aliyun':
          return await this.sendAliyunSMS(phone, templateParams);
        case 'tencent':
          return await this.sendTencentSMS(phone, templateParams);
        default:
          return await this.sendGenericSMS(phone, content);
      }
    } catch (error) {
      console.error('短信发送失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendAliyunSMS(phone, templateParams) {
    const host = 'dysmsapi.aliyuncs.com';
    const date = new Date();
    const timestamp = date.toISOString();
    
    const params = {
      Format: 'JSON',
      Version: '2017-05-25',
      AccessKeyId: this.accessKeyId,
      SignatureMethod: 'HMAC-SHA1',
      Timestamp: timestamp,
      SignatureVersion: '1.0',
      SignatureNonce: crypto.randomBytes(16).toString('hex'),
      Action: 'SendSms',
      PhoneNumbers: phone,
      SignName: this.signName,
      TemplateCode: this.templateCode,
      TemplateParam: JSON.stringify(templateParams)
    };

    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});

    const queryString = Object.entries(sortedParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(queryString)}`;
    const signature = crypto
      .createHmac('sha1', this.accessKeySecret + '&')
      .update(stringToSign)
      .digest('base64');

    const url = `https://${host}/?${queryString}&Signature=${encodeURIComponent(signature)}`;
    
    const response = await axios.get(url);
    return {
      success: response.data.Code === 'OK',
      provider: 'aliyun',
      response: response.data
    };
  }

  async sendTencentSMS(phone, templateParams) {
    console.log('腾讯云短信服务待实现');
    return { success: false, error: '腾讯云短信服务未配置' };
  }

  async sendGenericSMS(phone, content) {
    console.log('通用短信服务待实现');
    return { success: false, error: '通用短信服务未配置' };
  }

  generateInactivityMessage(userName, days) {
    return `我是${userName}，我已经连续${days}天没有活动了，请检查下我的状态。`;
  }

  generateSOSMessage(userName) {
    return `紧急！${userName}触发了SOS一键呼救，请立即联系确认！`;
  }
}

module.exports = new SMSService();
