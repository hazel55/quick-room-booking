const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');
const { validateSSN } = require('../utils/encryption');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다'));
    }
  }
});

const normalizePhone = (val) => {
  if (!val) return '';
  return String(val).replace(/[^0-9]/g, '');
};

const normalizeGrade = (val) => {
  if (!val) return null;
  const v = String(val).trim().toUpperCase();
  if (['1', '2', '3', 'T', 'A'].includes(v)) return v;
  if (v === '선생님' || v === '교사') return 'T';
  if (v === '관리자') return 'A';
  return v;
};

const normalizeClass = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const v = String(val).trim();
  if (v === 'N' || v === '새가족' || v === '미배정') return 'N';
  const num = parseInt(v);
  if (!isNaN(num) && num >= 1 && num <= 10) return String(num);
  return v;
};

const normalizeGender = (val) => {
  if (!val) return null;
  const v = String(val).trim().toUpperCase();
  if (v === 'M' || v === '남' || v === '남성') return 'M';
  if (v === 'F' || v === '여' || v === '여성') return 'F';
  return null;
};

const normalizeRelationship = (val) => {
  if (!val) return null;
  const v = String(val).trim();
  const allowed = ['부', '모', '조부', '조모', '외조부', '외조모', '형제', '자매', '부모', '형제/자매', '친척', '친구', '기타'];
  if (allowed.includes(v)) return v;
  return '기타';
};

// @route   POST /api/users/upload-excel
// @access  Private/Admin
router.post('/upload-excel', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '파일을 업로드해주세요' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ message: '엑셀 파일에 데이터가 없습니다' });
    }

    const results = { success: [], failed: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const name = String(row['이름'] || '').trim();
        const email = String(row['이메일'] || '').trim().toLowerCase();
        const password = String(row['비밀번호'] || '').trim();
        const phone = normalizePhone(row['전화번호']);
        const ssn = String(row['주민등록번호'] || '').replace(/[^0-9]/g, '');
        const grade = normalizeGrade(row['학년']);
        const classNumber = normalizeClass(row['반']);
        const gender = normalizeGender(row['성별']);
        const guardianPhone = normalizePhone(row['보호자전화번호']);
        const guardianRelationship = normalizeRelationship(row['보호자관계']);

        const missing = [];
        if (!name) missing.push('이름');
        if (!email) missing.push('이메일');
        if (!password) missing.push('비밀번호');
        if (!phone) missing.push('전화번호');
        if (!ssn) missing.push('주민등록번호');
        if (!grade) missing.push('학년');
        if (!gender) missing.push('성별');
        if (!guardianPhone) missing.push('보호자전화번호');
        if (!guardianRelationship) missing.push('보호자관계');

        if (missing.length > 0) {
          results.failed.push({ row: rowNum, name, reason: '필수값 누락: ' + missing.join(', ') });
          continue;
        }

        if (!validateSSN(ssn)) {
          results.failed.push({ row: rowNum, name, reason: '주민등록번호 형식 오류 (13자리 숫자)' });
          continue;
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
          results.failed.push({ row: rowNum, name, reason: '이메일 중복: ' + email });
          continue;
        }

        const userData = {
          name, email, password, phone, ssn, grade,
          classNumber: (grade === 'T' || grade === 'A') ? null : (classNumber || 'N'),
          gender, guardianPhone, guardianRelationship,
          retreatConsent: true, privacyConsent: true, role: 'user'
        };

        await User.create(userData);
        results.success.push({ row: rowNum, name, email });

      } catch (err) {
        const name = String(row['이름'] || '').trim();
        let reason = err.message;
        if (err.name === 'ValidationError') {
          reason = Object.values(err.errors).map(e => e.message).join(', ');
        }
        if (err.code === 11000) {
          reason = '이메일 또는 주민등록번호 중복';
        }
        results.failed.push({ row: rowNum, name, reason });
      }
    }

    res.json({
      success: true,
      message: '처리 완료: 성공 ' + results.success.length + '명, 실패 ' + results.failed.length + '명',
      successCount: results.success.length,
      failedCount: results.failed.length,
      successList: results.success,
      failedList: results.failed
    });

  } catch (err) {
    console.error('엑셀 업로드 오류:', err);
    res.status(500).json({ message: err.message || '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
