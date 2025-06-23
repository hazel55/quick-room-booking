const User = require('../models/User');
const { validateSSN } = require('./encryption');

/**
 * 서버 시작 시 관리자 계정을 자동으로 생성하는 함수
 */
async function initializeAdminUser() {
  try {
    console.log('🔧 관리자 계정 초기화 시작...');

    const adminEmail = 'admin_ea@admin.com';
    
    // 기존 관리자 계정 확인
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('✅ 관리자 계정이 이미 존재합니다:', adminEmail);
      
      // 기존 계정의 권한 확인 및 업데이트
      let needsUpdate = false;
      
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        needsUpdate = true;
      }
      
      if (!existingAdmin.adminAccess) {
        existingAdmin.adminAccess = true;
        needsUpdate = true;
      }
      
      if (!existingAdmin.isActive) {
        existingAdmin.isActive = true;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await existingAdmin.save();
        console.log('🔄 기존 관리자 계정 권한이 업데이트되었습니다.');
      }
      
      return existingAdmin;
    }

    // 새 관리자 계정 생성
    console.log('🆕 새로운 관리자 계정을 생성합니다...');
    
    // 주민등록번호 검증 및 대체값 설정
    let ssn = '9909182583947';
    if (!validateSSN(ssn)) {
      console.log('⚠️  기본 주민등록번호가 유효하지 않습니다. 대체값을 사용합니다.');
      ssn = '9901011234567'; // 유효한 형태의 대체값
    }

    // 관리자 계정 데이터
    const adminData = {
      name: '관리자',
      email: adminEmail,
      password: 'admin1234!',
      phone: '01012341234',
      guardianPhone: '01098769876',
      guardianRelationship: '기타',
      grade: 'A',
      gender: 'F',
      ssn: ssn,
      role: 'admin',
      adminAccess: true,
      isActive: true,
      privacyConsent: true,
      retreatConsent: true,
      specialRequests: '시스템 자동 생성 관리자 계정'
    };

    // 관리자 계정 생성
    const adminUser = await User.create(adminData);
    
    console.log('✅ 관리자 계정이 성공적으로 생성되었습니다!');
    console.log('📧 이메일:', adminUser.email);
    console.log('🔐 비밀번호: admin1234!');
    console.log('👤 이름:', adminUser.name);
    console.log('🎓 등급:', adminUser.grade);
    console.log('🏷️ 역할:', adminUser.role);
    console.log('🔑 관리자 권한:', adminUser.adminAccess);
    console.log('✅ 계정 활성화:', adminUser.isActive);

    return adminUser;

  } catch (error) {
    console.error('❌ 관리자 계정 초기화 실패:', error.message);
    
    // 이메일 중복 에러 처리
    if (error.code === 11000 && error.keyPattern?.email) {
      console.log('📧 이메일이 이미 존재하지만 다른 오류로 인해 찾을 수 없었습니다.');
      return null;
    }
    
    // 주민등록번호 관련 에러 처리
    if (error.message.includes('주민등록번호')) {
      console.log('🔄 주민등록번호 문제로 재시도합니다...');
      try {
        // 더 간단한 유효한 주민등록번호로 재시도
        const retryData = {
          name: '관리자',
          email: adminEmail,
          password: 'admin1234!',
          phone: '01012341234',
          guardianPhone: '01098769876',
          guardianRelationship: '기타',
          grade: 'A',
          gender: 'F',
          ssn: '9901011234567', // 확실히 유효한 형태
          role: 'admin',
          adminAccess: true,
          isActive: true,
          privacyConsent: true,
          retreatConsent: true,
          specialRequests: '시스템 자동 생성 관리자 계정 (재시도)'
        };
        
        const retryAdmin = await User.create(retryData);
        console.log('✅ 재시도로 관리자 계정이 생성되었습니다!');
        return retryAdmin;
        
      } catch (retryError) {
        console.error('❌ 재시도도 실패했습니다:', retryError.message);
        throw retryError;
      }
    }
    
    throw error;
  }
}

/**
 * Grade A 사용자들을 관리자 권한으로 자동 승격
 */
async function promoteGradeAUsers() {
  try {
    console.log('🔍 Grade A 사용자들의 권한을 확인합니다...');
    
    // Grade A이면서 admin 권한이 없는 사용자들 찾기
    const gradeAUsers = await User.find({
      grade: 'A',
      $or: [
        { role: { $ne: 'admin' } },
        { adminAccess: { $ne: true } }
      ]
    });
    
    if (gradeAUsers.length === 0) {
      console.log('✅ 모든 Grade A 사용자가 이미 관리자 권한을 가지고 있습니다.');
      return;
    }
    
    console.log(`🔧 ${gradeAUsers.length}명의 Grade A 사용자를 관리자로 승격합니다...`);
    
    for (const user of gradeAUsers) {
      user.role = 'admin';
      user.adminAccess = true;
      user.isActive = true;
      
      await user.save();
      
      console.log(`✅ ${user.name} (${user.email}) - 관리자 권한 부여 완료`);
    }
    
    console.log('🎉 모든 Grade A 사용자가 관리자로 승격되었습니다!');
    
  } catch (error) {
    console.error('❌ Grade A 사용자 승격 실패:', error.message);
    throw error;
  }
}

/**
 * 전체 관리자 초기화 프로세스
 */
async function initializeAdminSystem() {
  console.log('🚀 관리자 시스템 초기화를 시작합니다...\n');
  
  try {
    // 1. 기본 관리자 계정 생성/확인
    await initializeAdminUser();
    
    // 2. Grade A 사용자들 관리자 권한 부여
    await promoteGradeAUsers();
    
    console.log('\n🎉 관리자 시스템 초기화가 완료되었습니다!');
    console.log('🌐 관리자 로그인 정보:');
    console.log('   이메일: admin_ea@admin.com');
    console.log('   비밀번호: admin1234!');
    
  } catch (error) {
    console.error('\n❌ 관리자 시스템 초기화 실패:', error.message);
    // 초기화 실패해도 서버는 계속 실행되도록 함
  }
}

module.exports = {
  initializeAdminUser,
  promoteGradeAUsers,
  initializeAdminSystem
}; 