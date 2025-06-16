import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-semibold text-gray-900">
              숙소 배정 시스템
            </h1>
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-3 py-2 text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                대시보드
              </button>
              <button
                onClick={() => navigate('/rooms')}
                className={`px-3 py-2 text-sm font-medium ${
                  isActive('/rooms')
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                방 목록
              </button>
              <button
                onClick={() => navigate('/my-reservation')}
                className={`px-3 py-2 text-sm font-medium ${
                  isActive('/my-reservation')
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                내 예약
              </button>
              {user?.adminAccess && (
                <button
                  onClick={() => navigate('/admin')}
                  className={`px-3 py-2 text-sm font-medium ${
                    isActive('/admin')
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-indigo-600 hover:text-indigo-700'
                  }`}
                >
                  관리자
                </button>
              )}
            </nav>
          </div>
          
          {/* 모바일 메뉴 */}
          <div className="md:hidden">
            <select 
              value={location.pathname} 
              onChange={(e) => navigate(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="/dashboard">대시보드</option>
              <option value="/rooms">방 목록</option>
              <option value="/my-reservation">내 예약</option>
              {user?.adminAccess && (
                <option value="/admin">관리자</option>
              )}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              안녕하세요, {user?.name}님
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 