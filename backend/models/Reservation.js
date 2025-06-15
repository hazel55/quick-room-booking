const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
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
  bedNumber: {
    type: Number,
    required: [true, '침대 번호가 필요합니다'],
    min: [1, '침대 번호는 1 이상이어야 합니다']
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  reservedAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: {
    type: Date
  },
  cancelReason: {
    type: String,
    maxlength: [200, '취소 사유는 200자를 초과할 수 없습니다']
  },
  // 체크인/체크아웃 관련
  checkInDate: {
    type: Date
  },
  checkOutDate: {
    type: Date
  },
  actualCheckIn: {
    type: Date
  },
  actualCheckOut: {
    type: Date
  },
  // 추가 정보
  specialRequests: {
    type: String,
    maxlength: [500, '특별 요청사항은 500자를 초과할 수 없습니다']
  },
  notes: {
    type: String,
    maxlength: [500, '메모는 500자를 초과할 수 없습니다']
  }
}, {
  timestamps: true
});

// 인덱스 설정
ReservationSchema.index({ user: 1, status: 1 });
ReservationSchema.index({ room: 1, status: 1 });
ReservationSchema.index({ user: 1, room: 1, bedNumber: 1 });

// 중복 예약 방지: 활성 상태의 예약은 사용자당 하나만
ReservationSchema.index(
  { user: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

// 침대 중복 배정 방지: 활성 상태의 예약에서 같은 방의 같은 침대는 하나만
ReservationSchema.index(
  { room: 1, bedNumber: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

// 예약 취소 메서드
ReservationSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  return this.save();
};

// 체크인 메서드
ReservationSchema.methods.checkIn = function() {
  if (this.status !== 'active') {
    throw new Error('활성 상태의 예약만 체크인할 수 있습니다');
  }
  
  this.actualCheckIn = new Date();
  return this.save();
};

// 체크아웃 메서드
ReservationSchema.methods.checkOut = function() {
  if (!this.actualCheckIn) {
    throw new Error('체크인 후 체크아웃할 수 있습니다');
  }
  
  this.actualCheckOut = new Date();
  return this.save();
};

// 가상 필드: 예약 기간 (일 단위)
ReservationSchema.virtual('duration').get(function() {
  if (!this.checkInDate || !this.checkOutDate) {
    return null;
  }
  
  const diffTime = Math.abs(this.checkOutDate - this.checkInDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// 가상 필드: 예약 상태 설명
ReservationSchema.virtual('statusDescription').get(function() {
  const statusMap = {
    'active': '활성',
    'cancelled': '취소됨',
    'expired': '만료됨'
  };
  return statusMap[this.status] || this.status;
});

// JSON으로 변환 시 가상 필드 포함
ReservationSchema.set('toJSON', { virtuals: true });
ReservationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reservation', ReservationSchema); 