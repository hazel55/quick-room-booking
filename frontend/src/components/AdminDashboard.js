import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userAPI, roomAPI, reservationSettingsAPI } from '../utils/api';
import './Modal.css';
import '../styles/dashboard.css';

const formatClassNumber = (classNumber) => {
  if (classNumber === 'N') return '새가족반';
  if (classNumber === 'G') return '비출석(게스트)';
  if (classNumber) return `${classNumber}반`;
  return '';
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 예약 설정 관련 상태
  const [reservationSettings, setReservationSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    openDateTime: '',
    isReservationOpen: false,
    description: ''
  });
  
  // 방 관리 모달 상태
  const [showRoomModal, setShowRoomModal] = useState(false);
  
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    floor: '',
    gender: '',
    capacity: '',
    isActive: 'Y'
  });

  // 방 필터 상태
  const [roomFilters, setRoomFilters] = useState({
    roomNumber: '',
    floor: 'all',
    gender: 'all',
    capacity: 'all',
    status: 'all'
  });

  // 사용자 추가 관련 상태
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBedNumber, setSelectedBedNumber] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 사용자 목록 로드
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();
      setUsers(response.data.data);
    } catch (error) {
      setError('사용자 목록을 불러오는데 실패했습니다');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 방 목록 로드
  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await roomAPI.getRoomsForAdmin();
      setRooms(response.data.data);
      setFilteredRooms(response.data.data);
    } catch (error) {
      setError('방 목록을 불러오는데 실패했습니다');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 예약 설정 로드
  const loadReservationSettings = async () => {
    try {
      const response = await reservationSettingsAPI.getSettings();
      const data = response.data;
      
      if (data.success) {
        setReservationSettings(data.data);
        
        // 서버에서 받은 UTC 시간을 한국 시간으로 변환
        const utcDateTime = new Date(data.data.openDateTime);
        
        // UTC 시간을 한국 시간으로 변환 (UTC + 9시간)
        const koreaDateTime = new Date(utcDateTime.getTime() + (9 * 60 * 60 * 1000));
        
        // datetime-local 형식으로 변환
        const year = koreaDateTime.getUTCFullYear();
        const month = String(koreaDateTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(koreaDateTime.getUTCDate()).padStart(2, '0');
        const hour = String(koreaDateTime.getUTCHours()).padStart(2, '0');
        const minute = String(koreaDateTime.getUTCMinutes()).padStart(2, '0');
        const localDateTimeString = `${year}-${month}-${day}T${hour}:${minute}`;
        
        console.log('🕐 UTC → 한국시간 변환:', {
          서버UTC: data.data.openDateTime,
          UTC객체: utcDateTime.toISOString(),
          한국시간객체: koreaDateTime.toISOString(),
          표시값: localDateTimeString,
          검증: koreaDateTime.toLocaleString('ko-KR')
        });
        
        setSettingsForm({
          openDateTime: localDateTimeString,
          isReservationOpen: data.data.isReservationOpen,
          description: data.data.description || ''
        });
      }
    } catch (error) {
      console.error('예약 설정 로드 실패:', error);
    }
  };

  // 예약 설정 업데이트
  const updateReservationSettings = async () => {
    try {
      if (!settingsForm.openDateTime) {
        alert('오픈 일시를 선택해주세요.');
        return;
      }

      // 입력된 datetime-local 값을 그대로 사용 (서버가 한국 시간대로 설정됨)
      console.log('📤 간단 시간 저장:', {
        입력값: settingsForm.openDateTime,
        현재한국시간: new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})
      });

      const response = await reservationSettingsAPI.updateSettings({
        openDateTime: settingsForm.openDateTime,
        isReservationOpen: settingsForm.isReservationOpen,
        description: settingsForm.description
      });

      const data = response.data;
      
      if (data.success) {
        alert('예약 설정이 업데이트되었습니다.');
        loadReservationSettings();
      } else {
        alert(data.message || '설정 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 설정 업데이트 실패:', error);
      alert('설정 업데이트에 실패했습니다.');
    }
  };

  // 예약 오픈 상태 토글
  const toggleReservationOpen = async () => {
    try {
      const response = await reservationSettingsAPI.toggleOpen();
      const data = response.data;
      
      if (data.success) {
        alert(data.message);
        loadReservationSettings();
      } else {
        alert(data.message || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 상태 토글 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 방 배정 취소
  const cancelRoomAssignment = async (userId, roomNumber) => {
    try {
      // 배정된 방이 없으면 오류 Alert
      if (!roomNumber) {
        alert('배정된 방이 없습니다.');
        return;
      }

      // 확인 창 표시
      const confirmed = window.confirm('배정된 방을 취소하시겠습니까?');
      if (!confirmed) {
        return;
      }

      // 방 배정 취소 API 호출
      await userAPI.cancelRoomAssignment(userId);
      
      // 목록 새로고침
      loadUsers();
      loadRooms();
      
      alert('방 배정이 취소되었습니다.');
    } catch (error) {
      console.error('방 배정 취소 실패:', error);
      alert('방 배정 취소에 실패했습니다.');
    }
  };

  // 회원 삭제
  const deleteUser = async (userId, userName) => {
    try {
      // 사용자 확인 모달 표시
      const confirmed = window.confirm(
        `해당 회원을 삭제하시겠습니까?\n\n` +
        `회원명: ${userName}\n` +
        `주의: 이 작업은 되돌릴 수 없습니다.\n` +
        `삭제된 회원의 민감 정보는 마스킹 처리됩니다.`
      );
      
      if (!confirmed) return;

      // 두 번째 확인
      const doubleConfirmed = window.confirm(
        `정말로 "${userName}" 회원을 삭제하시겠습니까?\n` +
        `이 작업은 되돌릴 수 없습니다.`
      );
      
      if (!doubleConfirmed) return;

      // 회원 삭제 API 호출
      const response = await userAPI.deleteUser(userId);
      
      // 성공 메시지
      alert(`회원이 성공적으로 삭제되었습니다.\n${response.data.message}`);
      
      // 데이터 새로고침
      loadUsers();
      loadRooms();
    } catch (error) {
      console.error('회원 삭제 실패:', error);
      alert(error.response?.data?.message || '회원 삭제 중 오류가 발생했습니다.');
    }
  };

  // 방 등록/수정 모달 열기
  const openRoomModal = (room = null) => {
    if (room) {
      setEditingRoom(room);
      setRoomForm({
        roomNumber: room.roomNumber,
        floor: room.floor.toString(),
        gender: room.gender,
        capacity: room.capacity.toString(),
        isActive: room.isActive ? 'Y' : 'N'
      });
    } else {
      setEditingRoom(null);
      setRoomForm({
        roomNumber: '',
        floor: '',
        gender: '',
        capacity: '',
        isActive: 'Y'
      });
    }
    setShowRoomModal(true);
  };

  // 방 등록/수정 모달 닫기
  const closeRoomModal = () => {
    setShowRoomModal(false);
    setEditingRoom(null);
    setRoomForm({
      roomNumber: '',
      floor: '',
      gender: '',
      capacity: '',
      isActive: 'Y'
    });
  };

  // 방 등록/수정
  const handleRoomSubmit = async () => {
    try {
      // 필수값 체크
      if (!roomForm.gender || !roomForm.capacity || !roomForm.isActive) {
        alert('성별, 수용인원, 사용여부는 필수값입니다.');
        return;
      }

      if (!editingRoom && !roomForm.roomNumber) {
        alert('방 번호를 입력해주세요.');
        return;
      }

      if (!editingRoom && !roomForm.floor) {
        alert('층을 입력해주세요.');
        return;
      }

      // 방 번호 검증 (12글자 이하)
      if (roomForm.roomNumber && roomForm.roomNumber.length > 12) {
        alert('방 번호는 12글자 이하여야 합니다.');
        return;
      }

      const roomData = {
        roomNumber: roomForm.roomNumber.trim(),
        floor: parseInt(roomForm.floor),
        gender: roomForm.gender,
        capacity: parseInt(roomForm.capacity),
        isActive: roomForm.isActive === 'Y'
      };

      if (editingRoom) {
        // 수정
        await roomAPI.updateRoom(editingRoom._id, roomData);
        alert('방 정보가 수정되었습니다.');
      } else {
        // 등록
        await roomAPI.createRoom(roomData);
        alert('방이 등록되었습니다.');
      }

      closeRoomModal();
      loadRooms();
    } catch (error) {
      console.error('방 등록/수정 실패:', error);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('방 등록/수정에 실패했습니다.');
      }
    }
  };

  // 방 삭제
  const handleRoomDelete = async () => {
    try {
      // 방에 배정된 인원 확인
      if (editingRoom.occupants && editingRoom.occupants.length > 0) {
        alert('방에 배정된 인원이 있으면 방을 삭제하실 수 없습니다.');
        return;
      }

      const confirmed = window.confirm('정말 삭제하시겠어요?');
      if (!confirmed) {
        return;
      }

      await roomAPI.deleteRoom(editingRoom._id);
      alert('방이 삭제되었습니다.');
      closeRoomModal();
      loadRooms();
    } catch (error) {
      console.error('방 삭제 실패:', error);
      alert('방 삭제에 실패했습니다.');
    }
  };

  // 방 필터링
  const applyRoomFilters = useCallback(() => {
    let filtered = rooms;

    if (roomFilters.roomNumber) {
      filtered = filtered.filter(room => 
        room.roomNumber.toLowerCase().includes(roomFilters.roomNumber.toLowerCase())
      );
    }

    if (roomFilters.floor !== 'all') {
      filtered = filtered.filter(room => room.floor === parseInt(roomFilters.floor));
    }

    if (roomFilters.gender !== 'all') {
      filtered = filtered.filter(room => room.gender === roomFilters.gender);
    }

    if (roomFilters.capacity !== 'all') {
      filtered = filtered.filter(room => room.capacity === parseInt(roomFilters.capacity));
    }

    if (roomFilters.status !== 'all') {
      filtered = filtered.filter(room => {
        const currentOccupancy = room.occupants ? room.occupants.length : 0;
        if (roomFilters.status === 'empty') return currentOccupancy === 0;
        if (roomFilters.status === 'partial') return currentOccupancy > 0 && currentOccupancy < room.capacity;
        if (roomFilters.status === 'full') return currentOccupancy >= room.capacity;
        return true;
      });
    }

    setFilteredRooms(filtered);
  }, [rooms, roomFilters]);

  // 필터 변경 핸들러
  const handleFilterChange = (key, value) => {
    setRoomFilters(prev => ({ ...prev, [key]: value }));
  };

  // 필터 초기화
  const resetFilters = () => {
    setRoomFilters({
      roomNumber: '',
      floor: 'all',
      gender: 'all',
      capacity: 'all',
      status: 'all'
    });
  };

  // 엑셀 다운로드
  const downloadExcel = () => {
    // 관리자 계정(grade A) 제외
    const filteredUsers = users.filter(user => user.grade !== 'A');
    
    const csvData = filteredUsers.map(user => ({
      이름: user.name,
      이메일: user.email,
      전화번호: user.formattedPhone || user.phone, 
      입금자명: user.depositorName || '-',   
      보호자전화번호: user.formattedGuardianPhone || user.guardianPhone,
      주민등록번호: user.ssn || '정보없음',
      학년: user.grade === 'T' ? '선생님' : user.grade === 'A' ? '관리자' : `${user.grade}학년`,
      반: formatClassNumber(user.classNumber),
      인도자: user.guideName || '',
      성별: user.gender === 'M' ? '남성' : user.gender === 'F' ? '여성' : user.gender,
      보호자연락처: user.formattedGuardianPhone || user.guardianPhone || '미등록',
      배정방: user.roomAssignment?.roomNumber || '미배정',
      배정번호: user.roomAssignment?.bedNumber || '미배정',
      상태: user.roomAssignment?.status === 'pending' ? '대기중' :
            user.roomAssignment?.status === 'assigned' ? '배정됨' :
            user.roomAssignment?.status === 'checked-in' ? '체크인' :
            user.roomAssignment?.status === 'checked-out' ? '체크아웃' :
            '대기중',
      가입일: new Date(user.createdAt).toLocaleDateString('ko-KR')
    }));

    // 다운로드할 데이터가 없는 경우 처리
    if (csvData.length === 0) {
      alert('다운로드할 회원 데이터가 없습니다.');
      return;
    }

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `회원목록_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 사용자 검색 (개선된 버전)
  const searchUsers = async (query) => {
    console.log('🔍 검색 시작:', query);
    
    if (!query || query.length < 2) {
      console.log('❌ 검색어가 너무 짧음:', query);
      setSearchResults([]);
      return;
    }

    try {
      console.log('📡 API 호출 중...');
      // 새로운 검색 API 사용 (서버 사이드 검색)
      const response = await userAPI.searchUsers(query, true);
      console.log('✅ 검색 응답:', response.data);
      setSearchResults(response.data.data);
    } catch (error) {
      console.error('❌ 사용자 검색 실패:', error);
      console.error('에러 상세:', error.response?.data || error.message);
      setSearchResults([]);
    }
  };

  // 방에 사용자 추가
  const addUserToRoom = async (userId, bedNumber) => {
    try {
      if (!bedNumber) {
        alert('배정할 번호를 선택해주세요.');
        return;
      }

      // 침대 번호 중복 확인
      const isOccupied = editingRoom.occupants.some(occupant => 
        occupant.bedNumber === parseInt(bedNumber)
      );

      if (isOccupied) {
        alert('이미 사용 중인 번호입니다.');
        return;
      }

      await userAPI.assignRoom(userId, {
        roomId: editingRoom._id,
        bedNumber: parseInt(bedNumber)
      });

      alert('사용자가 방에 추가되었습니다.');
      
      // 상태 초기화
      setShowUserSearch(false);
      setUserSearchQuery('');
      setSearchResults([]);
      setSelectedBedNumber('');
      
      // 방 정보 새로고침
      loadRooms();
      
      // 수정 중인 방 정보 업데이트
      const updatedResponse = await roomAPI.getRoom(editingRoom._id);
      setEditingRoom(updatedResponse.data.data);
      
    } catch (error) {
      console.error('사용자 추가 실패:', error);
      alert('사용자 추가에 실패했습니다.');
    }
  };

  // 방에서 사용자 제거
  const removeUserFromRoom = async (userId) => {
    try {
      const confirmed = window.confirm('이 사용자를 방에서 제거하시겠습니까?');
      if (!confirmed) return;

      await userAPI.cancelRoomAssignment(userId);
      alert('사용자가 방에서 제거되었습니다.');
      
      // 방 정보 새로고침
      loadRooms();
      
      // 수정 중인 방 정보 업데이트
      const updatedResponse = await roomAPI.getRoom(editingRoom._id);
      setEditingRoom(updatedResponse.data.data);
      
    } catch (error) {
      console.error('사용자 제거 실패:', error);
      alert('사용자 제거에 실패했습니다.');
    }
  };

  // 데이터 정합성 복구
  const repairDataConsistency = async () => {
    try {
      const confirmed = window.confirm(
        '데이터 정합성을 복구하시겠습니까?\n\n이 작업은 다음을 수행합니다:\n' +
        '• 예약 데이터와 사용자 배정 정보 동기화\n' +
        '• Dashboard와 My-Reservation 페이지 정보 일치\n' +
        '• 불일치하는 데이터 자동 수정'
      );
      if (!confirmed) return;

      setLoading(true);
      const response = await userAPI.repairDataConsistency();
      
      if (response.data.success) {
        alert(response.data.message);
        // 데이터 새로고침
        loadUsers();
        loadRooms();
      } else {
        alert('데이터 정합성 복구에 실패했습니다.');
      }
    } catch (error) {
      console.error('데이터 정합성 복구 실패:', error);
      alert('데이터 정합성 복구에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'rooms') {
      loadRooms();
    } else if (activeTab === 'settings') {
      loadReservationSettings();
    }
  }, [activeTab]);

  useEffect(() => {
    applyRoomFilters();
  }, [roomFilters, rooms, applyRoomFilters]);

  // 사용자 검색 디바운스
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchQuery) {
        searchUsers(userSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

  return (

    
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="dashboard-header">
        <div className="dashboard-logo">
          {/* 로고/타이틀 */}
          <div className="dashboard-logo-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <h1 className="dashboard-title">관리자 대시보드</h1>
        </div>
        <nav className="dashboard-nav">

          <button
            onClick={() => setActiveTab('users')}
            className="nav-button nav-button-active"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span>회원 관리</span>
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className="nav-button nav-button-active"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
            </svg>
            <span>방 관리</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="nav-button nav-button-active"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span>예약 설정</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="nav-button nav-button-active"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span>일반 회원 대시보드</span>
          </button>
        </nav>
        <div className="user-profile">
          {/* 프로필/로그아웃 */}
          <div className="user-profile hidden sm:flex">
            <div className="user-avatar" style={{background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'}}>
              {user?.name?.charAt(0) || 'A'}
            </div>
            <span className="user-name">{user?.name}님</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* 회원 관리 탭 */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-lg font-medium text-gray-900">회원 목록</h2>
              <button
                onClick={downloadExcel}
                disabled={users.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                엑셀 다운로드
              </button>
            </div>

            <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
              {/* 테이블 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    전체 회원 목록 ({users.length}명)
                  </h3>
                  <div className="text-sm text-gray-600">
                    배정완료: {users.filter(u => u.roomAssignment?.status === 'assigned').length}명 | 
                    대기중: {users.filter(u => !u.roomAssignment || u.roomAssignment?.status === 'pending').length}명
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        이름
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        이메일
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        전화번호
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        학년/반
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        성별
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        입금자명
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        보호자연락처
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        인도자
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        배정방
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        상태
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                            <span>로딩 중...</span>
                          </div>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                          <div className="text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 회원이 없습니다</h3>
                            <p className="mt-1 text-sm text-gray-500">새로운 회원이 가입하면 여기에 표시됩니다.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user, index) => (
                        <tr key={user._id} className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* 이름 */}
                          <td className="px-4 py-3 border-r border-gray-300 text-sm font-medium text-gray-900">
                            {user.name}
                          </td>
                          
                          {/* 이메일 */}
                          <td className="px-4 py-3 border-r border-gray-300 text-sm text-gray-900">
                            {user.email}
                          </td>

                          {/* 전화번호 */}
                          <td className="px-4 py-3 border-r border-gray-300 text-sm text-gray-900">
                            {user.formattedPhone || user.phone}
                          </td>

                          {/* 학년/반 */}
                          <td className="px-4 py-3 border-r border-gray-300">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.grade === 'T' ? 'bg-purple-100 text-purple-800' :
                                user.grade === 'A' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {user.grade === 'T' ? '선생님' : 
                                 user.grade === 'A' ? '관리자' : 
                                 `${user.grade}학년`}
                              </span>
                              {user.classNumber && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.classNumber === 'G' ? 'bg-orange-100 text-orange-800' :
                                  user.classNumber === 'N' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {formatClassNumber(user.classNumber)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 성별 */}
                          <td className="px-4 py-3 border-r border-gray-300 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.gender === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {user.gender === 'M' ? ' 남성' : ' 여성'}
                            </span>
                          </td>
                          
                          {/* 입금자 이름 */}
                          <td className="px-4 py-3 border-r border-gray-300 text-sm font-medium text-gray-900">
                            {user.depositorName}
                          </td>

                          {/* 보호자 연락처 */}
                          <td className="px-4 py-3 border-r border-gray-300 text-sm text-gray-900">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              {user.formattedGuardianPhone || user.guardianPhone || '미등록'}
                            </span>
                          </td>

                          {/* 인도자 */}
                          <td className="px-4 py-3 border-r border-gray-300 text-sm text-gray-900">
                            {user.guideName || '-'}
                          </td>

                          {/* 배정방 */}
                          <td className="px-4 py-3 border-r border-gray-300 text-sm text-gray-900">
                            {user.roomAssignment?.roomNumber ? (
                              <div>
                                <div className="font-medium">
                                  {/^\d+$/.test(user.roomAssignment.roomNumber) ? `${user.roomAssignment.roomNumber}호` : user.roomAssignment.roomNumber}
                                </div>
                                {user.roomAssignment.bedNumber && (
                                  <div className="text-xs text-gray-500">
                                    {user.roomAssignment.bedNumber}번
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">미배정</span>
                            )}
                          </td>

                          {/* 상태 */}
                          <td className="px-4 py-3 border-r border-gray-300">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.roomAssignment?.status === 'assigned' ? 'bg-green-100 text-green-800' :
                              user.roomAssignment?.status === 'checked-in' ? 'bg-blue-100 text-blue-800' :
                              user.roomAssignment?.status === 'checked-out' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.roomAssignment?.status === 'pending' ? '대기중' :
                               user.roomAssignment?.status === 'assigned' ? '배정됨' :
                               user.roomAssignment?.status === 'checked-in' ? '체크인' :
                               user.roomAssignment?.status === 'checked-out' ? '체크아웃' :
                               '대기중'}
                            </span>
                          </td>

                          {/* 관리 */}
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => cancelRoomAssignment(user._id, user.roomAssignment?.roomNumber)}
                                disabled={!user.roomAssignment?.roomNumber || user.roomAssignment?.status !== 'assigned'}
                                className={`px-3 py-1 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                                  user.roomAssignment?.roomNumber && user.roomAssignment?.status === 'assigned'
                                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                방배정취소
                              </button>
                              <button
                                onClick={() => deleteUser(user._id, user.name)}
                                className="px-3 py-1 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 bg-red-800 text-white hover:bg-red-900 focus:ring-red-600"
                              >
                                회원삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 방 관리 탭 */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-lg font-medium text-gray-900">방 관리</h2>
              <button
                onClick={() => setShowRoomModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
              >
                방 등록
              </button>
            </div>

            {/* 필터 영역 */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">필터</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">방 번호</label>
                  <input
                    type="text"
                    placeholder="방 번호 검색"
                    value={roomFilters.roomNumber}
                    onChange={(e) => handleFilterChange('roomNumber', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">층</label>
                  <select
                    value={roomFilters.floor}
                    onChange={(e) => handleFilterChange('floor', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">전체</option>
                    <option value="2">2층</option>
                    <option value="3">3층</option>
                    <option value="4">4층</option>
                    <option value="5">5층</option>
                    <option value="6">6층</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                  <select
                    value={roomFilters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">전체</option>
                    <option value="M">남성</option>
                    <option value="F">여성</option>

                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수용인원</label>
                  <select
                    value={roomFilters.capacity}
                    onChange={(e) => handleFilterChange('capacity', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">전체</option>
                    <option value="2">2명</option>
                    <option value="3">3명</option>
                    <option value="4">4명</option>
                    <option value="10">10명</option>
                    <option value="20">20명</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={roomFilters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">전체</option>
                    <option value="empty">빈방</option>
                    <option value="partial">부분배정</option>
                    <option value="full">만실</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    초기화
                  </button>
                </div>
              </div>
            </div>

            {/* 방 목록 테이블 */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  전체 방 목록 ({filteredRooms.length}개)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        방 번호
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        층/성별
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        수용인원
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        현재인원
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        거주자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          로딩 중...
                        </td>
                      </tr>
                    ) : filteredRooms.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          조건에 맞는 방이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredRooms.map((room) => {
                        const currentOccupancy = room.occupants ? room.occupants.length : 0;
                        const genderText = room.gender === 'M' ? '남성' : room.gender === 'F' ? '여성' : room.gender;
                        
                        return (
                          <tr key={room._id} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {room.roomNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {room.floor}층 / {genderText}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {room.capacity}명
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="font-medium">{currentOccupancy}명</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {room.occupants && room.occupants.length > 0 ? (
                                <div className="space-y-1">
                                  {room.occupants.map((occupant, index) => (
                                    <div key={index} className="text-xs bg-gray-100 rounded px-2 py-1">
                                      <span className="font-medium text-indigo-600">{occupant.bedNumber}번:</span>{' '}
                                      <span className="text-gray-700">
                                        {occupant.user?.name || '이름 없음'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs italic">빈 방</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                currentOccupancy >= room.capacity ? 'bg-red-100 text-red-800' :
                                currentOccupancy > 0 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {currentOccupancy >= room.capacity ? '만실' :
                                 currentOccupancy > 0 ? '부분배정' :
                                 '빈방'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => openRoomModal(room)}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200"
                              >
                                수정
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 예약 설정 탭 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-lg font-medium text-gray-900">예약 설정</h2>
            </div>

            {/* 현재 설정 상태 */}
            {reservationSettings && (
              <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 예약 상태</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">예약 오픈 상태:</span>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        reservationSettings.isOpenNow 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {reservationSettings.isOpenNow ? '오픈' : '마감'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">설정 상태:</span>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        reservationSettings.isReservationOpen 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {reservationSettings.isReservationOpen ? '활성화' : '비활성화'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">오픈 예정 일시:</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(reservationSettings.openDateTime).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: 'Asia/Seoul'
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        현재 시간: {new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})}
                      </p>
                      <p className="text-xs text-gray-500">
                        서버 저장 시간: {reservationSettings.openDateTime}
                      </p>
                    </div>
                    {!reservationSettings.isOpenNow && reservationSettings.timeUntilOpen > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">오픈까지 남은 시간:</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {Math.floor(reservationSettings.timeUntilOpen / (1000 * 60 * 60 * 24))}일{' '}
                          {Math.floor((reservationSettings.timeUntilOpen % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}시간{' '}
                          {Math.floor((reservationSettings.timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60))}분
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 빠른 토글 버튼 */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={toggleReservationOpen}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      reservationSettings.isReservationOpen
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                        : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    {reservationSettings.isReservationOpen ? '예약 마감하기' : '예약 오픈하기'}
                  </button>
                </div>
              </div>
            )}

            {/* 예약 설정 폼 */}
            <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">예약 설정 변경</h3>
              
              <div className="space-y-6">
                {/* 오픈 일시 설정 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예약 오픈 일시 (한국 시간) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={settingsForm.openDateTime}
                    onChange={(e) => setSettingsForm({...settingsForm, openDateTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    한국 시간(KST) 기준으로 입력해주세요. 설정한 일시가 되면 사용자들이 방 예약을 할 수 있습니다.
                  </p>
                </div>

                {/* 즉시 오픈 여부 */}
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settingsForm.isReservationOpen}
                      onChange={(e) => setSettingsForm({...settingsForm, isReservationOpen: e.target.checked})}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      즉시 예약 오픈 (설정한 일시와 관계없이 바로 오픈)
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500 ml-7">
                    체크하면 설정한 일시와 관계없이 즉시 예약이 가능합니다.
                  </p>
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명 (선택사항)
                  </label>
                  <textarea
                    value={settingsForm.description}
                    onChange={(e) => setSettingsForm({...settingsForm, description: e.target.value})}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="예약 설정에 대한 설명을 입력하세요..."
                  />
                </div>

                {/* 저장 버튼 */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={updateReservationSettings}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    설정 저장
                  </button>
                </div>
              </div>
            </div>

            {/* 시스템 관리 */}
            <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">시스템 관리</h3>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900">데이터 정합성 복구</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Dashboard와 My-Reservation 페이지의 예약 정보가 일치하지 않을 때 사용하세요.
                      예약 데이터와 사용자 배정 정보를 동기화합니다.
                    </p>
                  </div>
                  <button
                    onClick={repairDataConsistency}
                    disabled={loading}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? '처리 중...' : '정합성 복구'}
                  </button>
                </div>
              </div>
            </div>

            {/* 도움말 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 사용 안내</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>예약 오픈 일시:</strong> 사용자가 방 예약을 시작할 수 있는 날짜와 시간을 설정합니다.</li>
                <li>• <strong>즉시 오픈:</strong> 체크하면 설정한 일시와 관계없이 바로 예약이 가능합니다.</li>
                <li>• <strong>빠른 토글:</strong> 위의 토글 버튼으로 예약 상태를 빠르게 변경할 수 있습니다.</li>
                <li>• <strong>사용자 화면:</strong> 예약이 마감된 상태에서는 사용자가 예약 버튼을 클릭할 수 없습니다.</li>
                <li>• <strong>데이터 정합성 복구:</strong> 예약 정보가 일치하지 않을 때 자동으로 수정합니다.</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* 방 등록/수정 모달 */}
      {showRoomModal && createPortal(
        <div className="modal-overlay" onClick={closeRoomModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingRoom ? '방 정보 수정' : '방 등록'}
              </h3>
              <button
                onClick={closeRoomModal}
                className="modal-close-button"
                type="button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <form className="modal-form" onSubmit={(e) => e.preventDefault()}>
              {/* 방 번호 */}
              <div className="form-group">
                <label className="form-label">
                  방 번호 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={roomForm.roomNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 12) {
                      setRoomForm({...roomForm, roomNumber: value});
                    }
                  }}
                  disabled={editingRoom}
                  placeholder="예: 201, A101, ROOM-A (12글자 이하)"
                  maxLength="12"
                />
                {roomForm.roomNumber && (
                  <small className="text-gray-500">
                    {roomForm.roomNumber.length}/12글자
                  </small>
                )}
              </div>

              {/* 층 */}
              <div className="form-group">
                <label className="form-label">
                  층 <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={roomForm.floor}
                  onChange={(e) => setRoomForm({...roomForm, floor: e.target.value})}
                  disabled={editingRoom}
                  placeholder="예: 2"
                  min="1"
                />
              </div>

              {/* 성별 */}
              <div className="form-group">
                <label className="form-label">
                  성별 <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={roomForm.gender}
                  onChange={(e) => setRoomForm({...roomForm, gender: e.target.value})}
                >
                  <option value="">선택하세요</option>
                  <option value="M">남성</option>
                  <option value="F">여성</option>

                </select>
              </div>

              {/* 수용인원 */}
              <div className="form-group">
                <label className="form-label">
                  수용인원 <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({...roomForm, capacity: e.target.value})}
                >
                  <option value="">선택하세요</option>
                  <option value="2">2명</option>
                  <option value="3">3명</option>
                  <option value="4">4명</option>
                  <option value="10">10명</option>
                  <option value="20">20명</option>
                </select>
              </div>

              {/* 사용여부 */}
              <div className="form-group">
                <label className="form-label">
                  사용여부 <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={roomForm.isActive}
                  onChange={(e) => setRoomForm({...roomForm, isActive: e.target.value})}
                >
                  <option value="Y">Y (사용)</option>
                  <option value="N">N (미사용)</option>
                </select>
              </div>
            </form>

            {/* 방 수정 시에만 사용자 관리 섹션 표시 */}
            {editingRoom && (
              <div className="modal-section">
                <h4 className="section-title">현재 거주자 ({editingRoom.occupants?.length || 0}/{editingRoom.capacity}명)</h4>
                
                {/* 현재 거주자 목록 */}
                <div className="occupants-list">
                  {editingRoom.occupants && editingRoom.occupants.length > 0 ? (
                    editingRoom.occupants.map((occupant, index) => (
                      <div key={index} className="occupant-item">
                        <div className="occupant-info">
                          <span className="bed-number">{occupant.bedNumber}번</span>
                          <span className="user-name">{occupant.user?.name || '이름 없음'}</span>
                          <span className="user-birth">
                            {occupant.user?.birthDate ? 
                              occupant.user.birthDate.replace(/-/g, '').substring(0, 6) : 
                              '생년월일 없음'
                            }
                          </span>
                        </div>
                        <button
                          onClick={() => removeUserFromRoom(occupant.user?._id)}
                          className="btn-remove"
                          type="button"
                        >
                          제거
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="empty-message">현재 거주자가 없습니다.</p>
                  )}
                </div>

                {/* 사용자 추가 버튼 */}
                {(!editingRoom.occupants || editingRoom.occupants.length < editingRoom.capacity) && (
                  <div className="add-user-section">
                    {!showUserSearch ? (
                      <button
                        onClick={() => setShowUserSearch(true)}
                        className="btn btn-secondary"
                        type="button"
                      >
                        + 사용자 추가
                      </button>
                    ) : (
                      <div className="user-search-form">
                        <div className="search-header">
                          <h5>사용자 검색 및 추가</h5>
                          <button
                            onClick={() => {
                              setShowUserSearch(false);
                              setUserSearchQuery('');
                              setSearchResults([]);
                              setSelectedBedNumber('');
                            }}
                            className="btn-close-search"
                            type="button"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="search-inputs">
                          <div className="form-group">
                            <label className="form-label">번호 선택</label>
                            <select
                              className="form-select"
                              value={selectedBedNumber}
                              onChange={(e) => setSelectedBedNumber(e.target.value)}
                            >
                              <option value="">번호 선택</option>
                              {Array.from({length: editingRoom.capacity}, (_, i) => i + 1)
                                .filter(bedNum => !editingRoom.occupants?.some(occ => occ.bedNumber === bedNum))
                                .map(bedNum => (
                                  <option key={bedNum} value={bedNum}>{bedNum}번</option>
                                ))
                              }
                            </select>
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label">사용자 검색 (이름 또는 생년월일)</label>
                            <input
                              type="text"
                              className="form-input"
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              placeholder="이름 또는 생년월일 6자리 입력"
                            />
                          </div>
                        </div>

                        {/* 검색 결과 */}
                        {searchResults.length > 0 && (
                          <div className="search-results">
                            <h6>검색 결과 ({searchResults.length}명)</h6>
                            {searchResults.map(user => (
                              <div key={user._id} className="search-result-item">
                                <div className="user-info">
                                  <span className="name">{user.name}</span>
                                  <span className="birth">
                                    {user.birthDate ? 
                                      user.birthDate.replace(/-/g, '').substring(0, 6) : 
                                      '생년월일 없음'
                                    }
                                  </span>
                                  <span className="email">{user.email}</span>
                                </div>
                                <button
                                  onClick={() => addUserToRoom(user._id, selectedBedNumber)}
                                  className="btn btn-primary btn-sm"
                                  type="button"
                                  disabled={!selectedBedNumber}
                                >
                                  추가
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 검색 상태 메시지 */}
                        {userSearchQuery && userSearchQuery.length >= 2 && searchResults.length === 0 && (
                          <div className="search-no-results">
                            <p>"{userSearchQuery}"에 대한 검색 결과가 없습니다.</p>
                            <p>이름 또는 생년월일 6자리로 검색해보세요.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer">
              {editingRoom && (
                <button
                  onClick={handleRoomDelete}
                  className="btn btn-danger"
                  type="button"
                >
                  삭제
                </button>
              )}
              <button
                onClick={closeRoomModal}
                className="btn btn-secondary"
                type="button"
              >
                취소
              </button>
              <button
                onClick={handleRoomSubmit}
                className="btn btn-primary"
                type="button"
              >
                {editingRoom ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminDashboard; 