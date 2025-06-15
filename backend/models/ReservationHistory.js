const mongoose = require('mongoose');

const ReservationHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '사용자 정보가 필요합니다']
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, '방 정보가 필요합니다']
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  action: {
    type: String,
    enum: ['reserved', 'cancelled', 'checked_in', 'checked_out', 'modified'],
    required: [true, '액션 타입이 필요합니다']
  },
  bedNumber: {
    type: Number,
    min: [1, '침대 번호는 1 이상이어야 합니다']
  },
  // 변경 전후 데이터 (수정 시)
  previousData: {
    type: mongoose.Schema.Types.Mixed
  },
  newData: {
    type: mongoose.Schema.Types.Mixed
  },
  reason: {
    type: String,
    maxlength: [500, '사유는 500자를 초과할 수 없습니다']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '수행자 정보가 필요합니다']
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  // 시스템 정보
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  // 관리자 메모
  adminNotes: {
    type: String,
    maxlength: [1000, '관리자 메모는 1000자를 초과할 수 없습니다']
  }
}, {
  timestamps: true
});

// 인덱스 설정
ReservationHistorySchema.index({ user: 1, performedAt: -1 });
ReservationHistorySchema.index({ room: 1, performedAt: -1 });
ReservationHistorySchema.index({ reservation: 1, performedAt: -1 });
ReservationHistorySchema.index({ action: 1, performedAt: -1 });
ReservationHistorySchema.index({ performedBy: 1, performedAt: -1 });

// 가상 필드: 액션 설명
ReservationHistorySchema.virtual('actionDescription').get(function() {
  const actionMap = {
    'reserved': '예약',
    'cancelled': '취소',
    'checked_in': '체크인',
    'checked_out': '체크아웃',
    'modified': '수정'
  };
  return actionMap[this.action] || this.action;
});

// 정적 메서드: 이력 기록
ReservationHistorySchema.statics.logAction = function(data) {
  return this.create({
    user: data.user,
    room: data.room,
    reservation: data.reservation,
    action: data.action,
    bedNumber: data.bedNumber,
    previousData: data.previousData,
    newData: data.newData,
    reason: data.reason,
    performedBy: data.performedBy,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    adminNotes: data.adminNotes
  });
};

// 정적 메서드: 사용자별 이력 조회
ReservationHistorySchema.statics.getUserHistory = function(userId, limit = 50) {
  return this.find({ user: userId })
    .populate('room', 'roomNumber floor capacity gender')
    .populate('performedBy', 'name email role')
    .sort({ performedAt: -1 })
    .limit(limit);
};

// 정적 메서드: 방별 이력 조회
ReservationHistorySchema.statics.getRoomHistory = function(roomId, limit = 100) {
  return this.find({ room: roomId })
    .populate('user', 'name email grade gender')
    .populate('performedBy', 'name email role')
    .sort({ performedAt: -1 })
    .limit(limit);
};

// 정적 메서드: 전체 이력 통계
ReservationHistorySchema.statics.getStatistics = function(startDate, endDate) {
  const matchCondition = {};
  
  if (startDate || endDate) {
    matchCondition.performedAt = {};
    if (startDate) matchCondition.performedAt.$gte = startDate;
    if (endDate) matchCondition.performedAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        latestAction: { $max: '$performedAt' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// JSON으로 변환 시 가상 필드 포함
ReservationHistorySchema.set('toJSON', { virtuals: true });
ReservationHistorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ReservationHistory', ReservationHistorySchema); 