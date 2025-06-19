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

const migrateGuardianRelationship = async () => {
  try {
    console.log('보호자 관계 마이그레이션 시작...');
    
    // guardianRelationship이 없는 사용자들 찾기
    const usersToUpdate = await User.find({
      $or: [
        { guardianRelationship: { $exists: false } },
        { guardianRelationship: null },
        { guardianRelationship: '' }
      ]
    });

    console.log(`업데이트할 사용자 수: ${usersToUpdate.length}`);

    if (usersToUpdate.length === 0) {
      console.log('업데이트할 사용자가 없습니다.');
      return;
    }

    // 기본값으로 '부모' 설정
    const result = await User.updateMany(
      {
        $or: [
          { guardianRelationship: { $exists: false } },
          { guardianRelationship: null },
          { guardianRelationship: '' }
        ]
      },
      {
        $set: {
          guardianRelationship: '부모',
          retreatConsent: true // 기존 사용자들은 자동으로 동의한 것으로 처리
        }
      }
    );

    console.log(`${result.modifiedCount}명의 사용자 데이터가 업데이트되었습니다.`);
    
    // 비상연락처 필드 제거
    const removeEmergencyResult = await User.updateMany(
      { emergencyContact: { $exists: true } },
      { $unset: { emergencyContact: "" } }
    );

    console.log(`${removeEmergencyResult.modifiedCount}명의 사용자에서 비상연락처 필드가 제거되었습니다.`);

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
  await migrateGuardianRelationship();
  await mongoose.connection.close();
  console.log('연결 종료');
  process.exit(0);
};

// 스크립트 직접 실행 시
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateGuardianRelationship }; 