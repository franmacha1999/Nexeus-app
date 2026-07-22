import axios from 'axios';

// URL hardcodeada temporalmente para producción
const API_URL = "https://nexeus-app.onrender.com";

console.log("🔍 [DEBUG NEXEUS] Dirección de la API leída:", API_URL);

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