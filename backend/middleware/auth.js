const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT 토큰 보호 미들웨어
const protect = async (req, res, next) => {
  let token;

  // Authorization 헤더에서 Bearer 토큰 확인
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Bearer 토큰에서 토큰 추출
      token = req.headers.authorization.split(' ')[1];

      // 토큰 검증
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 사용자 정보를 req 객체에 추가 (비밀번호 제외)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: '토큰이 유효하지 않습니다' });
      }

      next();
    } catch (error) {
      console.error('토큰 검증 오류:', error);
      return res.status(401).json({ message: '토큰이 유효하지 않습니다' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: '액세스 토큰이 없습니다' });
  }
};

// 관리자 권한 확인 미들웨어
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: '관리자 권한이 필요합니다' });
  }
};

// JWT 토큰 생성 함수
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = { protect, admin, generateToken }; 