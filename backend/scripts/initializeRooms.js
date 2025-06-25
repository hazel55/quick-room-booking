const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Room = require('../models/Room');

dotenv.config();

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/room-assignment', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const initializeRooms = async () => {
  try {
    console.log('방 초기화 시작...');
    
    // 기존 방 데이터 삭제
    await Room.deleteMany({});
    console.log('기존 방 데이터 삭제 완료');
    
    const rooms = [];
    
    // 2층: 2인실 5개 (201-205)
    for (let i = 1; i <= 5; i++) {
      rooms.push({
        roomNumber: `20${i}`,
        floor: 2,
        capacity: 2,
        gender: i <= 2 ? 'M' : 'F', // 201-202: 남자, 203-205: 여자
        amenities: ['에어컨', '난방', '개별화장실', '책상', '옷장', 'WiFi'],
        description: `2층 ${i <= 2 ? '남성' : '여성'}용 2인실`
      });
    }
    
    // 3층: 3인실 12개 (301-312)
    for (let i = 1; i <= 12; i++) {
      rooms.push({
        roomNumber: `30${i.toString().padStart(2, '0')}`,
        floor: 3,
        capacity: 3,
        gender: i <= 6 ? 'M' : 'F', // 301-306: 남자, 307-312: 여자
        amenities: ['에어컨', '난방', '공용화장실', '책상', '옷장', 'WiFi'],
        description: `3층 ${i <= 6 ? '남성' : '여성'}용 3인실`
      });
    }
    
    // 4층: 3인실 12개 (401-412)
    for (let i = 1; i <= 12; i++) {
      rooms.push({
        roomNumber: `40${i.toString().padStart(2, '0')}`,
        floor: 4,
        capacity: 3,
        gender: i <= 6 ? 'M' : 'F', // 401-406: 남자, 407-412: 여자
        amenities: ['에어컨', '난방', '공용화장실', '책상', '옷장', 'WiFi'],
        description: `4층 ${i <= 6 ? '남성' : '여성'}용 3인실`
      });
    }
    
    // 5층: 4인실 10개 (501-510)
    for (let i = 1; i <= 10; i++) {
      rooms.push({
        roomNumber: `50${i}`,
        floor: 5,
        capacity: 4,
        gender: i <= 5 ? 'M' : 'F', // 501-505: 남자, 506-510: 여자
        amenities: ['에어컨', '난방', '공용화장실', '냉장고', '책상', '옷장', 'WiFi'],
        description: `5층 ${i <= 5 ? '남성' : '여성'}용 4인실`
      });
    }
    
    // 6층: 10인실 4개 (601-604)
    for (let i = 1; i <= 4; i++) {
      rooms.push({
        roomNumber: `60${i}`,
        floor: 6,
        capacity: 10,
        gender: i <= 2 ? 'M' : 'F', // 601-602: 남자, 603-604: 여자
        amenities: ['에어컨', '난방', '공용화장실', '냉장고', '책상', '옷장', 'WiFi'],
        description: `6층 ${i <= 2 ? '남성' : '여성'}용 10인실 (대형 도미토리)`
      });
    }
    
    // 영문자가 포함된 방 번호 예시 추가 (데모용)
    rooms.push({
      roomNumber: 'A101',
      floor: 3,
      capacity: 2,
      gender: 'M',
      amenities: ['에어컨', '난방', '개별화장실', '책상', '옷장', 'WiFi'],
      description: '특별실 A101'
    });
    
    rooms.push({
      roomNumber: 'VIP-01',
      floor: 4,
      capacity: 1,
      gender: 'F',
      amenities: ['에어컨', '난방', '개별화장실', '냉장고', '책상', '옷장', 'WiFi'],
      description: 'VIP 1인실'
    });
    
    // 20명 대형 도미토리 예시 추가
    rooms.push({
      roomNumber: 'DORM-A',
      floor: 5,
      capacity: 20,
      gender: 'M',
      amenities: ['에어컨', '난방', '공용화장실', '냉장고', '책상', '옷장', 'WiFi'],
      description: '대형 도미토리 A (20인실)'
    });
    
    rooms.push({
      roomNumber: 'DORM-B',
      floor: 5,
      capacity: 20,
      gender: 'F',
      amenities: ['에어컨', '난방', '공용화장실', '냉장고', '책상', '옷장', 'WiFi'],
      description: '대형 도미토리 B (20인실)'
    });
    
    // 방 데이터 일괄 삽입
    const createdRooms = await Room.insertMany(rooms);
    
    console.log(`총 ${createdRooms.length}개의 방이 생성되었습니다:`);
    
    // 층별, 타입별 통계
    const stats = {};
    createdRooms.forEach(room => {
      const key = `${room.floor}층_${room.capacity}인실_${room.gender}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    
    console.log('\n=== 방 구성 통계 ===');
    Object.entries(stats).forEach(([key, count]) => {
      console.log(`${key}: ${count}개`);
    });
    
    // 총 수용 인원 계산
    const totalCapacity = createdRooms.reduce((sum, room) => sum + room.capacity, 0);
    console.log(`\n총 수용 가능 인원: ${totalCapacity}명`);
    
    console.log('\n방 초기화 완료!');
    
  } catch (error) {
    console.error('방 초기화 중 오류 발생:', error);
  } finally {
    mongoose.disconnect();
  }
};

// 실행
initializeRooms(); 