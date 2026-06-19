import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/dashboard.css';

const Dashboard = () => {
  const { user, logout, updateDepositorName } = useAuth();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depositorName, setDepositorName] = useState('');
  const [isEditingDepositorName, setIsEditingDepositorName] = useState(false);
  const [depositorNameSaving, setDepositorNameSaving] = useState(false);
  const [depositorNameError, setDepositorNameError] = useState('');
  const [depositorNameSuccess, setDepositorNameSuccess] = useState('');

  const isStudent = /^[0-9]+$/.test(user?.grade || '');

  // 예약 정보 로드
  useEffect(() => {
    fetchMyReservation();
  }, []);

  useEffect(() => {
    setDepositorName(user?.depositorName || '');
  }, [user?.depositorName]);

  const fetchMyReservation = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reservations/my');
      
      if (response.data.success) {
        setReservation(response.data.data);
      }
    } catch (err) {
      console.error('예약 정보 조회 오류:', err);
      // 404는 예약이 없는 상태이므로 오류로 처리하지 않음
      if (err.response?.status !== 404) {
        console.error('예약 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDepositorNameSave = async () => {
    const trimmedName = depositorName.trim();

    if (!trimmedName) {
      setDepositorNameError('입금자 이름을 입력해주세요');
      setDepositorNameSuccess('');
      return;
    }

    if (trimmedName.length < 2) {
      setDepositorNameError('입금자 이름은 2자 이상 입력해주세요');
      setDepositorNameSuccess('');
      return;
    }

    setDepositorNameSaving(true);
    setDepositorNameError('');
    setDepositorNameSuccess('');

    const result = await updateDepositorName(trimmedName);

    setDepositorNameSaving(false);

    if (result.success) {
      setDepositorName(result.user.depositorName || '');
      setIsEditingDepositorName(false);
      setDepositorNameSuccess('입금자명이 저장되었습니다');
    } else {
      setDepositorNameError(result.message);
    }
  };

  const handleDepositorNameCancel = () => {
    setDepositorName(user?.depositorName || '');
    setIsEditingDepositorName(false);
    setDepositorNameError('');
    setDepositorNameSuccess('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <div className="dashboard-logo-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="dashboard-title">숙소 배정 시스템</h1>
        </div>

        <nav className="dashboard-nav">
        <button
            onClick={() => navigate('/dashboard')}
            className="nav-button nav-button-active"
          >
            메인
          </button>
        <button
          onClick={() => navigate('/rooms')}
          className="nav-button nav-button-active"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
          </svg>
          <span>방 목록</span>
        </button>
        <button
          onClick={() => navigate('/my-reservation')}
          className="nav-button nav-button-active"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>내 예약</span>
        </button>
        {user?.adminAccess && (
          <button
            onClick={() => navigate('/admin')}
            className="nav-button nav-button-admin"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span>관리자</span>
          </button>
        )}

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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 개인 정보 카드 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              개인 정보
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">이름:</span>
                <span className="text-sm text-gray-900">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">이메일:</span>
                <span className="text-sm text-gray-900 break-all">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">전화번호:</span>
                <span className="text-sm text-gray-900">
                  {user?.formattedPhone || user?.phone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">학년:</span>
                <span className="text-sm text-gray-900">{user?.grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">성별:</span>
                <span className="text-sm text-gray-900">{user?.gender}</span>
              </div>
              {isStudent && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-sm font-medium text-gray-500 shrink-0">입금자명:</span>
                    {!isEditingDepositorName ? (
                      <div className="text-right">
                        <span className="text-sm text-gray-900">
                          {user?.depositorName?.trim() || '미등록'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingDepositorName(true);
                            setDepositorNameError('');
                            setDepositorNameSuccess('');
                          }}
                          className="block ml-auto mt-1 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {user?.depositorName?.trim() ? '수정' : '등록'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={depositorName}
                          onChange={(e) => setDepositorName(e.target.value)}
                          maxLength={50}
                          placeholder="예) 1-1 김사랑"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          수련회비 입금 시 사용한 이름을 입력해주세요.
                        </p>
                        {depositorNameError && (
                          <p className="text-xs text-red-600 mt-1">{depositorNameError}</p>
                        )}
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={handleDepositorNameCancel}
                            disabled={depositorNameSaving}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={handleDepositorNameSave}
                            disabled={depositorNameSaving}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {depositorNameSaving ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {depositorNameSuccess && !isEditingDepositorName && (
                    <p className="text-xs text-green-600 mt-2 text-right">{depositorNameSuccess}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 방 배정 정보 카드 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              방 배정 현황
            </h2>
            <div className="text-center py-8">
              {loading ? (
                <div className="text-gray-400 text-lg mb-2">
                  예약 정보를 불러오는 중...
                </div>
              ) : reservation ? (
                <div>
                  <div className="room-info">
                    <div className="text-3xl font-bold text-indigo-600 mb-2">
                      {/^\d+$/.test(reservation.room.roomNumber) ? `${reservation.room.roomNumber}호` : reservation.room.roomNumber}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      자리 번호: <span className="font-medium">{reservation.bedNumber}번</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    상태: <span className="font-medium text-green-600">예약됨</span>
                  </div>
                  {reservation.createdAt && (
                    <div className="text-xs text-gray-500">
                      예약일: {new Date(reservation.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-gray-400 text-lg mb-2">
                    아직 방이 배정되지 않았습니다
                  </div>
                  <div className="text-sm text-gray-500">
                    방을 선택하여 예약해보세요
                  </div>
                  <button
                    onClick={() => navigate('/rooms')}
                    className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    방 둘러보기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 특별 요청사항 */}
        {reservation?.specialRequests && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              특별 요청사항
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {reservation.specialRequests}
            </p>
          </div>
        )}

        {/* 관리자 페이지 링크 (관리자 권한이 있는 경우) */}
        {user?.adminAccess && (
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-sm font-medium text-indigo-800">
                  관리자 메뉴
                </h3>
                <p className="text-xs text-indigo-600 mt-1">
                  관리자 페이지에서 회원 관리 및 방 배정을 할 수 있습니다
                </p>
              </div>
              <button
                onClick={() => navigate('/admin')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 whitespace-nowrap"
              >
                관리자 페이지
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard; 