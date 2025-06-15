const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { encryptSSN } = require('../utils/encryption');

dotenv.config();

// 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/room-assignment', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 임시 User 모델 (pre save 훅 없이)
const TempUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  phone: String,
  grade: String,
  gender: String,
  ssn: String,
  privacyConsent: Boolean,
  role: String,
  adminAccess: Boolean,
  roomAssignment: Object,
  emergencyContact: Object,
  specialRequests: String,
  isActive: Boolean
}, {
  timestamps: true
});

const TempUser = mongoose.model('TempUser', TempUserSchema, 'users');

// 임의의 유효한 주민등록번호 생성 함수
const generateRandomSSN = (index) => {
  const baseNumbers = [
    '9001011234567', '9002021234567', '9003031234567', '9004041234567', '9005051234567',
    '9101011234567', '9102021234567', '9103031234567', '9104041234567', '9105051234567',
    '9201011234567', '9202021234567', '9203031234567', '9204041234567', '9205051234567',
    '9301011234567', '9302021234567', '9303031234567', '9304041234567', '9305051234567',
    '9401011234567', '9402021234567', '9403031234567', '9404041234567', '9405051234567'
  ];
  
  return baseNumbers[index % baseNumbers.length];
};

const updateExistingUsers = async () => {
  try {
    console.log('기존 사용자 업데이트 시작...');
    
    // 주민등록번호가 없는 사용자들 찾기
    const usersWithoutSSN = await TempUser.find({ 
      $or: [
        { ssn: { $exists: false } },
        { ssn: null },
        { ssn: '' }
      ]
    });
    
    console.log(`주민등록번호가 없는 사용자 ${usersWithoutSSN.length}명 발견`);
    
    if (usersWithoutSSN.length === 0) {
      console.log('업데이트할 사용자가 없습니다.');
      return;
    }
    
    for (let i = 0; i < usersWithoutSSN.length; i++) {
      const user = usersWithoutSSN[i];
      const randomSSN = generateRandomSSN(i);
      const encryptedSSN = encryptSSN(randomSSN);
      
      // privacyConsent도 추가
      await TempUser.updateOne(
        { _id: user._id },
        { 
          $set: { 
            ssn: encryptedSSN,
            privacyConsent: true
          }
        }
      );
      
      console.log(`사용자 ${user.name} (${user.email}) 업데이트 완료`);
    }
    
    console.log('모든 사용자 업데이트 완료!');
    
  } catch (error) {
    console.error('업데이트 중 오류 발생:', error);
  } finally {
    mongoose.disconnect();
  }
};

updateExistingUsers(); 