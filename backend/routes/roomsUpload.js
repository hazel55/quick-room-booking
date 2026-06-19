const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const Room = require('../models/Room');
const { protect, admin } = require('../middleware/auth');

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

const normalizeGender = (val) => {
  if (!val) return null;
  const v = String(val).trim().toUpperCase();
  if (v === 'M' || v === '남' || v === '남성') return 'M';
  if (v === 'F' || v === '여' || v === '여성') return 'F';
  return null;
};

const normalizeCapacity = (val) => {
  const num = parseInt(val);
  if ([2, 3, 4, 10, 20].includes(num)) return num;
  return null;
};

// @route   POST /api/rooms/upload-excel
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
        const roomNumber = String(row['방번호'] || '').trim();
        const floor = parseInt(row['층']);
        const capacity = normalizeCapacity(row['수용인원']);
        const gender = normalizeGender(row['성별']);
        const description = String(row['설명'] || '').trim();

        const missing = [];
        if (!roomNumber) missing.push('방번호');
        if (isNaN(floor) || floor < 1 || floor > 10) missing.push('층(1~10)');
        if (!capacity) missing.push('수용인원(2/3/4/10/20)');
        if (!gender) missing.push('성별(M/F)');

        if (missing.length > 0) {
          results.failed.push({ row: rowNum, roomNumber, reason: '필수값 오류: ' + missing.join(', ') });
          continue;
        }

        const existing = await Room.findOne({ roomNumber });
        if (existing) {
          results.failed.push({ row: rowNum, roomNumber, reason: '방 번호 중복' });
          continue;
        }

        await Room.create({ roomNumber, floor, capacity, gender, description, isActive: true });
        results.success.push({ row: rowNum, roomNumber });

      } catch (err) {
        const roomNumber = String(row['방번호'] || '').trim();
        let reason = err.message;
        if (err.name === 'ValidationError') {
          reason = Object.values(err.errors).map(e => e.message).join(', ');
        }
        if (err.code === 11000) reason = '방 번호 중복';
        results.failed.push({ row: rowNum, roomNumber, reason });
      }
    }

    res.json({
      success: true,
      message: '처리 완료: 성공 ' + results.success.length + '개, 실패 ' + results.failed.length + '개',
      successCount: results.success.length,
      failedCount: results.failed.length,
      successList: results.success,
      failedList: results.failed
    });

  } catch (err) {
    console.error('방 엑셀 업로드 오류:', err);
    res.status(500).json({ message: err.message || '서버 오류가 발생했습니다' });
  }
});

module.exports = router;
