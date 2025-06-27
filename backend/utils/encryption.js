const CryptoJS = require('crypto-js');

// 암호화 키 (환경변수에서 가져오기)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-ssn-2024';

/**
 * 주민등록번호 암호화 (고정 IV 사용하여 동일 입력은 동일 출력)
 * @param {string} ssn - 주민등록번호 (13자리)
 * @returns {string} 암호화된 주민등록번호
 */
const encryptSSN = (ssn) => {
  if (!ssn || ssn.length !== 13) {
    throw new Error('올바른 주민등록번호를 입력해주세요 (13자리)');
  }
  
  // 숫자만 남기기
  const cleanSSN = ssn.replace(/[^0-9]/g, '');
  if (cleanSSN.length !== 13) {
    throw new Error('주민등록번호는 13자리 숫자여야 합니다');
  }
  
  // 고정 IV 사용하여 동일한 주민등록번호는 항상 동일한 암호문 생성
  const iv = CryptoJS.enc.Utf8.parse('1234567890123456'); // 16바이트 고정 IV
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)); // 32바이트 키
  
  const encrypted = CryptoJS.AES.encrypt(cleanSSN, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
  
  return encrypted;
};

/**
 * 주민등록번호 복호화
 * @param {string} encryptedSSN - 암호화된 주민등록번호
 * @returns {string} 복호화된 주민등록번호
 */
const decryptSSN = (encryptedSSN) => {
  if (!encryptedSSN) {
    throw new Error('암호화된 주민등록번호가 없습니다');
  }
  
  try {
    // 암호화할 때와 동일한 IV와 키 사용
    const iv = CryptoJS.enc.Utf8.parse('1234567890123456'); // 16바이트 고정 IV
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)); // 32바이트 키
    
    const bytes = CryptoJS.AES.decrypt(encryptedSSN, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted || decrypted.length !== 13) {
      throw new Error('복호화에 실패했습니다');
    }
    
    return decrypted;
  } catch (error) {
    throw new Error('복호화 중 오류가 발생했습니다');
  }
};

/**
 * 주민등록번호 유효성 검증
 * @param {string} ssn - 주민등록번호 (13자리)
 * @returns {boolean} 유효성 여부
 */
const validateSSN = (ssn) => {
  if (!ssn || typeof ssn !== 'string') {
    return false;
  }
  
  // 숫자만 남기기
  const cleanSSN = ssn.replace(/[^0-9]/g, '');
  
  // 13자리 숫자인지 확인
  if (cleanSSN.length !== 13) {
    return false;
  }
  
  // 기본적인 형식 검증 (더 간단한 검증)
  // 생년월일 부분 (처음 6자리)
  const birthDate = cleanSSN.substring(0, 6);
  const year = parseInt(birthDate.substring(0, 2));
  const month = parseInt(birthDate.substring(2, 4));
  const day = parseInt(birthDate.substring(4, 6));
  
  // 월 검증 (1-12)
  if (month < 1 || month > 12) {
    return false;
  }
  
  // 일 검증 (1-31)
  if (day < 1 || day > 31) {
    return false;
  }
  
  // 성별 확인 (7번째 자리: 1,2,3,4만 유효)
  const genderCode = parseInt(cleanSSN[6]);
  if (![1, 2, 3, 4].includes(genderCode)) {
    return false;
  }
  
  return true; // 간단한 검증만 수행
};

/**
 * 주민등록번호에서 성별 추출
 * @param {string} ssn - 주민등록번호 (13자리)
 * @returns {string|null} 성별 ('M' 또는 'F', 오류 시 null)
 */
const getGenderFromSSN = (ssn) => {
  if (!ssn || typeof ssn !== 'string') {
    return null;
  }
  
  // 숫자만 남기기
  const cleanSSN = ssn.replace(/[^0-9]/g, '');
  
  // 13자리 숫자인지 확인
  if (cleanSSN.length !== 13) {
    return null;
  }
  
  // 성별 코드 (7번째 자리)
  const genderCode = parseInt(cleanSSN[6]);
  
  if ([1, 3].includes(genderCode)) {
    return 'M'; // 남자
  } else if ([2, 4].includes(genderCode)) {
    return 'F'; // 여자
  }
  
  return null;
};

/**
 * 주민등록번호와 성별 일치 여부 검증
 * @param {string} ssn - 주민등록번호 (13자리)
 * @param {string} gender - 성별 ('M' 또는 'F')
 * @returns {boolean} 일치 여부
 */
const validateGenderWithSSN = (ssn, gender) => {
  const ssnGender = getGenderFromSSN(ssn);
  return ssnGender === gender;
};

/**
 * 주민등록번호 마스킹 (표시용)
 * @param {string} ssn - 주민등록번호 (13자리)
 * @returns {string} 마스킹된 주민등록번호 (예: 123456-1******)
 */
const maskSSN = (ssn) => {
  if (!ssn || ssn.length !== 13) {
    return '******-*******';
  }
  
  return `${ssn.substring(0, 6)}-${ssn.substring(6, 7)}******`;
};

module.exports = {
  encryptSSN,
  decryptSSN,
  validateSSN,
  maskSSN,
  getGenderFromSSN,
  validateGenderWithSSN
}; 