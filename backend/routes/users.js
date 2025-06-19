const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const ReservationHistory = require('../models/ReservationHistory');
const ReservationService = require('../services/ReservationServiceNoTransaction');
const { protect, admin } = require('../middleware/auth');
const { decryptSSN } = require('../utils/encryption');

const router = express.Router();

// @desc    모든 사용자 조회 (관리자 전용) - 활성 사용자만
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    // 활성 사용자만 조회 (isActive: true이고 deletedAt이 null인 사용자)
    const users = await User.find({
      isActive: true,
      deletedAt: null
    }).select('-password').sort({ createdAt: -1 });
    
    // 관리자용으로 복호화된 주민등록번호 추가
    const usersWithDecryptedSSN = users.map(user => {
      const userObj = user.toObject();
      userObj.ssn = user.decryptedSSN; // 복호화된 주민등록번호 추가
      return userObj;
    });
    
    res.json({
      success: true,
      count: usersWithDecryptedSSN.length,
      data: usersWithDecryptedSSN
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    사용자 검색 (관리자 전용)
// @route   GET /api/users/search
// @access  Private/Admin
router.get('/search', protect, admin, async (req, res) => {
  try {
    const { query, excludeAssigned = 'true' } = req.query;
    console.log('🔍 백엔드 검색 요청:', { query, excludeAssigned });
    
    if (!query || query.length < 2) {
      console.log('❌ 검색어가 너무 짧음');
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // 기본 검색 조건
    let searchConditions = [];
    
    // 이름으로 검색
    searchConditions.push({
      name: { $regex: query, $options: 'i' }
    });

    // 이메일로 검색
    searchConditions.push({
      email: { $regex: query, $options: 'i' }
    });

    // 생년월일로 검색 (6자리 숫자인 경우)
    if (/^\d{6}$/.test(query)) {
      console.log('📅 생년월일 검색 모드:', query);
      // 활성 사용자만 가져와서 복호화 후 검색
      const allUsers = await User.find({
        isActive: true,
        deletedAt: null
      }).select('-password');
      const matchedUsers = [];

      for (const user of allUsers) {
        try {
          if (user.ssn) {
            const decryptedSSN = decryptSSN(user.ssn);
            if (decryptedSSN && decryptedSSN.substring(0, 6) === query) {
              matchedUsers.push(user);
            }
          }
        } catch (error) {
          // 복호화 실패 시 무시
          continue;
        }
      }

      console.log('📅 생년월일 검색 결과:', matchedUsers.length, '명');

      // 생년월일 검색 결과가 있으면 반환
      if (matchedUsers.length > 0) {
        let filteredUsers = matchedUsers;
        
        // 방 배정된 사용자 제외 옵션
        if (excludeAssigned === 'true') {
          filteredUsers = matchedUsers.filter(user => 
            !user.roomAssignment || 
            !user.roomAssignment.roomNumber || 
            user.roomAssignment.status !== 'assigned'
          );
        }

        console.log('📅 필터링 후 결과:', filteredUsers.length, '명');

        return res.json({
          success: true,
          count: filteredUsers.length,
          data: filteredUsers.slice(0, 10) // 최대 10개
        });
      }
    }

    // 이름/이메일 검색 실행 (활성 사용자만)
    console.log('👤 이름/이메일 검색 모드:', searchConditions);
    let users = await User.find({
      $and: [
        { $or: searchConditions },
        { isActive: true },
        { deletedAt: null }
      ]
    }).select('-password').limit(50);

    console.log('👤 이름/이메일 검색 결과:', users.length, '명');

    // 방 배정된 사용자 제외 옵션
    if (excludeAssigned === 'true') {
      users = users.filter(user => 
        !user.roomAssignment || 
        !user.roomAssignment.roomNumber || 
        user.roomAssignment.status !== 'assigned'
      );
    }

    console.log('👤 필터링 후 결과:', users.length, '명');

    res.json({
      success: true,
      count: users.length,
      data: users.slice(0, 10) // 최대 10개
    });
  } catch (error) {
    console.error('사용자 검색 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    특정 사용자 조회 (관리자 전용)
// @route   GET /api/users/:id
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    사용자 정보 업데이트 (관리자 전용)
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    res.json({
      success: true,
      message: '사용자 정보가 업데이트되었습니다',
      data: user
    });
  } catch (error) {
    console.error('사용자 정보 업데이트 오류:', error);
    
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

// @desc    사용자 안전 삭제 (관리자 전용) - 민감 데이터 마스킹
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 이름 마스킹 함수
    const maskName = (name) => {
      if (!name || name.length === 0) return '삭제된 사용자';
      if (name.length === 1) return name + '*';
      if (name.length === 2) return name[0] + '*';
      return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    };

    // 민감 데이터 마스킹 및 삭제
    const timestamp = Date.now();
    const maskedData = {
      name: maskName(user.name),
      email: `deleted_${timestamp}@deleted.com`, // 유니크 제약 조건 때문에 타임스탬프 추가
      phone: '',
      guardianPhone: '',
      guardianRelationship: '삭제됨',
      ssn: `deleted_${timestamp}_${user._id}`, // 주민등록번호 고유한 값으로 대체 (unique 제약 조건 때문에)
      password: 'deleted', // 비밀번호 무의미한 값으로 대체
      isActive: false, // 비활성화
      deletedAt: new Date(), // 삭제 시점 기록
      // 다른 필수 필드들은 그대로 유지 (grade, gender 등)
    };

    // 방 배정 및 예약 정보 완전 정리 (데이터 정합성 보장)
    if (user.roomAssignment && user.roomAssignment.roomNumber) {
      console.log(`🏠 ${user.name}님의 방 배정 정보 정리 시작: ${user.roomAssignment.roomNumber}호`);
      
      // 1. 활성 예약 조회
      const activeReservation = await Reservation.findOne({
        user: user._id,
        status: 'active'
      });

      // 2. 방에서 사용자 제거 (userId 필드명 수정)
      await Room.findOneAndUpdate(
        { roomNumber: user.roomAssignment.roomNumber },
        {
          $pull: {
            occupants: {
              user: user._id  // userId가 아닌 user 필드 사용
            }
          }
        }
      );

      // 3. 모든 예약 기록 취소 처리 (더 포괄적)
      await Reservation.updateMany(
        { user: user._id, status: { $in: ['active', 'confirmed', 'pending'] } },
        { 
          status: 'cancelled', 
          cancelledAt: new Date(),
          cancelReason: '회원 탈퇴로 인한 자동 취소'
        }
      );

      // 4. ReservationHistory에 삭제 기록 추가
      if (activeReservation) {
        await ReservationHistory.create({
          user: user._id,
          room: activeReservation.room,
          reservation: activeReservation._id,
          action: 'cancelled',
          bedNumber: activeReservation.bedNumber || user.roomAssignment.bedNumber,
          reason: '회원 탈퇴로 인한 자동 취소',
          performedBy: req.user.id, // 관리자 ID
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          adminNotes: `회원 탈퇴 처리 시 자동 취소 - ${new Date().toISOString()}`
        });
      }

      // 5. 사용자의 방 배정 정보 완전 제거
      maskedData.roomAssignment = {
        roomNumber: null,
        assignedAt: null,
        bedNumber: null,
        status: 'pending'
      };

      console.log(`✅ ${user.name}님의 방 배정 정보 정리 완료`);
    }

    // 사용자 정보 업데이트 (완전 삭제 대신 마스킹)
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      maskedData,
      { new: true, runValidators: false }
    ).select('-password');

    res.json({
      success: true,
      message: '사용자가 안전하게 삭제되었습니다. 민감 정보는 마스킹 처리되었습니다.',
      data: updatedUser
    });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    방 배정 (관리자 전용) - 개선된 버전
// @route   PUT /api/users/:id/assign-room
// @access  Private/Admin
router.put('/:id/assign-room', protect, admin, async (req, res) => {
  try {
    const { roomId, bedNumber, roomNumber } = req.body;
    console.log('🏠 방 배정 요청:', { userId: req.params.id, roomId, bedNumber, roomNumber });

    // 필수 파라미터 검증
    if (!roomId && !roomNumber) {
      return res.status(400).json({ message: '방 정보를 입력해주세요' });
    }

    if (!bedNumber) {
      return res.status(400).json({ message: '번호를 입력해주세요' });
    }

    // 1. 사용자 정보 조회
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 2. 사용자가 이미 방을 배정받았는지 확인
    if (user.roomAssignment && user.roomAssignment.roomNumber && user.roomAssignment.status === 'assigned') {
      return res.status(400).json({ 
        message: `${user.name}님은 이미 ${user.roomAssignment.roomNumber}호실에 배정되어 있습니다` 
      });
    }

    // 3. 방 정보 조회 (roomId 우선, 없으면 roomNumber로 조회)
    let room;
    if (roomId) {
      console.log('🔍 roomId로 방 조회 중:', roomId);
      room = await Room.findById(roomId);
      console.log('방 조회 결과:', room ? '찾음' : '못찾음');
      if (room) {
        console.log('방 상세 정보:', {
          _id: room._id,
          roomNumber: room.roomNumber,
          isActive: room.isActive,
          capacity: room.capacity,
          gender: room.gender
        });
      }
    } else {
      console.log('🔍 roomNumber로 방 조회 중:', roomNumber);
      room = await Room.findOne({ roomNumber: roomNumber });
      console.log('방 조회 결과:', room ? '찾음' : '못찾음');
    }

    if (!room) {
      console.log('❌ 방을 찾을 수 없음');
      
      // 디버깅을 위해 사용 가능한 방 목록 출력
      const availableRooms = await Room.find({ isActive: true }).limit(5);
      console.log('📋 사용 가능한 방 목록:');
      availableRooms.forEach(r => {
        console.log(`- ${r._id}: ${r.roomNumber}호 (${r.gender}, ${r.capacity}명)`);
      });
      
      return res.status(404).json({ message: '방을 찾을 수 없습니다' });
    }

    if (!room.isActive) {
      console.log('❌ 방이 비활성화됨:', room.isActive);
      return res.status(404).json({ message: '사용할 수 없는 방입니다' });
    }

    // 4. 성별 확인
    if (room.gender !== user.gender) {
      const userGenderText = user.gender === 'M' ? '남성' : '여성';
      const roomGenderText = room.gender === 'M' ? '남성' : '여성';
      return res.status(400).json({ 
        message: `이 방은 ${roomGenderText}용 방입니다. ${userGenderText}용 방을 선택해주세요.` 
      });
    }

    // 5. 침대 번호 유효성 확인
    if (bedNumber > room.capacity || bedNumber < 1) {
      return res.status(400).json({ 
        message: `유효하지 않은 번호입니다. 1~${room.capacity} 범위에서 선택해주세요.` 
      });
    }

    // 6. 해당 침대가 이미 사용 중인지 확인
    const bedOccupied = room.occupants.some(occupant => 
      occupant.bedNumber === parseInt(bedNumber)
    );

    if (bedOccupied) {
      return res.status(400).json({ message: '이미 사용 중인 번호입니다.' });
    }

    // 7. 방이 꽉 찼는지 확인
    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ message: '방이 꽉 찼습니다.' });
    }

    // 8. 트랜잭션 기반 배정 처리
    const result = await ReservationService.createReservation(
      user._id,
      room._id,
      parseInt(bedNumber),
      null, // specialRequests
      {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        performedBy: req.user.id
      }
    );

    console.log('✅ 방 배정 성공:', result);

    res.json({
      success: true,
      message: `${user.name}님이 ${room.roomNumber}호실 ${bedNumber} 번에 배정되었습니다`,
      data: result
    });

  } catch (error) {
    console.error('❌ 방 배정 오류:', error);
    res.status(400).json({ message: error.message || '서버 오류가 발생했습니다' });
  }
});

// @desc    방 배정 취소 (관리자 전용)
// @route   DELETE /api/users/:id/room-assignment
// @access  Private/Admin
router.delete('/:id/room-assignment', protect, admin, async (req, res) => {
  try {
    // 요청 정보 수집
    const requestInfo = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    // 트랜잭션 기반 방 배정 취소 서비스 사용
    const result = await ReservationService.cancelRoomAssignmentByAdmin(
      req.params.id,
      req.user.id,
      requestInfo
    );

    res.json(result);
  } catch (error) {
    console.error('방 배정 취소 오류:', error);
    res.status(400).json({ message: error.message || '서버 오류가 발생했습니다' });
  }
});

// @desc    데이터 정합성 복구 (관리자 전용)
// @route   POST /api/users/repair-data-consistency
// @access  Private/Admin
router.post('/repair-data-consistency', protect, admin, async (req, res) => {
  try {
    const result = await ReservationService.repairDataConsistency();
    
    res.json({
      success: true,
      message: `데이터 정합성 복구 완료. ${result.repairedCount}개 항목이 수정되었습니다.`,
      repairedCount: result.repairedCount
    });
  } catch (error) {
    console.error('데이터 정합성 복구 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 