import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validamos que las contraseñas coincidan antes de enviar
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, revísalas.');
      return;
    }

    setLoading(true);

    try {
      // Envía los datos al backend (el backend solo espera email y password)
      await api.post('/auth/register', { email, password });
      
      // Redirige al login tras el éxito
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrarse. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-sm">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Crear Cuenta Nexeus</h2>
          <p className="text-xs text-slate-400 mt-1">Plataforma Interna de Innovación</p>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs mb-4">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
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
          <input 
            type="password" 
            placeholder="Confirmar contraseña"
            className="w-full p-3 bg-slate-800 rounded-lg text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition active:scale-[0.98] text-sm"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-xs mt-6">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}