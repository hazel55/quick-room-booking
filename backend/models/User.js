const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encryptSSN, validateSSN, decryptSSN } = require('../utils/encryption');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '이름을 입력해주세요'],
    trim: true,
    maxlength: [50, '이름은 50자를 초과할 수 없습니다']
  },
  email: {
    type: String,
    required: [true, '이메일을 입력해주세요'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      '올바른 이메일 형식을 입력해주세요'
    ]
  },
  password: {
    type: String,
    required: [true, '비밀번호를 입력해주세요'],
    minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다'],
    select: false
  },
  phone: {
    type: String,
    required: [true, '전화번호를 입력해주세요'],
    validate: {
      validator: function(value) {
        // 숫자만 남기기
        const cleanPhone = value.replace(/[^0-9]/g, '');
        // 11자리 숫자이고 01로 시작하는지 확인
        return /^01[0-9]{9}$/.test(cleanPhone);
      },
      message: '올바른 전화번호 형식을 입력해주세요 (01로 시작하는 11자리 숫자)'
    }
  },
  ssn: {
    type: String,
    required: [true, '주민등록번호를 입력해주세요'],
    unique: true,
    validate: {
      validator: function(value) {
        // 암호화된 값이 아닌 경우에만 유효성 검사
        if (!this.isNew && this.isModified('ssn')) {
          return true; // 이미 저장된 암호화된 값
        }
        return validateSSN(value);
      },
      message: '올바른 주민등록번호를 입력해주세요 (13자리)'
    }
  },
  privacyConsent: {
    type: Boolean,
    required: [true, '개인정보 수집 및 이용에 동의해주세요'],
    validate: {
      validator: function(value) {
        return value === true;
      },
      message: '개인정보 수집 및 이용에 동의해주세요'
    }
  },
  grade: {
    type: String,
    required: [true, '학년을 선택해주세요'],
    enum: ['1', '2', '3', 'T', 'A'] // 1학년, 2학년, 3학년, 선생님, 관리자
  },
  classNumber: {
    type: Number,
    required: [
      function() { return this.grade !== 'T' && this.grade !== 'A'; },
      '반을 선택해주세요'
    ],
    min: [1, '반은 1 이상이어야 합니다.'],
    max: [10, '반은 10 이하이어야 합니다.']
  },
  gender: {
    type: String,
    required: [true, '성별을 선택해주세요'],
    enum: ['M', 'F']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  adminAccess: {
    type: Boolean,
    default: false
  },
  adminPermissions: {
    canManageRooms: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canExportData: { type: Boolean, default: false },
    canInitializeData: { type: Boolean, default: false }
  },
  roomAssignment: {
    roomNumber: {
      type: String,
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'checked-in', 'checked-out'],
      default: 'pending'
    }
  },
  guardianPhone: {
    type: String,
    required: [true, '보호자 전화번호를 입력해주세요'],
    validate: {
      validator: function(value) {
        // 숫자만 남기기
        const cleanPhone = value.replace(/[^0-9]/g, '');
        // 11자리 숫자이고 01로 시작하는지 확인
        return /^01[0-9]{9}$/.test(cleanPhone);
      },
      message: '올바른 보호자 전화번호 형식을 입력해주세요 (01로 시작하는 11자리 숫자)'
    }
  },
  guardianRelationship: {
    type: String,
    required: [true, '보호자와의 관계를 선택해주세요'],
    enum: ['부', '모', '조부', '조모', '외조부', '외조모', '형제', '자매', '부모', '형제/자매', '친척', '친구', '기타'],
    trim: true
  },
  retreatConsent: {
    type: Boolean,
    required: [true, '수련회 참가 서약서에 동의해주세요'],
    validate: {
      validator: function(value) {
        return value === true;
      },
      message: '수련회 참가 서약서에 동의해주세요'
    }
  },
  specialRequests: {
    type: String,
    maxlength: [500, '특별 요청사항은 500자를 초과할 수 없습니다']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 비밀번호 암호화 및 주민등록번호 암호화
UserSchema.pre('save', async function(next) {
  // 전화번호 전처리 (숫자만 저장)
  if (this.isModified('phone') && this.phone) {
    this.phone = this.phone.replace(/[^0-9]/g, '');
  }

  // 보호자 전화번호 전처리 (숫자만 저장)
  if (this.isModified('guardianPhone') && this.guardianPhone) {
    this.guardianPhone = this.guardianPhone.replace(/[^0-9]/g, '');
  }

  // 비밀번호 암호화
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // 주민등록번호 암호화 (신규 생성이거나 주민등록번호가 변경된 경우)
  if (this.isModified('ssn') && this.ssn) {
    try {
      // 이미 암호화된 값인지 확인 (복호화 시도)
      if (this.ssn.length > 13) {
        // 이미 암호화된 것으로 판단
        next();
        return;
      }
      
      // 유효성 검증
      if (!validateSSN(this.ssn)) {
        throw new Error('올바른 주민등록번호를 입력해주세요');
      }
      
      // 암호화
      this.ssn = encryptSSN(this.ssn);
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// 비밀번호 검증 메서드
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 가상 필드: 생년월일 (주민등록번호에서 추출)
UserSchema.virtual('birthDate').get(function() {
  if (!this.ssn) return null;
  
  try {
    const decryptedSSN = decryptSSN(this.ssn);
    if (!decryptedSSN || decryptedSSN.length !== 13) return null;
    
    const birthDate = decryptedSSN.substring(0, 6);
    // YYMMDD 형식을 YY-MM-DD로 변환
    return `${birthDate.substring(0, 2)}-${birthDate.substring(2, 4)}-${birthDate.substring(4, 6)}`;
  } catch (error) {
    console.error('주민등록번호 복호화 실패:', error);
    return null;
  }
});

// 가상 필드: 마스킹된 주민등록번호 (표시용)
UserSchema.virtual('maskedSSN').get(function() {
  if (!this.ssn) return '******-*******';
  
  try {
    const decryptedSSN = decryptSSN(this.ssn);
    if (!decryptedSSN || decryptedSSN.length !== 13) return '******-*******';
    
    return `${decryptedSSN.substring(0, 6)}-${decryptedSSN.substring(6, 7)}******`;
  } catch (error) {
    return '******-*******';
  }
});

// 가상 필드: 복호화된 주민등록번호 (관리자용)
UserSchema.virtual('decryptedSSN').get(function() {
  if (!this.ssn) return null;
  
  try {
    const decryptedSSN = decryptSSN(this.ssn);
    if (!decryptedSSN || decryptedSSN.length !== 13) return null;
    
    return `${decryptedSSN.substring(0, 6)}-${decryptedSSN.substring(6, 13)}`;
  } catch (error) {
    return null;
  }
});

// 가상 필드: 포맷팅된 전화번호 (표시용)
UserSchema.virtual('formattedPhone').get(function() {
  if (!this.phone) return '';
  
  // 11자리 숫자를 000-0000-0000 형식으로 변환
  if (this.phone.length === 11) {
    return `${this.phone.substring(0, 3)}-${this.phone.substring(3, 7)}-${this.phone.substring(7, 11)}`;
  }
  
  return this.phone;
});

// 가상 필드: 포맷팅된 보호자 전화번호 (표시용)
UserSchema.virtual('formattedGuardianPhone').get(function() {
  if (!this.guardianPhone) return '';
  
  // 11자리 숫자를 000-0000-0000 형식으로 변환
  if (this.guardianPhone.length === 11) {
    return `${this.guardianPhone.substring(0, 3)}-${this.guardianPhone.substring(3, 7)}-${this.guardianPhone.substring(7, 11)}`;
  }
  
  return this.guardianPhone;
});

// JSON으로 변환 시 가상 필드 포함하되 민감한 정보는 제외
UserSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // 민감한 정보 제거
    delete ret.ssn;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema); 