const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, '방 번호를 입력해주세요'],
    unique: true
  },
  floor: {
    type: Number,
    required: [true, '층수를 입력해주세요'],
    min: [1, '층수는 1 이상이어야 합니다'],
    max: [10, '층수는 10 이하여야 합니다']
  },
  capacity: {
    type: Number,
    required: [true, '수용 인원을 입력해주세요'],
    enum: [2, 3, 4, 10],
    validate: {
      validator: function(value) {
        return [2, 3, 4, 10].includes(value);
      },
      message: '수용 인원은 2명, 3명, 4명, 10명 중 하나여야 합니다'
    }
  },
  gender: {
    type: String,
    required: [true, '성별을 선택해주세요'],
    enum: ['M', 'F', '공용'],
    default: '공용'
  },
  occupants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bedNumber: {
      type: Number,
      required: true,
      min: 1
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  amenities: [{
    type: String,
    enum: ['에어컨', '난방', '개별화장실', '공용화장실', '냉장고', '책상', '옷장', 'WiFi']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: [500, '설명은 500자를 초과할 수 없습니다']
  }
}, {
  timestamps: true
});

// 가상 필드: 현재 점유율
RoomSchema.virtual('occupancyRate').get(function() {
  if (!this.occupants || !this.capacity) return 0;
  return this.occupants.length / this.capacity;
});

// 가상 필드: 사용 가능한 침대 수
RoomSchema.virtual('availableBeds').get(function() {
  if (!this.occupants || !this.capacity) return this.capacity || 0;
  return this.capacity - this.occupants.length;
});

// 가상 필드: 침대별 점유 상태
RoomSchema.virtual('bedStatus').get(function() {
  const beds = [];
  const capacity = this.capacity || 0;
  const occupants = this.occupants || [];
  
  for (let i = 1; i <= capacity; i++) {
    const occupant = occupants.find(occ => occ.bedNumber === i);
    beds.push({
      bedNumber: i,
      isOccupied: !!occupant,
      occupant: occupant ? occupant.user : null,
      assignedAt: occupant ? occupant.assignedAt : null
    });
  }
  return beds;
});

// 방에 사용자 배정하는 메서드
RoomSchema.methods.assignUser = function(userId, bedNumber) {
  // 이미 점유된 침대인지 확인
  const existingOccupant = this.occupants.find(occ => occ.bedNumber === bedNumber);
  if (existingOccupant) {
    throw new Error('이미 점유된 침대입니다');
  }
  
  // 방이 꽉 찼는지 확인
  if (this.occupants.length >= this.capacity) {
    throw new Error('방이 꽉 찼습니다');
  }
  
  // 사용자 배정
  this.occupants.push({
    user: userId,
    bedNumber: bedNumber,
    assignedAt: new Date()
  });
  
  return this.save();
};

// 방에서 사용자 제거하는 메서드
RoomSchema.methods.removeUser = function(userId) {
  const occupantIndex = this.occupants.findIndex(occ => 
    occ.user.toString() === userId.toString()
  );
  
  if (occupantIndex === -1) {
    throw new Error('해당 사용자가 이 방에 배정되어 있지 않습니다');
  }
  
  this.occupants.splice(occupantIndex, 1);
  return this.save();
};

// 사용 가능한 침대 번호들 가져오는 메서드
RoomSchema.methods.getAvailableBedNumbers = function() {
  const occupiedBeds = this.occupants.map(occ => occ.bedNumber);
  const availableBeds = [];
  
  for (let i = 1; i <= this.capacity; i++) {
    if (!occupiedBeds.includes(i)) {
      availableBeds.push(i);
    }
  }
  
  return availableBeds;
};

// JSON으로 변환 시 가상 필드 포함
RoomSchema.set('toJSON', { virtuals: true });
RoomSchema.set('toObject', { virtuals: true });

// 방 번호 생성 메서드
RoomSchema.statics.generateRoomNumber = function(floor, roomType, sequence) {
  return `${floor}${roomType}${sequence.toString().padStart(2, '0')}`;
};

// 기본 방 정보 초기화 메서드
RoomSchema.statics.initializeRooms = async function() {
  const existingRooms = await this.find({});
  if (existingRooms.length > 0) {
    return; // 이미 방이 존재하면 초기화하지 않음
  }

  const rooms = [];
  
  // 1층: 2인실 5개 (공용)
  for (let i = 1; i <= 5; i++) {
    rooms.push({
      roomNumber: `1-2-${i.toString().padStart(2, '0')}`,
      floor: 1,
      capacity: 2,
      gender: '공용'
    });
  }

  // 2층: 여자방 (3인실 12개, 4인실 5개, 10인실 2개)
  for (let i = 1; i <= 12; i++) {
    rooms.push({
      roomNumber: `2-3-${i.toString().padStart(2, '0')}`,
      floor: 2,
      capacity: 3,
      gender: '여자'
    });
  }
  for (let i = 1; i <= 5; i++) {
    rooms.push({
      roomNumber: `2-4-${i.toString().padStart(2, '0')}`,
      floor: 2,
      capacity: 4,
      gender: '여자'
    });
  }
  for (let i = 1; i <= 2; i++) {
    rooms.push({
      roomNumber: `2-10-${i.toString().padStart(2, '0')}`,
      floor: 2,
      capacity: 10,
      gender: '여자'
    });
  }

  // 3층: 남자방 (3인실 12개, 4인실 5개, 10인실 2개)
  for (let i = 1; i <= 12; i++) {
    rooms.push({
      roomNumber: `3-3-${i.toString().padStart(2, '0')}`,
      floor: 3,
      capacity: 3,
      gender: '남자'
    });
  }
  for (let i = 1; i <= 5; i++) {
    rooms.push({
      roomNumber: `3-4-${i.toString().padStart(2, '0')}`,
      floor: 3,
      capacity: 4,
      gender: '남자'
    });
  }
  for (let i = 1; i <= 2; i++) {
    rooms.push({
      roomNumber: `3-10-${i.toString().padStart(2, '0')}`,
      floor: 3,
      capacity: 10,
      gender: '남자'
    });
  }

  await this.insertMany(rooms);
  console.log('기본 방 정보가 초기화되었습니다.');
};

module.exports = mongoose.model('Room', RoomSchema); 