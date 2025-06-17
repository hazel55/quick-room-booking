import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Header from '../components/Header';
import '../styles/my-reservation.css';

const MyReservation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showRoomDetail, setShowRoomDetail] = useState(false);
  const [roomDetail, setRoomDetail] = useState(null);
  const [roomDetailLoading, setRoomDetailLoading] = useState(false);

  useEffect(() => {
    fetchMyReservation();
    fetchReservationHistory();
  }, []);

  const fetchMyReservation = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reservations/my');
      
      if (response.data.success) {
        setReservation(response.data.data);
      }
    } catch (err) {
      console.error('예약 정보 조회 오류:', err);
      if (err.response?.status !== 404) {
        setError('예약 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReservationHistory = async () => {
    try {
      const response = await api.get('/reservations/history');
      
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (err) {
      console.error('예약 히스토리 조회 오류:', err);
    }
  };

  const fetchRoomDetail = async (roomId) => {
    try {
      setRoomDetailLoading(true);
      const response = await api.get(`/rooms/${roomId}`);
      
      if (response.data.success) {
        setRoomDetail(response.data.data);
      }
    } catch (err) {
      console.error('방 상세정보 조회 오류:', err);
      setError('방 상세정보를 불러오는데 실패했습니다.');
    } finally {
      setRoomDetailLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!cancelReason.trim()) {
      setError('취소 사유를 입력해주세요.');
      return;
    }

    if (!reservation || !reservation._id) {
      setError('예약 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setCancelLoading(true);
      setError('');

      // 예약 ID를 사용한 직접 취소
      const response = await api.delete(`/reservations/${reservation._id}`, {
        data: { reason: cancelReason }
      });

      if (response.data.success) {
        setSuccess('예약이 취소되었습니다. 새로운 방을 예약할 수 있습니다.');
        setShowCancelModal(false);
        setReservation(null);
        fetchReservationHistory(); // 히스토리 새로고침
      }
    } catch (err) {
      console.error('예약 취소 오류:', err);
      setError(err.response?.data?.message || '예약 취소에 실패했습니다.');
    } finally {
      setCancelLoading(false);
    }
  };

  const openCancelModal = () => {
    setShowCancelModal(true);
    setCancelReason('');
    setError('');
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelReason('');
  };

  const goToRooms = () => {
    navigate('/rooms');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openRoomDetail = () => {
    if (reservation && reservation.room && reservation.room._id) {
      setShowRoomDetail(true);
      fetchRoomDetail(reservation.room._id);
    }
  };

  const closeRoomDetail = () => {
    setShowRoomDetail(false);
    setRoomDetail(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>예약 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="my-reservation-page">
        <div className="container">
        <div className="page-header">
          <h1>내 예약 정보</h1>
          <p>현재 예약 상태와 이력을 확인하세요</p>
        </div>

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

        {/* 현재 예약 정보 */}
        <div className="current-reservation-section">
          <h2>현재 예약</h2>
          
          {!reservation ? (
            <div className="no-reservation">
              <div className="no-reservation-icon">🏠</div>
              <h3>예약된 방이 없습니다</h3>
              <p>원하는 방을 선택하여 예약해보세요!</p>
              <button className="btn-primary" onClick={goToRooms}>
                방 둘러보기
              </button>
            </div>
          ) : (
            <div className="reservation-card">
              <div className="reservation-header">
                <div className="room-info">
                  <h3>{reservation.room.roomNumber}호</h3>
                  <div className="room-details">
                    <span className="floor">{reservation.room.floor}층</span>
                    <span className="capacity">{reservation.room.capacity}인실</span>
                    <span className={`gender ${reservation.room.gender}`}>
                      {reservation.room.gender}
                    </span>
                  </div>
                </div>
                <div className="bed-info">
                  <span className="bed-number">{reservation.bedNumber}번</span>
                </div>
              </div>

              <div className="reservation-details">
                <div className="detail-row">
                  <span className="label">예약일:</span>
                  <span className="value">{formatDate(reservation.reservedAt)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">상태:</span>
                  <span className={`status ${reservation.status}`}>
                    {reservation.statusDescription}
                  </span>
                </div>

                {reservation.specialRequests && (
                  <div className="detail-row">
                    <span className="label">특별 요청:</span>
                    <span className="value special-requests">
                      {reservation.specialRequests}
                    </span>
                  </div>
                )}
              </div>

            

              {reservation.room.description && (
                <div className="room-description">
                  <h4>방 정보</h4>
                  <p>{reservation.room.description}</p>
                </div>
              )}

              <div className="reservation-actions">
                <button 
                  className="btn-cancel-reservation"
                  onClick={openCancelModal}
                >
                  예약 취소
                </button>
                <button 
                  className="btn-secondary"
                  onClick={openRoomDetail}
                >
                  방 상세보기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 예약 히스토리 */}
        {history.length > 0 && (
          <div className="reservation-history-section">
            <div className="history-header">
              <h2>예약 이력</h2>
              <button 
                className="btn-toggle-history"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? '숨기기' : '보기'}
              </button>
            </div>

            {showHistory && (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item._id} className="history-item">
                    <div className="history-action">
                      <span className={`action-badge ${item.action}`}>
                        {item.actionDescription}
                      </span>
                      <span className="history-date">
                        {formatDate(item.performedAt)}
                      </span>
                    </div>
                    
                    <div className="history-details">
                      <span className="room-info">
                        {item.room.roomNumber}호 ({item.room.floor}층, {item.room.capacity}인실)
                      </span>
                      {item.bedNumber && (
                        <span className="bed-info">
                          {item.bedNumber}번
                        </span>
                      )}
                    </div>

                    {item.reason && (
                      <div className="history-reason">
                        <span className="reason-label">사유:</span>
                        <span className="reason-text">{item.reason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 예약 취소 모달 */}
        {showCancelModal && (
          <div className="modal-overlay" onClick={closeCancelModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>예약 취소</h2>
                <button className="modal-close" onClick={closeCancelModal}>×</button>
              </div>

              <div className="modal-body">
                <div className="cancel-warning">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-text">
                    <h3>정말로 예약을 취소하시겠습니까?</h3>
                    <p>취소한 예약은 되돌릴 수 없으며, 다시 예약하려면 새로 신청해야 합니다.</p>
                  </div>
                </div>

                <div className="cancel-reason">
                  <label htmlFor="cancelReason">취소 사유 <span className="required">*</span></label>
                  <textarea
                    id="cancelReason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="예약을 취소하는 사유를 입력해주세요..."
                    rows={4}
                    maxLength={200}
                    required
                  />
                  <span className="char-count">{cancelReason.length}/200</span>
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
                  onClick={closeCancelModal}
                  disabled={cancelLoading}
                >
                  돌아가기
                </button>
                <button 
                  className="btn-danger" 
                  onClick={handleCancelReservation}
                  disabled={cancelLoading || !cancelReason.trim()}
                >
                  {cancelLoading ? '취소 중...' : '예약 취소'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 방 상세보기 모달 */}
        {showRoomDetail && (
          <div className="modal-overlay" onClick={closeRoomDetail}>
            <div className="modal-content room-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{reservation?.room?.roomNumber}호 상세정보</h2>
                <button className="modal-close" onClick={closeRoomDetail}>×</button>
              </div>

              <div className="modal-body">
                {roomDetailLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>방 정보를 불러오는 중...</p>
                  </div>
                ) : roomDetail ? (
                  <div className="room-detail-content">
                    {/* 방 기본 정보 */}
                    <div className="room-basic-info">
                      <h3>방 정보</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="label">방 번호:</span>
                          <span className="value">{roomDetail.roomNumber}호</span>
                        </div>
                        <div className="info-item">
                          <span className="label">층:</span>
                          <span className="value">{roomDetail.floor}층</span>
                        </div>
                        <div className="info-item">
                          <span className="label">수용인원:</span>
                          <span className="value">{roomDetail.capacity}명</span>
                        </div>
                        <div className="info-item">
                          <span className="label">성별:</span>
                          <span className="value">
                            {roomDetail.gender === 'M' ? '남성용' : 
                             roomDetail.gender === 'F' ? '여성용' : '공용'}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">현재 입주:</span>
                          <span className="value">
                            {roomDetail.occupants?.length || 0}명 / {roomDetail.capacity}명
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 방 설명 */}
                    {roomDetail.description && (
                      <div className="room-description">
                        <h3>방 설명</h3>
                        <p>{roomDetail.description}</p>
                      </div>
                    )}

                    {/* 현재 입주자 목록 */}
                    <div className="room-occupants">
                      <h3>현재 입주자 ({roomDetail.occupants?.length || 0}명)</h3>
                      {roomDetail.occupants && roomDetail.occupants.length > 0 ? (
                        <div className="occupants-list">
                          {roomDetail.occupants.map((occupant, index) => (
                            <div key={index} className="occupant-item">
                              <div className="bed-number">
                                {occupant.bedNumber}번
                              </div>
                              <div className="occupant-info">
                                <span className="name">{occupant.user?.name || '이름 없음'}</span>
                                <span className="grade">
                                  {occupant.user?.grade === 'T' ? '선생님' : 
                                   occupant.user?.grade === 'A' ? '관리자' : 
                                   `${occupant.user?.grade}학년`}
                                </span>
                                <span className="gender">
                                  {occupant.user?.gender === 'M' ? '남성' : '여성'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-occupants">현재 입주자가 없습니다.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="error-message">
                    방 정보를 불러올 수 없습니다.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeRoomDetail}>
                  닫기
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

export default MyReservation; 