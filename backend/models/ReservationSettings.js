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
  return this.isReservationOpen && now >= this.openDateTime;
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