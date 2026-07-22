import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Preparamos los datos como FastAPI los espera (Form Data para OAuth2)
      const formData = new URLSearchParams();
      formData.append('username', email); 
      formData.append('password', password);

      // 2. Enviamos las credenciales al backend de autenticación
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // 3. Almacenamos el token JWT de forma segura en el navegador
      localStorage.setItem('nexeus_token', response.data.access_token);
      
      // Activamos una bandera temporal para mostrar el saludo de bienvenida en el tablero
      sessionStorage.setItem('show_welcome', 'true');
      
      // 4. Redirección directa hacia el tablero general de iniciativas
      window.location.href = '/board'; 
      
    } catch (err) {
      console.error(err);
      setError('Credenciales inválidas o servidor caído.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-sm">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Acceso Nexeus</h2>
          <p className="text-xs text-slate-400 mt-1">Plataforma Interna de Innovación</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs mb-4">
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="Correo electrónico"
            className="w-full p-3 bg-slate-800 rounded-lg text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Contraseña"
            className="w-full p-3 bg-slate-800 rounded-lg text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button 
            type="submit"
            className="w-full p-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition active:scale-[0.98] text-sm"
          >
            Ingresar
          </button>
        </form>

        {/* Enlace integrador hacia la pantalla de Registro */}
        <p className="text-center text-slate-400 text-xs mt-6">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-medium">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}