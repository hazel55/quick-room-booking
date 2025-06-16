import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    guardianPhone: '',
    grade: '',
    gender: '',
    ssn: '',
    privacyConsent: false,
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    specialRequests: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('emergency.')) {
      const field = name.split('.')[1];
      let processedValue = value;
      
      // 비상연락처 전화번호 포맷팅
      if (field === 'phone') {
        processedValue = formatPhone(value);
      }
      
      setFormData({
        ...formData,
        emergencyContact: {
          ...formData.emergencyContact,
          [field]: processedValue
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
    
    // 해당 필드의 에러 제거
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const formatSSN = (value) => {
    // 숫자만 남기기
    const numbers = value.replace(/[^0-9]/g, '');
    // 13자리로 제한
    const limited = numbers.substring(0, 13);
    // 6자리-7자리 형식으로 포맷팅
    if (limited.length > 6) {
      return `${limited.substring(0, 6)}-${limited.substring(6)}`;
    }
    return limited;
  };

  const formatPhone = (value) => {
    // 숫자만 남기기
    const numbers = value.replace(/[^0-9]/g, '');
    // 11자리로 제한
    const limited = numbers.substring(0, 11);
    // 000-0000-0000 형식으로 포맷팅
    if (limited.length > 7) {
      return `${limited.substring(0, 3)}-${limited.substring(3, 7)}-${limited.substring(7)}`;
    } else if (limited.length > 3) {
      return `${limited.substring(0, 3)}-${limited.substring(3)}`;
    }
    return limited;
  };

  const handleSSNChange = (e) => {
    const formatted = formatSSN(e.target.value);
    setFormData({
      ...formData,
      ssn: formatted
    });
    
    if (errors.ssn) {
      setErrors({
        ...errors,
        ssn: ''
      });
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData({
      ...formData,
      phone: formatted
    });
    
    if (errors.phone) {
      setErrors({
        ...errors,
        phone: ''
      });
    }
  };

  const handleGuardianPhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData({
      ...formData,
      guardianPhone: formatted
    });
    
    if (errors.guardianPhone) {
      setErrors({
        ...errors,
        guardianPhone: ''
      });
    }
  };

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
    
    // 기본적인 형식 검증 (백엔드와 동일한 검증)
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
    
    // 성별 확인 (7번째 자리: 1,2,3,4)
    const genderCode = parseInt(cleanSSN[6]);
    if (![1, 2, 3, 4].includes(genderCode)) {
      return false;
    }
    
    return true; // 간단한 검증만 수행 (백엔드와 동일)
  };

  const validateForm = () => {
    const newErrors = {};

    // 이름 검증
    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '이름은 2글자 이상이어야 합니다';
    }

    // 이메일 검증
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요';
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다';
    } else if (!/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다';
    }

    // 비밀번호 확인 검증
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    // 전화번호 검증
    if (!formData.phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요';
    } else {
      const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
      if (!/^01[0-9]{9}$/.test(cleanPhone)) {
        newErrors.phone = '올바른 전화번호 형식을 입력해주세요 (01로 시작하는 11자리 숫자)';
      }
    }

    // 보호자 전화번호 검증
    if (!formData.guardianPhone.trim()) {
      newErrors.guardianPhone = '보호자 전화번호를 입력해주세요';
    } else {
      const cleanGuardianPhone = formData.guardianPhone.replace(/[^0-9]/g, '');
      if (!/^01[0-9]{9}$/.test(cleanGuardianPhone)) {
        newErrors.guardianPhone = '올바른 보호자 전화번호 형식을 입력해주세요 (01로 시작하는 11자리 숫자)';
      }
    }

    // 주민등록번호 검증
    if (!formData.ssn.trim()) {
      newErrors.ssn = '주민등록번호를 입력해주세요';
    } else if (!validateSSN(formData.ssn)) {
      newErrors.ssn = '올바른 주민등록번호를 입력해주세요';
    }

    // 학년/성별 검증
    if (!formData.grade) newErrors.grade = '학년을 선택해주세요';
    if (!formData.gender) newErrors.gender = '성별을 선택해주세요';

    // 개인정보 동의 검증
    if (!formData.privacyConsent) {
      newErrors.privacyConsent = '개인정보 수집 및 이용에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstErrorElement = document.querySelector('.text-red-700');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    
    // 주민등록번호에서 하이픈 제거
    const cleanSSN = formData.ssn.replace(/[^0-9]/g, '');
    const { confirmPassword, ...registerData } = formData;
    registerData.ssn = cleanSSN;
    registerData.privacyConsent = 'true'; // 백엔드 validation을 위해 문자열로 전송

    const result = await register(registerData);

    if (result.success) {
      navigate('/dashboard');
    } else {
      if (result.errors) {
        const apiErrors = {};
        result.errors.forEach(error => {
          if (error.path) {
            apiErrors[error.path] = error.msg;
          }
        });
        setErrors(apiErrors);
      } else {
        setErrors({ general: result.message });
      }
      
      // 에러가 있는 첫 번째 필드로 스크롤
      setTimeout(() => {
        const firstErrorElement = document.querySelector('.text-red-700');
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
    
    setLoading(false);
  };

  const PrivacyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">개인정보 수집 및 이용 동의서</h3>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="text-sm text-gray-700 space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. 개인정보 수집 목적</h4>
              <p>- 숙소 방배정 및 관리</p>
              <p>- 회원 식별 및 본인 확인</p>
              <p>- 숙소 이용 관련 연락 및 안내</p>
              <p>- 비상시 연락처 확보</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. 수집하는 개인정보 항목</h4>
              <p>- 필수항목: 이름, 이메일, 전화번호, 주민등록번호, 학년, 성별</p>
              <p>- 선택항목: 비상연락처, 특별요청사항</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. 개인정보 보유 및 이용기간</h4>
              <p>- 숙소 이용 종료 후 1년간 보관</p>
              <p>- 법령에 따른 보관 의무가 있는 경우 해당 기간까지 보관</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">4. 개인정보 보안</h4>
              <p>- 주민등록번호는 AES 암호화하여 저장</p>
              <p>- 비밀번호는 bcrypt 해시화하여 저장</p>
              <p>- 개인정보 접근 권한을 최소화하여 관리</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">5. 동의 거부 권리</h4>
              <p>개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있으나, 필수 항목 동의를 거부할 경우 서비스 이용이 제한될 수 있습니다.</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            숙소 예약 회원가입
          </h2>
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
              로그인하기
            </Link>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {errors.general}
            </div>
          )}
          
          {/* 기본 정보 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="이름을 입력해주세요"
            />
            {errors.name && <p className="text-red-700 font-medium text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="이메일을 입력해주세요"
            />
            {errors.email && <p className="text-red-700 font-medium text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            />
            {errors.password && <p className="text-red-700 font-medium text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="비밀번호를 다시 입력해주세요"
            />
            {errors.confirmPassword && <p className="text-red-700 font-medium text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="010-1234-5678"
              value={formData.phone}
              onChange={handlePhoneChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {errors.phone && <p className="text-red-700 font-medium text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">
              보호자 전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="guardianPhone"
              name="guardianPhone"
              type="tel"
              placeholder="010-1234-5678"
              value={formData.guardianPhone}
              onChange={handleGuardianPhoneChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
                         {errors.guardianPhone && <p className="text-red-700 font-medium text-xs mt-1">{errors.guardianPhone}</p>}
          </div>

          {/* 주민등록번호 */}
          <div>
            <label htmlFor="ssn" className="block text-sm font-medium text-gray-700 mb-1">
              주민등록번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="ssn"
              name="ssn"
              type="text"
              value={formData.ssn}
              onChange={handleSSNChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="123456-1234567"
              maxLength="14"
            />
            {errors.ssn && <p className="text-red-700 font-medium text-xs mt-1">{errors.ssn}</p>}
            <p className="text-xs text-gray-500 mt-1">
              13자리 주민등록번호를 입력해주세요. (예: 123456-1234567) AES 암호화하여 안전하게 보관됩니다.
            </p>
          </div>

          {/* 학년 및 성별 - 반응형 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                학년 <span className="text-red-500">*</span>
              </label>
              <select
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                <option value="">선택해주세요</option>
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
                <option value="T">선생님</option>
              </select>
              {errors.grade && <p className="text-red-700 font-medium text-xs mt-1">{errors.grade}</p>}
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                성별 <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                <option value="">선택해주세요</option>
                <option value="M">남성</option>
                <option value="F">여성</option>
              </select>
              {errors.gender && <p className="text-red-700 font-medium text-xs mt-1">{errors.gender}</p>}
            </div>
          </div>

          {/* 비상연락처 (선택사항) */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">비상연락처 (선택사항)</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="emergency.name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  id="emergency.name"
                  name="emergency.name"
                  type="text"
                  value={formData.emergencyContact.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="비상연락처 이름"
                />
              </div>

              <div>
                <label htmlFor="emergency.relationship" className="block text-sm font-medium text-gray-700 mb-1">
                  관계
                </label>
                <select
                  id="emergency.relationship"
                  name="emergency.relationship"
                  value={formData.emergencyContact.relationship}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="">선택해주세요</option>
                  <option value="부모">부모</option>
                  <option value="형제/자매">형제/자매</option>
                  <option value="친척">친척</option>
                  <option value="친구">친구</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="emergency.phone" className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <input
                id="emergency.phone"
                name="emergency.phone"
                type="tel"
                value={formData.emergencyContact.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="010-1234-5678"
              />
            </div>
          </div>

          {/* 특별요청사항 */}
          <div>
            <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 mb-1">
              특별요청사항 (선택사항)
            </label>
            <textarea
              id="specialRequests"
              name="specialRequests"
              rows="3"
              value={formData.specialRequests}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
              placeholder="알레르기, 특별한 요구사항 등을 입력해주세요"
              maxLength="500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.specialRequests.length}/500자
            </p>
          </div>

          {/* 개인정보 동의 */}
          <div className="border-t pt-4">
            <div className="flex items-start space-x-3">
              <input
                id="privacyConsent"
                name="privacyConsent"
                type="checkbox"
                checked={formData.privacyConsent}
                onChange={handleChange}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor="privacyConsent" className="text-sm text-gray-700">
                  <span className="text-red-500">*</span> 개인정보 수집 및 이용에 동의합니다.{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-indigo-600 hover:text-indigo-500 underline"
                  >
                    내용 보기
                  </button>
                </label>
                {errors.privacyConsent && (
                  <p className="text-red-700 font-medium text-xs mt-1">{errors.privacyConsent}</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                회원가입 중...
              </div>
            ) : (
              '회원가입'
            )}
          </button>
        </form>
      </div>
      
      {showPrivacyModal && <PrivacyModal />}
    </div>
  );
};

export default Register; 