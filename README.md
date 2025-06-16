# 숙소 배정 시스템 (Room Assignment System)

수련회를 위한 실시간 방 예약 및 배정 관리 시스템

## 📋 프로젝트 개요

이 시스템은 수련회나 캠프 등에서 참가자들의 숙소 배정을 효율적으로 관리하기 위한 웹 애플리케이션입니다. 사용자 등록부터 방 배정, 예약 관리까지 전체 프로세스를 지원합니다.

## 🚀 주요 기능

### 👥 사용자 관리
- **회원가입 및 로그인**: 안전한 인증 시스템
- **개인정보 보호**: 주민등록번호 AES 암호화 저장
- **전화번호 관리**: 본인/보호자/비상연락처 관리
- **프로필 관리**: 개인정보 수정 및 관리

### 🏠 방 관리
- **방 등록 및 수정**: 관리자용 방 정보 관리
- **실시간 현황**: 방별 입주 현황 실시간 확인
- **필터링**: 층, 성별, 수용인원별 방 검색
- **배정 관리**: 침대별 세부 배정 관리

### 📊 예약 시스템
- **실시간 예약**: 사용 가능한 방 실시간 예약
- **예약 현황**: 개인별 예약 상태 확인
- **예약 취소**: 사용자/관리자 예약 취소 기능
- **예약 이력**: 전체 예약 히스토리 관리

### 👨‍💼 관리자 기능
- **회원 관리**: 전체 회원 목록 및 상세 정보 관리
- **엑셀 다운로드**: 회원 정보 엑셀 파일 다운로드
- **방 배정**: 관리자 직접 방 배정 기능
- **통계 현황**: 배정 현황 및 통계 정보
- **오픈시간 설정**: 예약 서비스 오픈 일시 설정 기능

## 🛠 기술 스택

### Frontend
- **React.js**: 사용자 인터페이스
- **React Router**: 클라이언트 사이드 라우팅
- **Tailwind CSS**: 스타일링
- **Context API**: 상태 관리

### Backend
- **Node.js**: 서버 런타임
- **Express.js**: 웹 프레임워크
- **MongoDB**: 데이터베이스
- **Mongoose**: ODM (Object Document Mapping)
- **JWT**: 인증 토큰
- **bcrypt**: 비밀번호 암호화
- **crypto-js**: 주민등록번호 AES 암호화

## 📁 프로젝트 구조

```
registration/
├── frontend/                 # React 프론트엔드
│   ├── public/
│   ├── src/
│   │   ├── components/       # React 컴포넌트
│   │   ├── context/          # Context API
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── styles/           # CSS 스타일
│   │   └── utils/            # 유틸리티 함수
│   └── package.json
├── backend/                  # Node.js 백엔드
│   ├── models/               # MongoDB 모델
│   ├── routes/               # API 라우트
│   ├── middleware/           # 미들웨어
│   ├── utils/                # 유틸리티 함수
│   ├── services/             # 비즈니스 로직
│   └── server.js             # 서버 진입점
├── package.json              # 루트 패키지 설정
└── README.md
```

## 🔧 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/hazel55/quick-room-booking.git
cd quick-room-booking
```

### 2. 의존성 설치
```bash
# 루트에서 전체 설치
npm install

# 또는 개별 설치
cd frontend && npm install
cd ../backend && npm install
```

### 3. 환경변수 설정
`backend/.env` 파일 생성:
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/room-assignment
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key-for-ssn
```

### 4. MongoDB 실행
```bash
# MongoDB 서비스 시작
mongod
```

### 5. 애플리케이션 실행
```bash
# 개발 모드 (프론트엔드 + 백엔드 동시 실행)
npm run dev

# 또는 개별 실행
npm run server:dev  # 백엔드만
npm run client:dev  # 프론트엔드만
```

## 🌐 접속 정보

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:3001
- **MongoDB**: mongodb://localhost:27017

## 🔐 보안 기능

### 데이터 암호화
- **주민등록번호**: AES-256-CBC 암호화
- **비밀번호**: bcrypt 해시화
- **JWT 토큰**: 안전한 인증 관리

### 접근 제어
- **사용자 인증**: JWT 기반 인증
- **권한 관리**: 일반 사용자 / 관리자 구분
- **API 보호**: 인증된 사용자만 접근 가능

## 📱 주요 화면

### 사용자 화면
- **회원가입**: 개인정보 입력 및 약관 동의
- **로그인**: 이메일/비밀번호 인증
- **대시보드**: 개인 예약 현황 확인
- **방 목록**: 사용 가능한 방 검색 및 예약
- **내 예약**: 예약 상태 확인 및 관리

### 관리자 화면
- **회원 관리**: 전체 회원 목록 및 상세 정보
- **방 관리**: 방 등록, 수정, 배정 관리
- **예약 관리**: 전체 예약 현황 및 통계

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

**개발자**: hazel55  
**프로젝트 링크**: [https://github.com/hazel55/quick-room-booking](https://github.com/hazel55/quick-room-booking)
