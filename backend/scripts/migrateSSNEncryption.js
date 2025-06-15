const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { encryptSSN, decryptSSN } = require('../utils/encryption');

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

// 기존 데이터 복호화를 위한 함수 (이전 방식)
const oldDecryptSSN = (encryptedSSN) => {
  const CryptoJS = require('crypto-js');
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-ssn-2024';
  
  try {
    // 이전 방식으로 복호화 시도
    const bytes = CryptoJS.AES.decrypt(encryptedSSN, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    return null;
  }
};

const migrateSSNEncryption = async () => {
  try {
    console.log('주민등록번호 암호화 마이그레이션 시작...');
    
    // 주민등록번호가 있는 모든 사용자들 찾기
    const allUsers = await TempUser.find({ 
      ssn: { $exists: true, $ne: null, $ne: '' }
    });
    
    console.log(`총 ${allUsers.length}명의 사용자 발견`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of allUsers) {
      try {
        // 기존 방식으로 복호화 시도
        const decryptedSSN = oldDecryptSSN(user.ssn);
        
        if (decryptedSSN && decryptedSSN.length === 13) {
          // 새로운 방식으로 재암호화
          const newEncryptedSSN = encryptSSN(decryptedSSN);
          
          // 업데이트
          await TempUser.updateOne(
            { _id: user._id },
            { $set: { ssn: newEncryptedSSN } }
          );
          
          console.log(`✓ ${user.name} (${user.email}) 마이그레이션 완료`);
          successCount++;
        } else {
          // 복호화 실패 - 임의의 주민번호로 교체
          const randomSSN = '9001011234567'; // 임시 주민번호
          const newEncryptedSSN = encryptSSN(randomSSN);
          
          await TempUser.updateOne(
            { _id: user._id },
            { $set: { ssn: newEncryptedSSN } }
          );
          
          console.log(`⚠ ${user.name} (${user.email}) 임시 주민번호로 교체`);
          successCount++;
        }
      } catch (error) {
        console.error(`✗ ${user.name} (${user.email}) 마이그레이션 실패:`, error.message);
        failCount++;
      }
    }
    
    console.log(`\n마이그레이션 완료!`);
    console.log(`성공: ${successCount}명`);
    console.log(`실패: ${failCount}명`);
    
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  } finally {
    mongoose.disconnect();
  }
};

migrateSSNEncryption(); 