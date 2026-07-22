import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Apuntamos al endpoint correcto que definiste en auth.py
      await api.post('/auth/register', { email, password });
      
      // Redirigimos al login tras el éxito
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrarse. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Crear Cuenta en Nexeus</h1>
          <p className="text-gray-400 text-sm mt-1">Plataforma Interna de Innovación</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg text-sm mb-4">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition duration-200"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}