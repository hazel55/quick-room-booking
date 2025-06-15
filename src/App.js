import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, Box, Container, useToast } from '@chakra-ui/react';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import theme from './theme';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const toast = useToast();

  useEffect(() => {
    // 로컬 스토리지에서 인증 상태 확인
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    toast({
      title: '로그인 성공',
      description: '환영합니다!',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast({
      title: '로그아웃',
      description: '안전하게 로그아웃되었습니다.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Box minH="100vh" bg="gray.50">
          <Header isAuthenticated={isAuthenticated} user={user} onLogout={handleLogout} />
          <Container maxW="container.xl" py={8}>
            <Routes>
              <Route 
                path="/login" 
                element={
                  !isAuthenticated ? (
                    <Login onLogin={handleLogin} />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                } 
              />
              <Route 
                path="/register" 
                element={
                  !isAuthenticated ? (
                    <Register onRegister={handleLogin} />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  isAuthenticated ? (
                    <Dashboard user={user} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ChakraProvider>
  );
}

export default App; 