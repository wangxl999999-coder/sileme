const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'sileme_secret_key',
    { expiresIn: '365d' }
  );
};

exports.wxLogin = async (req, res) => {
  try {
    const { code, nickname, avatar } = req.body;

    if (!code) {
      return res.status(400).json({ message: '缺少code参数' });
    }

    let openid;
    
    if (process.env.NODE_ENV === 'development') {
      openid = `dev_${code}_${Date.now()}`;
    } else {
      const wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
        params: {
          appid: process.env.WX_APPID,
          secret: process.env.WX_SECRET,
          js_code: code,
          grant_type: 'authorization_code'
        }
      });

      if (!wxResponse.data.openid) {
        return res.status(400).json({ 
          message: '微信登录失败',
          error: wxResponse.data.errmsg 
        });
      }
      openid = wxResponse.data.openid;
    }

    let user = await User.findOne({ openid });
    
    if (!user) {
      user = new User({
        openid,
        nickname: nickname || '微信用户',
        avatar,
        lastCheckIn: null,
        status: 'active'
      });
      await user.save();
    } else {
      user.lastOnline = new Date();
      if (nickname) user.nickname = nickname;
      if (avatar) user.avatar = avatar;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        lastCheckIn: user.lastCheckIn,
        lastOnline: user.lastOnline,
        status: user.status,
        checkInStreak: user.checkInStreak
      }
    });
  } catch (error) {
    console.error('微信登录失败:', error);
    res.status(500).json({ message: '登录失败', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: '请输入手机号和密码' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: '手机号或密码错误' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: '手机号或密码错误' });
    }

    user.lastOnline = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        isAdmin: user.isAdmin,
        status: user.status
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '登录失败', error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { phone, password, nickname } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: '请输入手机号和密码' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: '该手机号已注册' });
    }

    const user = new User({
      phone,
      password,
      nickname: nickname || '用户',
      status: 'active'
    });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        phone: user.phone,
        status: user.status
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ message: '注册失败', error: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        nickname: req.user.nickname,
        avatar: req.user.avatar,
        phone: req.user.phone,
        isAdmin: req.user.isAdmin,
        lastCheckIn: req.user.lastCheckIn,
        lastOnline: req.user.lastOnline,
        status: req.user.status,
        checkInStreak: req.user.checkInStreak,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { nickname, avatar, phone } = req.body;
    
    if (nickname !== undefined) req.user.nickname = nickname;
    if (avatar !== undefined) req.user.avatar = avatar;
    if (phone !== undefined) {
      const existingUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ message: '该手机号已被使用' });
      }
      req.user.phone = phone;
    }
    
    await req.user.save();

    res.json({
      message: '更新成功',
      user: {
        id: req.user._id,
        nickname: req.user.nickname,
        avatar: req.user.avatar,
        phone: req.user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: '更新失败', error: error.message });
  }
};
