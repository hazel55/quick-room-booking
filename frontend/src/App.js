import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import Rooms from './pages/Rooms';
import MyReservation from './pages/MyReservation';

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// 공개 라우트 컴포넌트 (로그인된 사용자는 접근 불가)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

// 관리자 라우트 컴포넌트
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user?.adminAccess) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* 기본 경로 - 로그인 페이지로 리다이렉트 */}
            <Route path="/" element={<Navigate to="/login" />} />
            
            {/* 공개 라우트 */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />
            
            {/* 사용자 대시보드 */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* 방 목록 */}
            <Route 
              path="/rooms" 
              element={
                <ProtectedRoute>
                  <Rooms />
                </ProtectedRoute>
              } 
            />
            
            {/* 내 예약 정보 */}
            <Route 
              path="/my-reservation" 
              element={
                <ProtectedRoute>
                  <MyReservation />
                </ProtectedRoute>
              } 
            />
            
            {/* 관리자 페이지 */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            
            {/* 404 페이지 */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center bg-white p-8 rounded-lg shadow max-w-md w-full mx-4">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600 mb-4">페이지를 찾을 수 없습니다.</p>
                    <Link 
                      to="/login" 
                      className="text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      로그인 페이지로 돌아가기
                    </Link>
                  </div>
                </div>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;