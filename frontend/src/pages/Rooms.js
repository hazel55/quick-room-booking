import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Header from '../components/Header';
import '../styles/rooms.css';

const Rooms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reservationLoading, setReservationLoading] = useState(false);
  
  // 예약 설정 상태
  const [reservationSettings, setReservationSettings] = useState(null);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    floor: 'all',
    capacity: 'all',
    gender: 'all',
    availableOnly: true
  });
  
  // 모달 상태
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    fetchRooms();
    fetchReservationSettings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [rooms, filters]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rooms?limit=100');
      
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (err) {
      console.error('방 목록 조회 오류:', err);
      setError('방 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReservationSettings = async () => {
    try {
      const response = await api.get('/reservation-settings');
      
      if (response.data.success) {
        setReservationSettings(response.data.data);
        setIsReservationOpen(response.data.data.isOpenNow);
      }
    } catch (err) {
      console.error('예약 설정 조회 오류:', err);
      // 예약 설정 조회 실패 시 기본값으로 예약 불가능하게 설정
      setIsReservationOpen(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...rooms];

    // 학생일 경우 본인 성별의 방만 조회 (선생님, 관리자는 모든 방 조회 가능)
    if (user.grade !== 'T' && user.grade !== 'A') {
      filtered = filtered.filter(room => room.gender === user.gender);
    }

    // 층별 필터
    if (filters.floor !== 'all') {
      filtered = filtered.filter(room => room.floor === parseInt(filters.floor));
    }

    // 인실별 필터
    if (filters.capacity !== 'all') {
      filtered = filtered.filter(room => room.capacity === parseInt(filters.capacity));
    }

    // 성별 필터 (학생이 아닌 경우에만 적용)
    if (filters.gender !== 'all' && (user.grade === 'T' || user.grade === 'A')) {
      filtered = filtered.filter(room => room.gender === filters.gender);
    }

    // 사용 가능한 방만 필터
    if (filters.availableOnly) {
      filtered = filtered.filter(room => room.availableBeds > 0);
    }

    setFilteredRooms(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openReservationModal = (room) => {
    // 예약 오픈 시간 확인
    if (!isReservationOpen) {
      if (reservationSettings) {
        const openDateTime = new Date(reservationSettings.openDateTime);
        const openDateTimeKorean = openDateTime.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        if (reservationSettings.timeUntilOpen > 0) {
          const days = Math.floor(reservationSettings.timeUntilOpen / (1000 * 60 * 60 * 24));
          const hours = Math.floor((reservationSettings.timeUntilOpen % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((reservationSettings.timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60));
          
          setError(`아직 예약 오픈 시간이 아닙니다.\n오픈 예정: ${openDateTimeKorean}\n남은 시간: ${days}일 ${hours}시간 ${minutes}분`);
        } else {
          setError(`예약이 마감되었습니다.\n오픈 예정: ${openDateTimeKorean}`);
        }
      } else {
        setError('현재 예약이 불가능합니다. 관리자에게 문의해주세요.');
      }
      return;
    }

    // 성별 체크
    if (room.gender !== user.gender) {
      setError(`이 방은 ${room.gender}용 방입니다. ${user.gender === '남자' ? '남성' : '여성'}용 방을 선택해주세요.`);
      return;
    }

    if (room.availableBeds === 0) {
      setError('이 방은 만실입니다. 다른 방을 선택해주세요.');
      return;
    }

    setSelectedRoom(room);
    setSelectedBed(null);
    setSpecialRequests('');
    setShowReservationModal(true);
    setError('');
  };

  const handleReservation = async () => {
    if (!selectedBed) {
      setError('번호를 선택해주세요.');
      return;
    }

    try {
      setReservationLoading(true);
      setError('');

      const response = await api.post('/reservations', {
        roomId: selectedRoom._id,
        bedNumber: selectedBed,
        specialRequests
      });

      if (response.data.success) {
        setSuccess('예약이 완료되었습니다!');
        setShowReservationModal(false);
        fetchRooms(); // 방 목록 새로고침
        
        // 내 예약 페이지로 이동
        setTimeout(() => {
          navigate('/my-reservation');
        }, 2000);
      }
    } catch (err) {
      console.error('예약 오류:', err);
      setError(err.response?.data?.message || '예약에 실패했습니다.');
    } finally {
      setReservationLoading(false);
    }
  };

  const closeModal = () => {
    setShowReservationModal(false);
    setSelectedRoom(null);
    setSelectedBed(null);
    setSpecialRequests('');
  };

  // 방이 현재 사용자 성별과 맞지 않는지 확인
  const isGenderMismatch = (room) => {
    return room.gender !== user.gender;
  };

  // 침대 상태 렌더링
  const renderBedStatus = (room) => {
    const beds = [];
    for (let i = 1; i <= room.capacity; i++) {
      const occupant = room.occupants.find(occ => occ.bedNumber === i);
      const isOccupied = !!occupant;
      beds.push(
        <div
          key={i}
          className={`bed-item ${isOccupied ? 'occupied' : 'available'} ${
            selectedBed === i ? 'selected' : ''
          }`}
          onClick={() => !isOccupied && setSelectedBed(i)}
        >
          <div className="bed-number">{i}번</div>
          {isOccupied && (
            <div className="occupant-info">
              <span className="occupied-label">점유</span>
              {occupant.user && occupant.user.name && (
                <span className="occupant-name">{occupant.user.name}</span>
              )}
            </div>
          )}
        </div>
      );
    }
    return beds;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>방 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="rooms-page">
        <div className="container">
        <div className="page-header">
          <h1>방 목록</h1>
          <p>원하는 방을 선택하여 예약하세요</p>
          <p>기준 인원 이하로 예약한 경우 추후 다른 방 인원과 통합될 수 있습니다.</p>
          <p>(예시: 2인실 방에 1명 예약/3인실 방에 2명 예약/4인실 방에 3명 예약 등 인원 미달시 다른 방으로 통합되거나 다른 인원이 들어올 수 있습니다.)</p>
        </div>

        {/* 예약 상태 알림 */}
        {reservationSettings && (
          <div className={`reservation-status-banner ${isReservationOpen ? 'open' : 'closed'}`}>
            <div className="status-content">
              <div className="status-icon">
                {isReservationOpen ? '🟢' : '🔴'}
              </div>
              <div className="status-info">
                <h3>
                  {isReservationOpen ? '예약 오픈' : '예약 준비'}
                </h3>
                <p>
                  {isReservationOpen ? (
                    '지금 방 예약이 가능합니다!'
                  ) : (
                    <>
                      오픈 예정: {new Date(reservationSettings.openDateTime).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {reservationSettings.timeUntilOpen > 0 && (
                        <span className="countdown">
                          {' '}(남은 시간: {Math.floor(reservationSettings.timeUntilOpen / (1000 * 60 * 60 * 24))}일{' '}
                          {Math.floor((reservationSettings.timeUntilOpen % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}시간{' '}
                          {Math.floor((reservationSettings.timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60))}분)
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 알림 메시지 */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError('')} className="alert-close">×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="alert-close">×</button>
          </div>
        )}

        {/* 학생용 안내 메시지 */}
        {user.grade !== 'T' && user.grade !== 'A' && (
          <div className="student-info-banner">
            <div className="info-content">
              <span className="info-icon">ℹ️</span>
                             <span>
                 {user.gender === 'M' ? '남성용' : user.gender === 'F' ? '여성용' : '본인 성별'} 방만 표시됩니다.
               </span>
            </div>
          </div>
        )}

        {/* 필터 영역 */}
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <label>층</label>
              <select 
                value={filters.floor} 
                onChange={(e) => handleFilterChange('floor', e.target.value)}
              >
                <option value="all">전체</option>
                <option value="1">1층</option>
                <option value="2">2층</option>
                <option value="3">3층</option>
              </select>
            </div>

            <div className="filter-group">
              <label>인실</label>
              <select 
                value={filters.capacity} 
                onChange={(e) => handleFilterChange('capacity', e.target.value)}
              >
                <option value="all">전체</option>
                <option value="2">2인실</option>
                <option value="3">3인실</option>
                <option value="4">4인실</option>
                <option value="10">10인실</option>
              </select>
            </div>

            {/* 성별 필터 (선생님, 관리자만 표시) */}
            {(user.grade === 'T' || user.grade === 'A') && (
              <div className="filter-group">
                <label>성별</label>
                <select 
                  value={filters.gender} 
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                >
                  <option value="all">전체</option>
                  <option value="M">남성용</option>
                  <option value="F">여성용</option>

                </select>
              </div>
            )}

            <div className="filter-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.availableOnly}
                  onChange={(e) => handleFilterChange('availableOnly', e.target.checked)}
                />
                사용 가능한 방만 보기
              </label>
            </div>
          </div>
        </div>

        {/* 방 목록 */}
        <div className="rooms-grid">
          {filteredRooms.length === 0 ? (
            <div className="no-rooms">
              <p>조건에 맞는 방이 없습니다.</p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <div 
                key={room._id} 
                className={`room-card ${isGenderMismatch(room) ? 'gender-mismatch' : ''} ${
                  room.availableBeds === 0 ? 'full' : ''
                }`}
              >
                <div className="room-header">
                  <h3>{/^\d+$/.test(room.roomNumber) ? `${room.roomNumber}호` : room.roomNumber}</h3>
                  <div className="room-tags">
                    <span className="floor-tag">{room.floor}층</span>
                    <span className="capacity-tag">{room.capacity}인실</span>
                    <span className={`gender-tag ${room.gender}`}>
                      {room.gender === 'M' ? '남성' : room.gender === 'F' ? '여성' : room.gender}
                    </span>
                  </div>
                </div>

                <div className="room-info">
                  <div className="occupancy-info">
                    <span className="current">{room.occupants.length}</span>
                    <span className="separator">/</span>
                    <span className="total">{room.capacity}</span>
                    <span className="label">명</span>
                  </div>

                  <div className="availability">
                    <span className={`status ${room.availableBeds > 0 ? 'available' : 'full'}`}>
                      {room.availableBeds > 0 ? `${room.availableBeds}자리 남음` : '만실'}
                    </span>
                  </div>
                </div>



                {room.description && (
                  <p className="room-description">{room.description}</p>
                )}

                <div className="room-actions">
                  {!isReservationOpen ? (
                    <button className="btn-reserve disabled" disabled>
                      예약 준비
                    </button>
                  ) : isGenderMismatch(room) ? (
                    <button className="btn-reserve disabled" disabled>
                      성별 불일치
                    </button>
                  ) : room.availableBeds === 0 ? (
                    <button className="btn-reserve disabled" disabled>
                      만실
                    </button>
                  ) : (
                    <button 
                      className="btn-reserve"
                      onClick={() => openReservationModal(room)}
                    >
                      예약하기
                    </button>
                  )}
                </div>

                {/* 성별 불일치 시 마스킹 */}
                {isGenderMismatch(room) && <div className="gender-mask"></div>}
              </div>
            ))
          )}
        </div>

        {/* 예약 모달 */}
        {showReservationModal && selectedRoom && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{/^\d+$/.test(selectedRoom.roomNumber) ? `${selectedRoom.roomNumber}호 예약` : `${selectedRoom.roomNumber} 예약`}</h2>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>

              <div className="modal-body">
                <div className="room-details">
                  <p><strong>층:</strong> {selectedRoom.floor}층</p>
                  <p><strong>인실:</strong> {selectedRoom.capacity}인실</p>
                  <p><strong>성별:</strong> {selectedRoom.gender === 'M' ? '남성용' : selectedRoom.gender === 'F' ? '여성용' : selectedRoom.gender}</p>
                  <p><strong>사용 가능 번호:</strong> {selectedRoom.availableBeds}개</p>
                </div>

                <div className="bed-selection">
                  <h3>번호 선택</h3>
                  <div className="beds-grid">
                    {renderBedStatus(selectedRoom)}
                  </div>
                  <p className="bed-legend">
                    <span className="legend-item">
                      <span className="legend-color available"></span>
                      사용 가능
                    </span>
                    <span className="legend-item">
                      <span className="legend-color occupied"></span>
                      점유 중
                    </span>
                  </p>
                </div>



                {error && (
                  <div className="alert alert-error">
                    {error}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button 
                  className="btn-cancel" 
                  onClick={closeModal}
                  disabled={reservationLoading}
                >
                  취소
                </button>
                <button 
                  className="btn-confirm" 
                  onClick={handleReservation}
                  disabled={reservationLoading || !selectedBed}
                >
                  {reservationLoading ? '예약 중...' : '예약 확정'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Rooms; 