const express = require('express');
const router = express.Router();
const ReservationSettings = require('../models/ReservationSettings');
const { protect, admin } = require('../middleware/auth');

// 현재 예약 설정 조회 (모든 사용자)
router.get('/', protect, async (req, res) => {
  try {
    const settings = await ReservationSettings.getCurrentSettings();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: '예약 설정을 찾을 수 없습니다.'
      });
    }

    // 사용자에게는 필요한 정보만 제공
    const responseData = {
      openDateTime: settings.openDateTime,
      isReservationOpen: settings.isReservationOpen,
      description: settings.description,
      isOpenNow: settings.isOpenNow(),
      timeUntilOpen: settings.getTimeUntilOpen()
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('예약 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 예약 설정 업데이트 (관리자만)
router.put('/', protect, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.adminAccess) {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const { openDateTime, isReservationOpen, description } = req.body;

    // 입력 검증
    if (!openDateTime) {
      return res.status(400).json({
        success: false,
        message: '오픈 일시를 입력해주세요.'
      });
    }

    const openDate = new Date(openDateTime);
    if (isNaN(openDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: '올바른 날짜 형식을 입력해주세요.'
      });
    }

    // 설정 업데이트
    const settings = await ReservationSettings.updateSettings(
      openDate,
      isReservationOpen !== undefined ? isReservationOpen : false,
      req.user._id,
      description
    );

    res.json({
      success: true,
      message: '예약 설정이 업데이트되었습니다.',
      data: {
        openDateTime: settings.openDateTime,
        isReservationOpen: settings.isReservationOpen,
        description: settings.description,
        isOpenNow: settings.isOpenNow(),
        timeUntilOpen: settings.getTimeUntilOpen()
      }
    });
  } catch (error) {
    console.error('예약 설정 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 예약 오픈 상태만 토글 (관리자만)
router.patch('/toggle', protect, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (!req.user.adminAccess) {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const settings = await ReservationSettings.getCurrentSettings();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: '예약 설정을 찾을 수 없습니다.'
      });
    }

    // 오픈 상태 토글
    settings.isReservationOpen = !settings.isReservationOpen;
    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      success: true,
      message: `예약이 ${settings.isReservationOpen ? '오픈' : '마감'}되었습니다.`,
      data: {
        openDateTime: settings.openDateTime,
        isReservationOpen: settings.isReservationOpen,
        description: settings.description,
        isOpenNow: settings.isOpenNow(),
        timeUntilOpen: settings.getTimeUntilOpen()
      }
    });
  } catch (error) {
    console.error('예약 오픈 상태 토글 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 