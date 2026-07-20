import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import BoardPage from './pages/BoardPage';
import HoursPage from './pages/HoursPage';
import ReportsPage from './pages/ReportsPage';

export default function App() {
  // Comprobamos si el usuario ya tiene su token JWT guardado
  const isAuthenticated = !!localStorage.getItem('nexeus_token');

  return (
    <Router>
      <Routes>
        {/* Ruta Pública: Si ya está autenticado, lo manda directo al tablero */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/board" />} 
        />

        {/* Rutas Privadas Protegidas */}
        <Route 
          path="/board" 
          element={isAuthenticated ? <BoardPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/hours" 
          element={isAuthenticated ? <HoursPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/reports" 
          element={isAuthenticated ? <ReportsPage /> : <Navigate to="/login" />} 
        />

        {/* Redirección por defecto ante cualquier ruta desconocida */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/board" : "/login"} />} 
        />
      </Routes>
    </Router>
  );
}