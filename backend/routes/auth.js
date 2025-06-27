const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');
const { encryptSSN, validateSSN, validateGenderWithSSN } = require('../utils/encryption');

const router = express.Router();

// @desc    사용자 회원가입
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('name', '이름을 입력해주세요').notEmpty().trim(),
  body('email', '올바른 이메일을 입력해주세요').isEmail().normalizeEmail(),
  body('password', '비밀번호는 최소 6자 이상이어야 하며, 영문, 숫자, 특수문자를 포함해야 합니다')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('phone', '전화번호를 입력해주세요').notEmpty().custom((value) => {
    // 숫자만 남기기
    const cleanPhone = value.replace(/[^0-9]/g, '');
    // 11자리 숫자이고 01로 시작하는지 확인
    if (!/^01[0-9]{9}$/.test(cleanPhone)) {
      throw new Error('올바른 전화번호 형식을 입력해주세요 (01로 시작하는 11자리 숫자)');
    }
    return true;
  }),
  body('guardianPhone', '보호자 전화번호를 입력해주세요').notEmpty().custom((value) => {
    // 숫자만 남기기
    const cleanPhone = value.replace(/[^0-9]/g, '');
    // 11자리 숫자이고 01로 시작하는지 확인
    if (!/^01[0-9]{9}$/.test(cleanPhone)) {
      throw new Error('올바른 보호자 전화번호 형식을 입력해주세요 (01로 시작하는 11자리 숫자)');
    }
    return true;
  }),
  body('guardianRelationship', '보호자와의 관계를 선택해주세요').isIn(['부', '모', '조부', '조모', '외조부', '외조모', '형제', '자매', '부모', '형제/자매', '친척', '친구', '기타']),
  body('grade', '학년을 선택해주세요').isIn(['1', '2', '3', 'T', 'A']),
  body('classNumber').if(body('grade').isIn(['1', '2', '3'])).notEmpty().withMessage('반을 선택해주세요').custom((value) => {
    // 숫자 1-10 또는 'N' (새가족/미배정) 허용
    if (value === 'N') {
      return true;
    }
    const num = parseInt(value);
    if (isNaN(num) || num < 1 || num > 10) {
      throw new Error('반은 1에서 10 사이의 숫자이거나 새가족/미배정이어야 합니다.');
    }
    return true;
  }),
  body('gender', '성별을 선택해주세요').isIn(['M', 'F']),
  body('ssn', '주민등록번호를 입력해주세요').custom((value, { req }) => {
    if (!value || !validateSSN(value)) {
      throw new Error('올바른 주민등록번호를 입력해주세요 (13자리)');
    }
    
    // 성별과 주민번호 일치 여부 확인
    if (req.body.gender && !validateGenderWithSSN(value, req.body.gender)) {
      throw new Error('주민등록번호와 성별이 일치하지 않습니다');
    }
    
    return true;
  }),
  body('privacyConsent', '개인정보 수집 및 이용에 동의해주세요').equals('true'),
  body('retreatConsent', '수련회 참가 서약서에 동의해주세요').equals('true')
], async (req, res) => {
  try {
    // 유효성 검사 오류 확인
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: '입력 정보를 확인해주세요',
        errors: errors.array()
      });
    }

    const {
      name,
      email,
      password,
      phone,
      guardianPhone,
      guardianRelationship,
      grade,
      classNumber,
      gender,
      ssn,
      privacyConsent,
      retreatConsent,
      specialRequests
    } = req.body;

    // 이미 존재하는 사용자인지 확인 (이메일 및 주민등록번호)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: '이미 가입된 이메일입니다',
        field: 'email'
      });
    }

    // 주민등록번호 중복 확인
    try {
      const encryptedSSN = encryptSSN(ssn);
      const existingSSN = await User.findOne({ ssn: encryptedSSN });
      if (existingSSN) {
        return res.status(400).json({ 
          message: '이미 가입된 주민등록번호입니다',
          field: 'ssn'
        });
      }
    } catch (ssnError) {
      return res.status(400).json({ 
        message: '주민등록번호 처리 중 오류가 발생했습니다',
        field: 'ssn'
      });
    }

    // 새 사용자 생성
    const user = await User.create({
      name,
      email,
      password,
      phone,
      guardianPhone,
      guardianRelationship,
      grade,
      classNumber,
      gender,
      ssn,
      privacyConsent,
      retreatConsent,
      specialRequests
    });

    // JWT 토큰 생성
    const token = generateToken(user._id);

    res.status(201).json({
      message: '회원가입이 완료되었습니다',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        grade: user.grade,
        classNumber: user.classNumber,
        gender: user.gender,
        role: user.role,
        adminAccess: user.adminAccess,
        roomAssignment: user.roomAssignment,
        guardianRelationship: user.guardianRelationship
      }
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        message: '입력 정보를 확인해주세요',
        errors: messages
      });
    }

    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    사용자 로그인
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email', '이메일을 입력해주세요').isEmail(),
  body('password', '비밀번호를 입력해주세요').notEmpty()
], async (req, res) => {
  try {
    // 유효성 검사 오류 확인
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: '이메일과 비밀번호를 확인해주세요',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // 사용자 조회 (비밀번호 포함)
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // 비밀번호 확인
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // JWT 토큰 생성
    const token = generateToken(user._id);

    res.json({
      message: '로그인 성공',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        grade: user.grade,
        classNumber: user.classNumber,
        gender: user.gender,
        role: user.role,
        adminAccess: user.adminAccess,
        roomAssignment: user.roomAssignment
      }
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    현재 로그인된 사용자 정보 조회
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        grade: user.grade,
        classNumber: user.classNumber,
        gender: user.gender,
        role: user.role,
        adminAccess: user.adminAccess,
        roomAssignment: user.roomAssignment,
        emergencyContact: user.emergencyContact,
        specialRequests: user.specialRequests
      }
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 