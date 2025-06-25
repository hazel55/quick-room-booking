const express = require('express');
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const ReservationHistory = require('../models/ReservationHistory');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    모든 방 조회 (공개)
// @route   GET /api/rooms
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      floor, 
      capacity, 
      gender, 
      available, 
      sort = 'roomNumber',
      page = 1,
      limit = 50,
      admin = false
    } = req.query;

    // 필터 조건 구성 - 관리자 요청이면 모든 방, 일반 사용자는 활성 방만
    const filter = admin === 'true' ? {} : { isActive: true };
    
    if (floor) filter.floor = parseInt(floor);
    if (capacity) filter.capacity = parseInt(capacity);
    if (gender && gender !== 'all') filter.gender = gender;

    // 정렬 옵션
    const sortOptions = {
      roomNumber: { roomNumber: 1 },
      floor: { floor: 1, roomNumber: 1 },
      capacity: { capacity: 1, roomNumber: 1 },
      occupancy: { 'occupants.length': 1, roomNumber: 1 }
    };

    const rooms = await Room.find(filter)
      .populate('occupants.user', 'name grade gender')
      .sort(sortOptions[sort] || { roomNumber: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // 사용 가능한 방만 필터링 (필요한 경우)
    let filteredRooms = rooms;
    if (available === 'true') {
      filteredRooms = rooms.filter(room => room.availableBeds > 0);
    }

    const total = await Room.countDocuments(filter);

    res.json({
      success: true,
      count: filteredRooms.length,
      total,
      data: filteredRooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('방 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    특정 방 조회
// @route   GET /api/rooms/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('occupants.user', 'name email grade gender phone');

    if (!room) {
      return res.status(404).json({ message: '방을 찾을 수 없습니다' });
    }

    res.json({
      success: true,
      data: room
    });

  } catch (error) {
    console.error('방 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    방 생성 (관리자 전용)
// @route   POST /api/rooms
// @access  Private/Admin
router.post('/', protect, admin, [
  body('roomNumber', '방 번호를 입력해주세요').notEmpty().isLength({ min: 1, max: 12 }).withMessage('방 번호는 1-12글자여야 합니다'),
  body('floor', '층수를 입력해주세요').isInt({ min: 1, max: 10 }),
  body('capacity', '수용 인원을 입력해주세요').isIn([2, 3, 4, 10, 20]),
  body('gender', '성별을 선택해주세요').isIn(['M', 'F'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: '입력 정보를 확인해주세요',
        errors: errors.array()
      });
    }

    const {
      roomNumber,
      floor,
      capacity,
      gender,
      amenities,
      description,
      isActive = true
    } = req.body;

    // 중복 방 번호 확인
    const existingRoom = await Room.findOne({ roomNumber });
    if (existingRoom) {
      return res.status(400).json({ message: '이미 존재하는 방 번호입니다' });
    }

    const room = await Room.create({
      roomNumber,
      floor,
      capacity,
      gender,
      amenities: amenities || [],
      description,
      isActive
    });

    res.status(201).json({
      success: true,
      message: '방이 생성되었습니다',
      data: room
    });

  } catch (error) {
    console.error('방 생성 오류:', error);
    
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

// @desc    방 정보 수정 (관리자 전용)
// @route   PUT /api/rooms/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: '방을 찾을 수 없습니다' });
    }

    // 방 번호 검증 (길이 제한)
    if (req.body.roomNumber && req.body.roomNumber.length > 12) {
      return res.status(400).json({ message: '방 번호는 12글자 이하여야 합니다' });
    }

    // 방 번호 변경 시 중복 확인
    if (req.body.roomNumber && req.body.roomNumber !== room.roomNumber) {
      const existingRoom = await Room.findOne({ 
        roomNumber: req.body.roomNumber,
        _id: { $ne: req.params.id }
      });
      
      if (existingRoom) {
        return res.status(400).json({ message: '이미 존재하는 방 번호입니다' });
      }
    }

    // isActive가 false로 변경되는 경우 배정된 사용자들 처리
    if (req.body.isActive === false && room.isActive === true && room.occupants.length > 0) {
      const User = require('../models/User');
      const ReservationServiceNoTransaction = require('../services/ReservationServiceNoTransaction');
      
      // 요청 정보 수집
      const requestInfo = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };
      
      // 배정된 모든 사용자들의 방 배정 취소
      for (const occupant of room.occupants) {
        if (occupant.user) {
          try {
            await ReservationServiceNoTransaction.cancelRoomAssignmentByAdmin(
              occupant.user.toString(), 
              req.user.id, // 관리자 ID 추가
              requestInfo  // 요청 정보 추가
            );
          } catch (error) {
            console.error(`사용자 ${occupant.user} 방 배정 취소 실패:`, error);
          }
        }
      }
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: '방 정보가 수정되었습니다',
      data: updatedRoom
    });

  } catch (error) {
    console.error('방 수정 오류:', error);
    
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

// @desc    방 삭제 (관리자 전용)
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: '방을 찾을 수 없습니다' });
    }

    // 현재 점유 중인 사용자가 있는지 확인
    if (room.occupants.length > 0) {
      return res.status(400).json({ 
        message: '현재 사용 중인 방은 삭제할 수 없습니다. 먼저 모든 사용자를 다른 방으로 이동시켜주세요.' 
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '방이 삭제되었습니다'
    });

  } catch (error) {
    console.error('방 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    방 통계 조회 (관리자 전용)
// @route   GET /api/rooms/stats
// @access  Private/Admin
router.get('/stats/overview', protect, admin, async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments({ isActive: true });
    
    const roomStats = await Room.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: {
            capacity: '$capacity',
            gender: '$gender'
          },
          count: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          currentOccupancy: { $sum: { $size: '$occupants' } }
        }
      },
      { $sort: { '_id.capacity': 1, '_id.gender': 1 } }
    ]);

    const floorStats = await Room.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$floor',
          roomCount: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          currentOccupancy: { $sum: { $size: '$occupants' } }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 전체 통계
    const overallStats = await Room.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalRooms: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalOccupancy: { $sum: { $size: '$occupants' } }
        }
      }
    ]);

    const stats = overallStats[0] || { totalRooms: 0, totalCapacity: 0, totalOccupancy: 0 };
    stats.occupancyRate = stats.totalCapacity > 0 ? 
      (stats.totalOccupancy / stats.totalCapacity * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        overall: stats,
        byRoomType: roomStats,
        byFloor: floorStats
      }
    });

  } catch (error) {
    console.error('방 통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    방 초기화 (모든 방 생성)
// @route   POST /api/rooms/initialize
// @access  Private/Admin
router.post('/initialize', protect, admin, async (req, res) => {
  try {
    // 기존 방 데이터 삭제
    await Room.deleteMany({});
    
    const rooms = [];
    
    // 2층: 2인실 5개
    for (let i = 1; i <= 5; i++) {
      rooms.push({
        roomNumber: `20${i}`,
        floor: 2,
        capacity: 2,
        gender: i <= 2 ? 'M' : 'F',
        amenities: ['에어컨', '난방', '개별화장실', '책상', '옷장', 'WiFi'],
        description: `2층 ${i <= 2 ? '남성' : '여성'}용 2인실`
      });
    }
    
    // 3층, 4층: 3인실 각 12개
    for (let floor = 3; floor <= 4; floor++) {
      for (let i = 1; i <= 12; i++) {
        rooms.push({
          roomNumber: `${floor}0${i.toString().padStart(2, '0')}`,
          floor: floor,
          capacity: 3,
          gender: i <= 6 ? 'M' : 'F',
          amenities: ['에어컨', '난방', '공용화장실', '책상', '옷장', 'WiFi'],
          description: `${floor}층 ${i <= 6 ? '남성' : '여성'}용 3인실`
        });
      }
    }
    
    // 5층: 4인실 10개
    for (let i = 1; i <= 10; i++) {
      rooms.push({
        roomNumber: `50${i}`,
        floor: 5,
        capacity: 4,
        gender: i <= 5 ? 'M' : 'F',
        amenities: ['에어컨', '난방', '공용화장실', '냉장고', '책상', '옷장', 'WiFi'],
        description: `5층 ${i <= 5 ? '남성' : '여성'}용 4인실`
      });
    }
    
    // 6층: 10인실 4개
    for (let i = 1; i <= 4; i++) {
      rooms.push({
        roomNumber: `60${i}`,
        floor: 6,
        capacity: 10,
        gender: i <= 2 ? 'M' : 'F',
        amenities: ['에어컨', '난방', '공용화장실', '냉장고', '책상', '옷장', 'WiFi'],
        description: `6층 ${i <= 2 ? '남성' : '여성'}용 10인실 (대형 도미토리)`
      });
    }
    
    await Room.insertMany(rooms);
    
    res.json({
      success: true,
      message: `총 ${rooms.length}개의 방이 초기화되었습니다`
    });

  } catch (error) {
    console.error('방 초기화 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 