const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');

// MongoDB 연결
mongoose.connect('mongodb://localhost:27017/room-assignment', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateGenderData() {
  try {
    console.log('성별 데이터 업데이트 시작...');

    // 1. 사용자 성별 데이터 업데이트
    console.log('\n1. 사용자 성별 데이터 업데이트 중...');
    
    // 남자/남성 -> M
    const maleUpdate = await User.updateMany(
      { gender: { $in: ['남자', '남성'] } },
      { $set: { gender: 'M' } }
    );
    console.log(`남성 사용자 업데이트: ${maleUpdate.modifiedCount}명`);

    // 여자/여성 -> F
    const femaleUpdate = await User.updateMany(
      { gender: { $in: ['여자', '여성'] } },
      { $set: { gender: 'F' } }
    );
    console.log(`여성 사용자 업데이트: ${femaleUpdate.modifiedCount}명`);

    // 성별이 비어있거나 null인 경우 -> M
    const emptyGenderUpdate = await User.updateMany(
      { $or: [{ gender: null }, { gender: '' }, { gender: { $exists: false } }] },
      { $set: { gender: 'M' } }
    );
    console.log(`성별 미설정 사용자 -> 남성으로 업데이트: ${emptyGenderUpdate.modifiedCount}명`);

    // 2. 방 성별 데이터 업데이트
    console.log('\n2. 방 성별 데이터 업데이트 중...');
    
    // 남자 -> M
    const maleRoomUpdate = await Room.updateMany(
      { gender: '남자' },
      { $set: { gender: 'M' } }
    );
    console.log(`남성용 방 업데이트: ${maleRoomUpdate.modifiedCount}개`);

    // 여자 -> F
    const femaleRoomUpdate = await Room.updateMany(
      { gender: '여자' },
      { $set: { gender: 'F' } }
    );
    console.log(`여성용 방 업데이트: ${femaleRoomUpdate.modifiedCount}개`);

    // 3. 업데이트 결과 확인
    console.log('\n3. 업데이트 결과 확인...');
    
    const userGenderStats = await User.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('사용자 성별 분포:', userGenderStats);

    const roomGenderStats = await Room.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('방 성별 분포:', roomGenderStats);

    console.log('\n✅ 성별 데이터 업데이트 완료!');

  } catch (error) {
    console.error('❌ 업데이트 중 오류 발생:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 스크립트 실행
updateGenderData(); 