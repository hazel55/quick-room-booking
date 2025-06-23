import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내에서 사용되어야 합니다');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 인증 상태 확인
  const isAuthenticated = !!user;

  // 로그인 함수
  const login = async (credentials) => {
    try {
      console.log('🔑 로그인 시도:', { email: credentials.email });
      console.log('🌐 API 호출 URL:', authAPI.login.toString());
      
      const response = await authAPI.login(credentials);
      
      console.log('✅ 로그인 성공:', { user: response.data.user?.name });
      
      // 응답 데이터 검증
      if (!response.data) {
        throw new Error('서버로부터 올바른 응답을 받지 못했습니다.');
      }
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('로그인 정보가 올바르지 않습니다.');
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('❌ 로그인 오류 상세:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      
      // 네트워크 에러 처리
      if (!error.response) {
        return {
          success: false,
          message: '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
        };
      }
      
      // HTTP 상태 코드별 처리
      const status = error.response.status;
      let message;
      
      switch (status) {
        case 400:
          message = '입력한 정보가 올바르지 않습니다.';
          break;
        case 401:
          message = '이메일 또는 비밀번호가 잘못되었습니다.';
          break;
        case 403:
          message = '로그인이 차단되었습니다. 관리자에게 문의하세요.';
          break;
        case 404:
          message = '존재하지 않는 계정입니다.';
          break;
        case 500:
          message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          break;
        default:
          message = error.response?.data?.message || '로그인 중 오류가 발생했습니다.';
      }
      
      return {
        success: false,
        message: message
      };
    }
  };

  // 회원가입 함수
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('회원가입 오류:', error);
      return {
        success: false,
        message: error.response?.data?.message || '회원가입 중 오류가 발생했습니다',
        errors: error.response?.data?.errors
      };
    }
  };

  // 로그아웃 함수
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // 토큰으로 사용자 정보 로드
  const loadUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getProfile();
      setUser(response.data.user);
    } catch (error) {
      console.error('사용자 정보 로드 오류:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    loadUser();
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    loadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 