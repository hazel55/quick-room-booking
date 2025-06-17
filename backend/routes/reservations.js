const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const ReservationHistory = require('../models/ReservationHistory');
const User = require('../models/User');
const ReservationSettings = require('../models/ReservationSettings');
const ReservationService = require('../services/ReservationServiceNoTransaction');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    내 예약 정보 조회
// @route   GET /api/reservations/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ 
      user: req.user.id, 
      status: 'active' 
    })
    .populate('room', 'roomNumber floor capacity gender amenities description')
    .populate('user', 'name email grade gender phone');

    res.json({
      success: true,
      data: reservation
    });

  } catch (error) {
    console.error('내 예약 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    예약 생성
// @route   POST /api/reservations
// @access  Private
router.post('/', protect, [
  body('roomId', '방 ID를 입력해주세요').notEmpty().isMongoId(),
  body('bedNumber', '번호를 입력해주세요').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: '입력 정보를 확인해주세요',
        errors: errors.array()
      });
    }

    // 예약 오픈 시간 확인
    const reservationSettings = await ReservationSettings.getCurrentSettings();
    if (reservationSettings && !reservationSettings.isOpenNow()) {
      const timeUntilOpen = reservationSettings.getTimeUntilOpen();
      const openDateTime = new Date(reservationSettings.openDateTime);
      
      return res.status(403).json({
        success: false,
        message: '아직 예약 오픈 시간이 아닙니다.',
        openDateTime: openDateTime.toISOString(),
        timeUntilOpen: timeUntilOpen,
        openDateTimeKorean: openDateTime.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      });
    }

    const { roomId, bedNumber, specialRequests } = req.body;
    const userId = req.user.id;

    // 요청 정보 수집
    const requestInfo = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    // 트랜잭션 기반 예약 생성 서비스 사용
    const createdReservation = await ReservationService.createReservation(
      userId, 
      roomId, 
      bedNumber, 
      specialRequests, 
      requestInfo
    );

    res.status(201).json({
      success: true,
      message: '예약이 완료되었습니다',
      data: createdReservation
    });

  } catch (error) {
    console.error('예약 생성 오류:', error);

    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.user) {
        return res.status(400).json({ message: '이미 활성 예약이 있습니다' });
      }
      if (error.keyPattern && error.keyPattern.room && error.keyPattern.bedNumber) {
        return res.status(400).json({ message: '이미 예약된 번호입니다' });
      }
    }

    res.status(400).json({ message: error.message || '서버 오류가 발생했습니다' });
  }
});

// @desc    예약 취소
// @route   DELETE /api/reservations/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: '예약을 찾을 수 없습니다' });
    }

    // 본인 예약이거나 관리자인지 확인
    if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' });
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ message: '이미 취소되었거나 만료된 예약입니다' });
    }

    // 예약 취소
    await reservation.cancel(req.body.reason || '사용자 요청');

    // 방에서 사용자 제거
    const room = await Room.findById(reservation.room);
    if (room) {
      await room.removeUser(reservation.user);
    }

    // 예약 히스토리 기록
    await ReservationHistory.logAction({
      user: reservation.user,
      room: reservation.room,
      reservation: reservation._id,
      action: 'cancelled',
      bedNumber: reservation.bedNumber,
      reason: req.body.reason || '사용자 요청',
      performedBy: req.user.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '예약이 취소되었습니다'
    });

  } catch (error) {
    console.error('예약 취소 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    내 예약 취소
// @route   DELETE /api/reservations/my
// @access  Private
router.delete('/my', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      user: req.user.id,
      status: 'active'
    });

    if (!reservation) {
      return res.status(404).json({ message: '활성 예약이 없습니다' });
    }

    // 예약 취소
    await reservation.cancel(req.body.reason || '사용자 요청');

    // 방에서 사용자 제거
    const room = await Room.findById(reservation.room);
    if (room) {
      await room.removeUser(reservation.user);
    }

    // 예약 히스토리 기록
    await ReservationHistory.logAction({
      user: reservation.user,
      room: reservation.room,
      reservation: reservation._id,
      action: 'cancelled',
      bedNumber: reservation.bedNumber,
      reason: req.body.reason || '사용자 요청',
      performedBy: req.user.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '예약이 취소되었습니다. 이제 새로운 방을 예약할 수 있습니다.'
    });

  } catch (error) {
    console.error('내 예약 취소 오류:', error);
    console.error('오류 상세:', error.stack);
    res.status(500).json({ message: '서버 오류가 발생했습니다', error: error.message });
  }
});

// @desc    예약 목록 조회 (관리자)
// @route   GET /api/reservations
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { 
      status = 'active',
      room,
      floor,
      gender,
      page = 1,
      limit = 50 
    } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (room) filter.room = room;

    let query = Reservation.find(filter)
      .populate('user', 'name email grade gender phone ssn')
      .populate('room', 'roomNumber floor capacity gender amenities')
      .sort({ createdAt: -1 });

    // 층별 필터링
    if (floor) {
      const roomsInFloor = await Room.find({ floor: parseInt(floor) });
      const roomIds = roomsInFloor.map(r => r._id);
      query = query.where('room').in(roomIds);
    }

    // 성별 필터링
    if (gender && gender !== 'all') {
      const roomsByGender = await Room.find({ gender });
      const roomIds = roomsByGender.map(r => r._id);
      query = query.where('room').in(roomIds);
    }

    const reservations = await query
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Reservation.countDocuments(filter);

    res.json({
      success: true,
      count: reservations.length,
      total,
      data: reservations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('예약 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    예약 통계
// @route   GET /api/reservations/stats
// @access  Private/Admin
router.get('/stats', protect, admin, async (req, res) => {
  try {
    // 기본 통계
    const totalReservations = await Reservation.countDocuments({ status: 'active' });
    const totalCancelled = await Reservation.countDocuments({ status: 'cancelled' });
    
    // 성별별 통계
    const genderStats = await Reservation.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $group: {
          _id: '$userInfo.gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // 방 타입별 통계
    const roomTypeStats = await Reservation.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'roomInfo'
        }
      },
      { $unwind: '$roomInfo' },
      {
        $group: {
          _id: {
            capacity: '$roomInfo.capacity',
            gender: '$roomInfo.gender'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.capacity': 1 } }
    ]);

    // 층별 통계
    const floorStats = await Reservation.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'roomInfo'
        }
      },
      { $unwind: '$roomInfo' },
      {
        $group: {
          _id: '$roomInfo.floor',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalActive: totalReservations,
          totalCancelled: totalCancelled,
          total: totalReservations + totalCancelled
        },
        byGender: genderStats,
        byRoomType: roomTypeStats,
        byFloor: floorStats
      }
    });

  } catch (error) {
    console.error('예약 통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    예약 히스토리 조회
// @route   GET /api/reservations/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user.id;

    const history = await ReservationHistory.getUserHistory(userId, parseInt(limit));

    res.json({
      success: true,
      count: history.length,
      data: history
    });

  } catch (error) {
    console.error('예약 히스토리 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 