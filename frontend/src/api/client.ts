import axios from 'axios';

// 1. DEFINIMOS LA DIRECCIÓN DEL SERVIDOR
// Apuntamos directamente a tu backend de FastAPI corriendo en el puerto 8000
const API_URL = 'http://localhost:8000';

// 2. CREAMOS NUESTRO CLIENTE DE CONEXIÓN
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 3. EL "INTERCEPTOR" DE SEGURIDAD (¡LA MAGIA DEL JWT!)
// Antes de que cualquier petición salga del frontend hacia FastAPI, este código
// revisa si tenemos una "pulsera de acceso" (Token) guardada en el navegador.
// Si la encuentra, se la pega en la cabecera (Header) automáticamente.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexeus_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;