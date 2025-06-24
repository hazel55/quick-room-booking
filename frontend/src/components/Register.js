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
    guardianRelationship: '',
    grade: '',
    classNumber: '',
    gender: '',
    ssn: '',
    privacyConsent: false,
    retreatConsent: false,
    specialRequests: ''
  });
  
  const [ssnDisplay, setSsnDisplay] = useState(''); // 마스킹된 주민번호 표시용
  const [isSSNFocused, setIsSSNFocused] = useState(false); // 주민번호 필드 포커스 상태
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // 해당 필드의 에러 제거
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // 이름 입력 전용 핸들러 (실시간 검증)
  const handleNameChange = (e) => {
    const { value } = e.target;
    
    setFormData({
      ...formData,
      name: value
    });
    
    // 실시간 이름 검증
    if (value.trim()) {
      const nameValidation = validateName(value);
      if (!nameValidation.isValid) {
        setErrors({
          ...errors,
          name: nameValidation.message
        });
      } else {
        // 유효한 경우 에러 제거
        if (errors.name) {
          setErrors({
            ...errors,
            name: ''
          });
        }
      }
    } else {
      // 빈 값인 경우 에러 제거 (제출 시에 검증)
      if (errors.name) {
        setErrors({
          ...errors,
          name: ''
        });
      }
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
    const inputValue = e.target.value;
    const numbers = inputValue.replace(/[^0-9]/g, '');
    
    // 실제 값 저장 (13자리 제한)
    const limitedNumbers = numbers.substring(0, 13);
    const formatted = formatSSN(limitedNumbers);
    setFormData({
      ...formData,
      ssn: formatted
    });
    
    // 포커스 상태에 따라 표시값 설정
    if (isSSNFocused) {
      // 포커스가 있을 때는 실제 값 표시 (마스킹 안함)
      setSsnDisplay(formatted);
    } else {
      // 포커스가 없을 때는 마스킹된 값 표시
      setSsnDisplay(maskSSN(limitedNumbers));
    }
    
    if (errors.ssn) {
      setErrors({
        ...errors,
        ssn: ''
      });
    }
  };

  const handleSSNFocus = () => {
    setIsSSNFocused(true);
    // 포커스 시 실제 값 표시
    setSsnDisplay(formData.ssn || '');
  };

  const handleSSNBlur = () => {
    setIsSSNFocused(false);
    // 포커스를 잃을 때 마스킹된 값 표시
    const numbers = formData.ssn.replace(/[^0-9]/g, '');
    setSsnDisplay(maskSSN(numbers));
  };

  // 주민번호 마스킹 함수 (앞 6자리만 표시, 뒷자리는 *로 표시)
  const maskSSN = (value) => {
    if (!value) return '';
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 6) {
      return numbers;
    } else if (numbers.length <= 13) {
      const front = numbers.substring(0, 6);
      const backLength = numbers.length - 6;
      const back = '*'.repeat(backLength);
      return `${front}-${back}`;
    }
    return value;
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

  // 이름 검증 함수
  const validateName = (name) => {
    if (!name || typeof name !== 'string') {
      return { isValid: false, message: '이름을 입력해주세요' };
    }

    const trimmedName = name.trim();
    
    // 2글자 미만 체크
    if (trimmedName.length < 2) {
      return { isValid: false, message: '이름은 2글자 이상 입력해주세요' };
    }

    // 앞뒤 공백이나 연속 공백 체크
    if (name !== trimmedName || /\s{2,}/.test(name)) {
      return { isValid: false, message: '이름에 불필요한 공백이 있습니다' };
    }

    // 한글만 허용 (자음, 모음 단독 사용 체크 포함)
    const koreanRegex = /^[가-힣\s]+$/;
    if (!koreanRegex.test(trimmedName)) {
      return { isValid: false, message: '이름은 한글만 입력 가능합니다' };
    }

    // 한글 자음만 있는지 체크 (ㄱ, ㄴ, ㄷ 등)
    const consonantRegex = /[ㄱ-ㅎ]/;
    if (consonantRegex.test(trimmedName)) {
      return { isValid: false, message: '이름에 한글 자음만 입력할 수 없습니다' };
    }

    // 한글 모음만 있는지 체크 (ㅏ, ㅑ, ㅓ 등)
    const vowelRegex = /[ㅏ-ㅣ]/;
    if (vowelRegex.test(trimmedName)) {
      return { isValid: false, message: '이름에 한글 모음만 입력할 수 없습니다' };
    }

    return { isValid: true, message: '' };
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
    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.message;
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
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    // 전화번호 검증
    if (!formData.phone) {
      newErrors.phone = '전화번호를 입력해주세요';
    } else {
      const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
      if (!/^01[0-9]{9}$/.test(cleanPhone)) {
        newErrors.phone = '올바른 전화번호를 입력해주세요 (01로 시작하는 11자리)';
      }
    }

    // 보호자 전화번호 검증
    if (!formData.guardianPhone) {
      newErrors.guardianPhone = '보호자 전화번호를 입력해주세요';
    } else {
      const cleanPhone = formData.guardianPhone.replace(/[^0-9]/g, '');
      if (!/^01[0-9]{9}$/.test(cleanPhone)) {
        newErrors.guardianPhone = '올바른 보호자 전화번호를 입력해주세요 (01로 시작하는 11자리)';
      }
    }

    // 보호자와의 관계 검증
    if (!formData.guardianRelationship) {
      newErrors.guardianRelationship = '보호자와의 관계를 선택해주세요';
    }

    // 학년 검증
    if (!formData.grade) {
      newErrors.grade = '학년을 선택해주세요';
    }

    // 반 검증 (학생인 경우에만)
    if (['1', '2', '3'].includes(formData.grade) && !formData.classNumber) {
      newErrors.classNumber = '반을 선택해주세요';
    }

    // 성별 검증
    if (!formData.gender) {
      newErrors.gender = '성별을 선택해주세요';
    }

    // 주민등록번호 검증
    if (!formData.ssn) {
      newErrors.ssn = '주민등록번호를 입력해주세요';
    } else if (!validateSSN(formData.ssn)) {
      newErrors.ssn = '올바른 주민등록번호를 입력해주세요 (13자리)';
    }

    // 개인정보 동의 검증
    if (!formData.privacyConsent) {
      newErrors.privacyConsent = '개인정보 수집 및 이용에 동의해주세요';
    }

    // 수련회 서약서 동의 검증
    if (!formData.retreatConsent) {
      newErrors.retreatConsent = '수련회 참가 서약서에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstErrorElement = document.querySelector('.text-red-600');
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
    registerData.retreatConsent = 'true'; // 백엔드 validation을 위해 문자열로 전송

    const result = await register(registerData);

    if (result.success) {
      // 성공 알림 표시
      alert('회원가입이 완료되었습니다!');
      navigate('/dashboard');
    } else {
      // 에러 처리 개선
      if (result.errors) {
        const apiErrors = {};
        result.errors.forEach(error => {
          if (error.path) {
            apiErrors[error.path] = error.msg;
          }
        });
        setErrors(apiErrors);
      } else if (result.message) {
        // 특정 필드 에러인지 확인
        if (result.message.includes('이미 가입된 이메일')) {
          setErrors({ email: result.message });
        } else if (result.message.includes('이미 가입된 주민등록번호')) {
          setErrors({ ssn: result.message });
          alert('이미 가입된 주민등록번호입니다. 다른 주민등록번호를 입력해주세요.');
        } else {
          setErrors({ general: result.message });
          alert(result.message);
        }
      } else {
        setErrors({ general: '회원가입 중 오류가 발생했습니다.' });
        alert('회원가입 중 오류가 발생했습니다.');
      }
      
      // 에러가 있는 첫 번째 필드로 스크롤
      setTimeout(() => {
        const firstErrorElement = document.querySelector('.text-red-600');
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
              <p>- 여행자 보험 가입 및 보험금 청구 처리</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. 수집하는 개인정보 항목</h4>
              <p>- 필수항목: 이름, 이메일, 전화번호, 주민등록번호, 학년, 성별, 보호자 전화번호, 보호자와의 관계</p>
              <p>- 선택항목: 특별요청사항</p>
              <p>- 주민등록번호 수집 사유: 여행자 보험 가입 시 보험사 요구 필수 정보</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. 개인정보 보유 및 이용기간</h4>
              <p>- 숙소 이용 종료 후 1년간 보관</p>
              <p>- 여행자 보험 관련: 보험 계약 기간 및 보험금 청구 시효 기간까지</p>
              <p>- 법령에 따른 보관 의무가 있는 경우 해당 기간까지 보관</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">4. 개인정보 제3자 제공</h4>
              <p>- 제공받는 자: 여행자 보험 담당 보험회사</p>
              <p>- 제공 목적: 여행자 보험 가입 및 보험금 청구 처리</p>
              <p>- 제공 항목: 이름, 주민등록번호, 연락처</p>
              <p>- 보유 및 이용기간: 보험 계약 기간 및 법정 보관 기간</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">5. 개인정보 보안</h4>
              <p>- 주민등록번호는 AES 암호화하여 저장</p>
              <p>- 비밀번호는 bcrypt 해시화하여 저장</p>
              <p>- 개인정보 접근 권한을 최소화하여 관리</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">6. 동의 거부 권리</h4>
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

  const renderError = (field) => {
    return errors[field] && <p className="text-red-600 font-medium text-xs mt-1">{errors[field]}</p>;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            2025년 더사랑의교회 고등부 여름 수련회
          </h2>
          <p className="mt-3 text-base text-gray-500">
            수련회 참가 신청과 회원가입을 해주세요.
          </p>
        </div>
        
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="px-6 py-8 sm:p-10">

            <form onSubmit={handleSubmit} className="space-y-8">
              {errors.general && (
                <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-md text-sm">
                  {errors.general}
                </div>
              )}

              {/* 수련회 안내 및 서약서 */}
              <fieldset className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6 bg-blue-50">
                  <h3 className="text-xl font-bold text-blue-900 mb-4 text-center">수련회 안내</h3>
                  <div className="space-y-4 text-sm text-gray-800">
                    <div>
                      <h4 className="font-semibold text-blue-800">1. 개요</h4>
                      <ul className="list-disc list-inside pl-2 text-gray-700">
                        <li><span className="font-medium">일정:</span> 2025년 8월 1일(금) ~ 3일(주일)</li>
                        <li className="text-xs pl-5">※ 주일 예배는 고등부실에서 드립니다.</li>
                        <li><span className="font-medium">장소:</span> 용인 대웅경영개발원 (경기도 용인시 처인구 두계로 72)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">2. 출발일 집결 시간 및 장소</h4>
                      <p className="pl-4">8월 1일(금) 오전 9시 교회[이음센터 7층 고등부실]에 모여 출발합니다.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">3. 8월 3일(주일) 예배 안내</h4>
                      <p className="pl-4"><span className="font-medium">시간/장소:</span> 오전 9시 20분 / 이음센터 7층</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">4. 신청 및 등록</h4>
                      <ul className="list-disc list-inside pl-2 text-gray-700">
                        <li><span className="font-medium">신청기간:</span> 7월 5일 오후 5시까지 링크를 통해 신청</li>
                        <li><span className="font-medium">수련회비:</span> 100,000원</li>
                        <li><span className="font-medium">입금 계좌:</span> 3333-23-6992886 카카오뱅크 (주연진)</li>
                        <li className="text-xs pl-5">※ 입금하실 때, 꼭 "학년-반 이름"으로 입금해주세요. (ex. 1-1 홍길동)</li>
                        <li className="text-xs pl-5">※ 수련회 시설은 사전 계약이 이루어지므로 부분 참석 시에도 할인은 없습니다.</li>
                        <li className="text-xs pl-5">※ 7월 6일 오전 11시 30분에 선착순으로 방을 신청합니다.</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">5. 개인 준비물</h4>
                      <p className="pl-4">성경, 필기도구, 여벌 옷, 양말, 세면도구(치약, 칫솔, 비누, 수건), 슬리퍼/샌들, 개인 복용약</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">6. 후원 방법</h4>
                      <li className="text-xs pl-5">후원을 원하시는 가정은 교회 지정헌금 계좌로 입금해 주세요!</li>
                      <p className="pl-4">국민은행 992-76-799147 (더사랑의교회)로 "이름+후원부서" 형식으로 입금해주세요. (예: 김사랑C고등부)</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">7. 교역자 연락처</h4>
                       <ul className="list-disc list-inside pl-2 text-gray-700">
                        <li>김성은 강도사: 010-7189-3068</li>
                        <li>장예찬 전도사: 010-5833-6579</li>
                        <li>부장 문병필 집사: 010-9119-8837</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">수련회 참가 서약서</h3>
                  <div className="text-sm text-gray-600 space-y-3">
                    <p className="font-medium text-gray-800">
                      아래 사항에 대해 동의 여부 체크 부탁드립니다. 동의하지 않을 경우 수련회에 참가할 수 없습니다.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-xs pl-2">
                      <li>
                        <span className="font-semibold">수련회 기간 중 휴대폰 및 전자기기(패드) 제출 동의</span>:
                        <span className="ml-1 text-gray-500">수련회 기간 동안 휴대폰과 전자기기를 제출하여 보관하는 것에 동의합니다.</span>
                      </li>
                      <li>
                        <span className="font-semibold">퇴소 조치 동의</span>:
                        <span className="ml-1 text-gray-500">교역자 및 교사의 지시에 지속 불응하거나 공동체 안전에 위해가 가해질 경우 퇴소 조치할 수 있습니다.</span>
                      </li>
                      <li>
                        <span className="font-semibold">초상권 활용의 동의</span>:
                        <span className="ml-1 text-gray-500">해당 부서 밴드 및 교회 홈페이지에 학생 본인의 얼굴이 나오는 사진이 등록될 수 있습니다.</span>
                      </li>
                      <li>
                        <span className="font-semibold">응급 처치의 동의</span>:
                        <span className="ml-1 text-gray-500">학생의 안전에 이상 발생 시 최우선 119 신고 및 필요시 응급 처치를 진행할 수 있습니다.</span>
                      </li>
                    </ol>
                  </div>
                  <div className="flex items-start space-x-3 pt-4 mt-4 border-t border-gray-200">
                    <input
                      id="retreatConsent"
                      name="retreatConsent"
                      type="checkbox"
                      checked={formData.retreatConsent}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="retreatConsent" className="text-sm text-gray-700 font-semibold">
                        <span className="text-red-600">*</span> 위 내용에 모두 동의합니다.
                      </label>
                      {renderError('retreatConsent')}
                    </div>
                  </div>
                </div>
              </fieldset>
              
              {/* 기본 정보 */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold text-gray-900">기본 정보</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                      이름 <span className="text-red-600">*</span>
                    </label>
                    <input id="name" name="name" type="text" value={formData.name} onChange={handleNameChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" placeholder="홍길동" />
                    {renderError('name')}
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                      이메일 <span className="text-red-600">*</span>
                    </label>
                    <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" placeholder="test@example.com" />
                    {renderError('email')}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                      비밀번호 <span className="text-red-600">*</span>
                    </label>
                    <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" placeholder="영문, 숫자, 특수문자 포함 8자 이상" />
                    {renderError('password')}
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1">
                      비밀번호 확인 <span className="text-red-600">*</span>
                    </label>
                    <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" placeholder="비밀번호 재입력" />
                    {renderError('confirmPassword')}
                  </div>
                </div>
              </fieldset>

              {/* 상세 정보 */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold text-gray-900">상세 정보</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1">
                      전화번호 <span className="text-red-600">*</span>
                    </label>
                    <input id="phone" name="phone" type="tel" placeholder="010-1234-5678" value={formData.phone} onChange={handlePhoneChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" />
                    {renderError('phone')}
                  </div>
                  <div>
                    <label htmlFor="ssn" className="block text-sm font-semibold text-gray-700 mb-1">
                      주민등록번호 <span className="text-red-600">*</span>
                    </label>
                    <input 
                      id="ssn" 
                      name="ssn" 
                      type="text" 
                      value={ssnDisplay} 
                      onChange={handleSSNChange}
                      onFocus={handleSSNFocus}
                      onBlur={handleSSNBlur}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
                      placeholder="123456-*******" 
                      maxLength="14"
                      autoComplete="off"
                    />
                    {renderError('ssn')}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="grade" className="block text-sm font-semibold text-gray-700 mb-1">
                      학년 <span className="text-red-600">*</span>
                    </label>
                    <select id="grade" name="grade" value={formData.grade} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
                      <option value="">선택</option>
                      <option value="1">1학년</option>
                      <option value="2">2학년</option>
                      <option value="3">3학년</option>
                      <option value="T">선생님</option>
                    </select>
                    {renderError('grade')}
                  </div>
                  <div>
                    <label htmlFor="classNumber" className="block text-sm font-semibold text-gray-700 mb-1">
                      반 <span className="text-red-600">*</span>
                    </label>
                    <select id="classNumber" name="classNumber" value={formData.classNumber} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" disabled={!['1', '2', '3'].includes(formData.grade)}>
                      <option value="">선택</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}반</option>
                      ))}
                      <option value="N">새가족/미배정</option>
                    </select>
                    {renderError('classNumber')}
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-1">
                      성별 <span className="text-red-600">*</span>
                    </label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
                      <option value="">선택</option>
                      <option value="M">남성</option>
                      <option value="F">여성</option>
                    </select>
                    {renderError('gender')}
                  </div>
                </div>
              </fieldset>

              {/* 보호자 정보 */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold text-gray-900">보호자 정보</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guardianPhone" className="block text-sm font-semibold text-gray-700 mb-1">
                      보호자 전화번호 <span className="text-red-600">*</span>
                    </label>
                    <input id="guardianPhone" name="guardianPhone" type="tel" placeholder="010-1234-5678" value={formData.guardianPhone} onChange={handleGuardianPhoneChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" />
                    {renderError('guardianPhone')}
                  </div>
                  <div>
                    <label htmlFor="guardianRelationship" className="block text-sm font-semibold text-gray-700 mb-1">
                      보호자와의 관계 <span className="text-red-600">*</span>
                    </label>
                    <select id="guardianRelationship" name="guardianRelationship" value={formData.guardianRelationship} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
                      <option value="">선택</option>
                      <option value="부모">부모</option>
                      <option value="형제/자매">형제/자매</option>
                      <option value="친척">친척</option>
                      <option value="친구">친구</option>
                      <option value="기타">기타</option>
                    </select>
                    {renderError('guardianRelationship')}
                  </div>
                </div>
              </fieldset>

              {/* 기타 요청 */}
              <fieldset>
                <label htmlFor="specialRequests" className="block text-sm font-semibold text-gray-700 mb-1">
                  특별요청사항 (선택사항)
                </label>
                <textarea id="specialRequests" name="specialRequests" rows="3" value={formData.specialRequests} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-none" placeholder="알레르기, 특별한 요구사항 등을 입력해주세요" maxLength="500" />
                <p className="text-xs text-right text-gray-500 mt-1">
                  {formData.specialRequests.length}/500자
                </p>
              </fieldset>

              {/* 개인정보 동의 */}
              <fieldset>
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
                      <span className="text-red-600">*</span> 개인정보 수집 및 이용에 동의합니다.{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="font-medium text-indigo-600 hover:text-indigo-500 underline"
                      >
                        내용 보기
                      </button>
                    </label>
                    {renderError('privacyConsent')}
                  </div>
                </div>
              </fieldset>

              <div className="pt-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      등록 중...
                    </div>
                  ) : (
                    '등록하기'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {showPrivacyModal && <PrivacyModal />}
    </div>
  );
};

export default Register; 