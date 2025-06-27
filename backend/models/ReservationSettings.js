const mongoose = require('mongoose');

const reservationSettingsSchema = new mongoose.Schema({
  openDateTime: {
    type: Date,
    required: true,
    default: new Date()
  },
  isReservationOpen: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    default: '방 예약 오픈 설정'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 예약 설정은 하나만 존재해야 하므로 인덱스 설정
reservationSettingsSchema.index({ _id: 1 }, { unique: true });

// 현재 시간이 오픈 시간을 지났는지 확인하는 메서드
reservationSettingsSchema.methods.isOpenNow = function() {
  const now = new Date();
  
  // 수동으로 오픈했거나, 설정된 시간이 지났으면 오픈
  const timeHasPassed = now >= this.openDateTime;
  const isOpen = this.isReservationOpen || timeHasPassed;
  
  console.log('🕐 예약 오픈 확인:', {
    현재시간: now.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}),
    오픈시간: this.openDateTime.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}),
    수동오픈상태: this.isReservationOpen,
    시간경과여부: timeHasPassed,
    최종오픈여부: isOpen
  });
  
  return isOpen;
};

// 오픈까지 남은 시간을 반환하는 메서드
reservationSettingsSchema.methods.getTimeUntilOpen = function() {
  const now = new Date();
  
  if (now >= this.openDateTime) {
    return 0;
  }
  return this.openDateTime.getTime() - now.getTime();
};

// 스태틱 메서드: 현재 예약 설정 가져오기
reservationSettingsSchema.statics.getCurrentSettings = async function() {
  let settings = await this.findOne();
  
  // 설정이 없으면 기본 설정 생성
  if (!settings) {
    // 기본 관리자 계정 찾기
    const User = mongoose.model('User');
    const admin = await User.findOne({ adminAccess: true });
    
    if (admin) {
      settings = new this({
        openDateTime: new Date(),
        isReservationOpen: false,
        createdBy: admin._id
      });
      await settings.save();
    }
  }
  
  return settings;
};

// 스태틱 메서드: 예약 설정 업데이트
reservationSettingsSchema.statics.updateSettings = async function(openDateTime, isReservationOpen, updatedBy, description) {
  let settings = await this.getCurrentSettings();
  
  if (settings) {
    settings.openDateTime = openDateTime;
    settings.isReservationOpen = isReservationOpen;
    settings.updatedBy = updatedBy;
    if (description) {
      settings.description = description;
    }
    await settings.save();
  }
  
  return settings;
};

module.exports = mongoose.model('ReservationSettings', reservationSettingsSchema); 