const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const ReservationHistory = require('../models/ReservationHistory');

class ReservationServiceNoTransaction {
  /**
   * 예약 생성 (트랜잭션 없이 순차적 처리)
   */
  static async createReservation(userId, roomId, bedNumber, specialRequests, requestInfo = {}) {
    try {
      // 1. 사용자 정보 조회 및 검증
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      // 이미 활성 예약이 있는지 확인
      const existingReservation = await Reservation.findOne({
        user: userId,
        status: 'active'
      });

      if (existingReservation) {
        throw new Error('이미 예약한 방이 있습니다. 기존 예약을 취소한 후 새로운 예약을 해주세요.');
      }

      // 2. 방 정보 조회 및 검증
      const room = await Room.findById(roomId);
      if (!room || !room.isActive) {
        throw new Error('방을 찾을 수 없습니다');
      }

      // 성별 확인
      if (room.gender !== '공용' && user.gender && room.gender !== user.gender) {
        const userGenderText = user.gender === 'M' ? '남성' : '여성';
        const roomGenderText = room.gender === 'M' ? '남성' : '여성';
        throw new Error(`이 방은 ${roomGenderText}용 방입니다. ${userGenderText}용 방을 선택해주세요.`);
      }

      // 침대 번호 유효성 확인
      if (bedNumber > room.capacity) {
        throw new Error(`유효하지 않은 번호입니다. 1~${room.capacity} 범위에서 선택해주세요.`);
      }

      // 해당 침대가 이미 예약되었는지 확인
      const bedOccupied = room.occupants.some(occupant => 
        occupant.bedNumber === bedNumber
      );

      if (bedOccupied) {
        throw new Error('이미 예약된 번호입니다. 다른 번호를 선택해주세요.');
      }

      // 방이 꽉 찼는지 확인
      if (room.occupants.length >= room.capacity) {
        throw new Error('방이 만실입니다. 다른 방을 선택해주세요.');
      }

      // 3. 순차적 업데이트 (롤백 로직 포함)
      let reservation = null;
      let roomUpdated = false;
      let userUpdated = false;

      try {
        // 3-1. 예약 생성
        reservation = await Reservation.create({
          user: userId,
          room: roomId,
          bedNumber,
          specialRequests,
          status: 'active'
        });

        // 3-2. 방에 거주자 추가
        await Room.findByIdAndUpdate(
          roomId,
          {
            $push: {
              occupants: {
                user: userId,
                bedNumber: bedNumber,
                assignedAt: new Date()
              }
            }
          },
          { new: true }
        );
        roomUpdated = true;

        // 3-3. 사용자 방 배정 정보 업데이트
        await User.findByIdAndUpdate(
          userId,
          {
            'roomAssignment.roomNumber': room.roomNumber,
            'roomAssignment.assignedAt': new Date(),
            'roomAssignment.status': 'assigned'
          },
          { new: true }
        );
        userUpdated = true;

        // 3-4. 예약 히스토리 기록
        await ReservationHistory.create({
          user: userId,
          room: roomId,
          reservation: reservation._id,
          action: 'reserved',
          bedNumber,
          reason: '신규 예약',
          performedBy: userId,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent
        });

        // 생성된 예약 정보 반환
        const createdReservation = await Reservation.findById(reservation._id)
          .populate('room', 'roomNumber floor capacity gender amenities description')
          .populate('user', 'name email grade gender phone');

        return createdReservation;

      } catch (error) {
        // 롤백 처리
        if (userUpdated) {
          await User.findByIdAndUpdate(userId, {
            'roomAssignment.roomNumber': null,
            'roomAssignment.assignedAt': null,
            'roomAssignment.status': 'pending'
          });
        }

        if (roomUpdated) {
          await Room.findByIdAndUpdate(roomId, {
            $pull: { occupants: { user: userId, bedNumber: bedNumber } }
          });
        }

        if (reservation) {
          await Reservation.findByIdAndDelete(reservation._id);
        }

        throw error;
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * 예약 취소
   */
  static async cancelReservation(reservationId, cancelledBy, reason = '사용자 취소', requestInfo = {}) {
    try {
      // 1. 예약 정보 조회
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        throw new Error('예약을 찾을 수 없습니다');
      }

      if (reservation.status !== 'active') {
        throw new Error('이미 취소된 예약입니다');
      }

      // 2. 순차적 업데이트
      // 2-1. 예약 상태 변경
      await Reservation.findByIdAndUpdate(
        reservationId,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: cancelledBy
        }
      );

      // 2-2. 방에서 거주자 제거
      await Room.findByIdAndUpdate(
        reservation.room,
        {
          $pull: {
            occupants: {
              user: reservation.user,
              bedNumber: reservation.bedNumber
            }
          }
        }
      );

      // 2-3. 사용자 방 배정 정보 초기화
      await User.findByIdAndUpdate(
        reservation.user,
        {
          'roomAssignment.roomNumber': null,
          'roomAssignment.assignedAt': null,
          'roomAssignment.status': 'pending'
        }
      );

      // 2-4. 예약 히스토리 기록
      await ReservationHistory.create({
        user: reservation.user,
        room: reservation.room,
        reservation: reservationId,
        action: 'cancelled',
        bedNumber: reservation.bedNumber,
        reason: reason,
        performedBy: cancelledBy,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      });

      return { success: true, message: '예약이 취소되었습니다' };

    } catch (error) {
      throw error;
    }
  }

  /**
   * 관리자용 방 배정 취소
   */
  static async cancelRoomAssignmentByAdmin(userId, adminId, requestInfo = {}) {
    try {
      // 1. 사용자 정보 조회
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      // 배정된 방이 없는 경우
      if (!user.roomAssignment?.roomNumber || user.roomAssignment.status !== 'assigned') {
        throw new Error('배정된 방이 없습니다');
      }

      // 2. 활성 예약 찾기
      const activeReservation = await Reservation.findOne({
        user: userId,
        status: 'active'
      });

      if (activeReservation) {
        // 예약이 있는 경우 예약 취소 서비스 사용
        return await this.cancelReservation(
          activeReservation._id, 
          adminId, 
          '관리자에 의한 방 배정 취소',
          requestInfo
        );
      } else {
        // 예약이 없는 경우 직접 데이터 정리
        const roomNumber = user.roomAssignment.roomNumber;

        // 방에서 사용자 제거
        await Room.updateOne(
          { roomNumber: roomNumber },
          { $pull: { occupants: { user: userId } } }
        );

        // 사용자 방 배정 정보 초기화
        await User.findByIdAndUpdate(
          userId,
          {
            'roomAssignment.roomNumber': null,
            'roomAssignment.assignedAt': null,
            'roomAssignment.status': 'pending'
          }
        );

        return { 
          success: true, 
          message: `${user.name}님의 ${roomNumber}호실 배정이 취소되었습니다` 
        };
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * 데이터 정합성 복구
   */
  static async repairDataConsistency() {
    try {
      let repairedCount = 0;

      console.log('🔧 데이터 정합성 복구 시작...');

      // 1. Reservation은 있지만 User.roomAssignment가 없는 경우 수정
      const activeReservations = await Reservation.find({ status: 'active' })
        .populate('user')
        .populate('room');

      console.log(`📋 활성 예약 ${activeReservations.length}개 확인 중...`);

      for (const reservation of activeReservations) {
        if (!reservation.user.roomAssignment || 
            reservation.user.roomAssignment.status !== 'assigned' ||
            reservation.user.roomAssignment.roomNumber !== reservation.room.roomNumber) {
          
          await User.findByIdAndUpdate(
            reservation.user._id,
            {
              'roomAssignment.roomNumber': reservation.room.roomNumber,
              'roomAssignment.assignedAt': reservation.createdAt,
              'roomAssignment.status': 'assigned'
            }
          );
          repairedCount++;
          console.log(`✅ ${reservation.user.name}의 User.roomAssignment 복구됨 (${reservation.room.roomNumber}호)`);
        }
      }

      // 2. User.roomAssignment는 있지만 Reservation이 없는 경우 수정
      const assignedUsers = await User.find({ 'roomAssignment.status': 'assigned' });
      console.log(`👥 배정된 사용자 ${assignedUsers.length}명 확인 중...`);
      
      for (const user of assignedUsers) {
        const activeReservation = await Reservation.findOne({
          user: user._id,
          status: 'active'
        });

        if (!activeReservation) {
          await User.findByIdAndUpdate(
            user._id,
            {
              'roomAssignment.roomNumber': null,
              'roomAssignment.assignedAt': null,
              'roomAssignment.status': 'pending'
            }
          );
          repairedCount++;
          console.log(`✅ ${user.name}의 User.roomAssignment 초기화됨 (예약 없음)`);
        }
      }

      console.log(`🎉 데이터 정합성 복구 완료! ${repairedCount}개 항목 수정됨`);
      return { success: true, repairedCount };

    } catch (error) {
      console.error('❌ 데이터 정합성 복구 오류:', error);
      throw error;
    }
  }
}

module.exports = ReservationServiceNoTransaction; 