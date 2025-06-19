import axios from 'axios';

// 환경별 API URL 설정
const getApiBaseUrl = () => {
  // 환경변수가 있으면 우선 사용
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 현재 호스트 기반으로 자동 결정
  const currentHost = window.location.hostname;
  
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://localhost:3001/api';
  } else if (currentHost === 'snl.blifeinc.com') {
    return 'http://snl.blifeinc.com/api';
  } else {
    // 기본값
    return 'http://localhost:3001/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

console.log('🌐 API Base URL:', API_BASE_URL);

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 첨부
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 토큰 만료 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 인증 관련 API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
};

// 사용자 관리 API (관리자용)
export const userAPI = {
  getUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  assignRoom: (id, roomData) => api.put(`/users/${id}/assign-room`, roomData),
  cancelRoomAssignment: (id) => api.delete(`/users/${id}/room-assignment`),
  searchUsers: (query, excludeAssigned = true) => 
    api.get(`/users/search?query=${encodeURIComponent(query)}&excludeAssigned=${excludeAssigned}`),
  repairDataConsistency: () => api.post('/reservations/repair-consistency'),
};

// 방 관리 API (관리자용)
export const roomAPI = {
  getRooms: () => api.get('/rooms'),
  getRoomsForAdmin: () => api.get('/rooms?admin=true'),
  getRoom: (id) => api.get(`/rooms/${id}`),
  createRoom: (roomData) => api.post('/rooms', roomData),
  updateRoom: (id, roomData) => api.put(`/rooms/${id}`, roomData),
  deleteRoom: (id) => api.delete(`/rooms/${id}`),
  initializeRooms: () => api.post('/rooms/initialize'),
  getRoomStats: () => api.get('/rooms/stats'),
};

// 예약 설정 API (관리자용)
export const reservationSettingsAPI = {
  getSettings: () => api.get('/reservation-settings'),
  updateSettings: (settingsData) => api.put('/reservation-settings', settingsData),
  toggleOpen: () => api.patch('/reservation-settings/toggle'),
};

export default api; 