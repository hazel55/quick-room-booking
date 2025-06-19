const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결됨');
  } catch (error) {
    console.error('MongoDB 연결 오류:', error);
    process.exit(1);
  }
};

const migrateClassNumber = async () => {
  try {
    console.log('반 정보 마이그레이션 시작...');
    
    // 학생이면서 classNumber 필드가 없는 사용자 찾기
    const usersToUpdate = await User.find({
      grade: { $in: ['1', '2', '3'] },
      $or: [
        { classNumber: { $exists: false } },
        { classNumber: null }
      ]
    });

    console.log(`업데이트할 학생 수: ${usersToUpdate.length}`);

    if (usersToUpdate.length === 0) {
      console.log('업데이트할 학생이 없습니다.');
      return;
    }

    // 기본값으로 1반 설정
    const result = await User.updateMany(
      {
        grade: { $in: ['1', '2', '3'] },
        $or: [
          { classNumber: { $exists: false } },
          { classNumber: null }
        ]
      },
      {
        $set: { classNumber: 1 }
      }
    );

    console.log(`${result.modifiedCount}명의 학생 데이터에 기본 반 정보가 추가되었습니다.`);
    
    console.log('마이그레이션 완료!');
    
  } catch (error) {
    console.error('마이그레이션 오류:', error);
  }
};

/**
 * 메인 실행 함수
 */
const main = async () => {
  await connectDB();
  await migrateClassNumber();
  await mongoose.connection.close();
  console.log('연결 종료');
  process.exit(0);
};

// 스크립트 직접 실행 시
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateClassNumber }; 