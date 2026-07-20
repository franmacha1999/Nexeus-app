import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importamos para resolver el botón de volver
import api from '../api/client';

interface TimeLog {
  id: number;
  hours: number;
  note?: string;
  created_at: string;
  task_title?: string;
  task_id: number;
}

export default function HoursPage() {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate(); // Hook para manejar el retorno de página

  // 🗓️ Cálculo de los límites de la semana (Lunes a Domingo)
  const getWeekRange = (date: Date) => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para que empiece el Lunes
    
    const startOfWeek = new Date(current.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { startOfWeek, endOfWeek };
  };

  const { startOfWeek, endOfWeek } = getWeekRange(currentDate);

  useEffect(() => {
    const fetchMyHours = async () => {
      try {
        setLoading(true);
        // Formateamos las fechas en formato YYYY-MM-DD para la API del backend
        const startStr = startOfWeek.toISOString().split('T')[0];
        const endStr = endOfWeek.toISOString().split('T')[0];
        
        const res = await api.get(`/users/me/time_logs?start_date=${startStr}&end_date=${endStr}`);
        setTimeLogs(res.data);
      } catch (err) {
        console.error('Error al cargar las horas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyHours();
  }, [currentDate]);

  // 🧮 Agrupación y suma de horas acumuladas por día de la semana
  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  const hoursByDay = daysOfWeek.reduce((acc, _, index) => {
    acc[index] = 0;
    return acc;
  }, {} as Record<number, number>);

  timeLogs.forEach(log => {
    const logDate = new Date(log.created_at);
    let dayIndex = logDate.getDay() - 1; // Convertimos a index 0-6 empezando en Lunes
    if (dayIndex === -1) dayIndex = 6;   // Ajuste para el Domingo
    if (hoursByDay[dayIndex] !== undefined) {
      hoursByDay[dayIndex] += log.hours;
    }
  });

  const totalWeeklyHours = timeLogs.reduce((acc, log) => acc + log.hours, 0);

  // 🔄 Manejador de navegación entre semanas (atrás / adelante)
  const navigateWeek = (weeks: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + weeks * 7);
    setCurrentDate(newDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        <span className="animate-spin mr-2">🔄</span> Calculando tu hoja de tiempos...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      {/* Botón de retorno superior para evitar usar la flecha del navegador */}
      <div className="max-w-5xl mx-auto mb-4">
        <button 
          onClick={() => navigate('/board')} // Te lleva directo al tablero de forma SPA
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 transition flex items-center gap-1.5"
        >
          ← Volver al Tablero
        </button>
      </div>

      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-5xl mx-auto border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Horas</h1>
          {/* CORRECCIÓN DE MARCA: Cambiado NeoCare Health por Nexeus para cumplir la especificación */}
          <p className="text-xs text-slate-400 mt-1">Hojas de tiempo personales • Nexeus</p>
        </div>

        {/* Componente de Navegación Semanal */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <button onClick={() => navigateWeek(-1)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono transition">
            ◀ Ant
          </button>
          <span className="text-xs font-mono px-2 text-slate-300">
            {startOfWeek.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - {endOfWeek.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </span>
          <button onClick={() => navigateWeek(1)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono transition">
            Sig ▶
          </button>
        </div>
      </header>

      {/* Tarjetas de Indicadores de Totales Diarios */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-7 gap-3 mb-8">
        {daysOfWeek.map((day, idx) => (
          <div key={day} className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-center shadow-inner">
            <span className="text-[11px] text-slate-500 block uppercase tracking-wider font-mono font-bold">{day}</span>
            <span className={`text-lg font-bold block mt-1 ${hoursByDay[idx] > 0 ? 'text-indigo-400' : 'text-slate-700'}`}>
              {hoursByDay[idx] > 0 ? `${hoursByDay[idx].toFixed(2)}h` : '0h'}
            </span>
          </div>
        ))}
      </div>

      {/* Bloque Principal del Historial de Registros */}
      <div className="max-w-5xl mx-auto bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-md">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
          <h3 className="font-semibold text-slate-200 text-sm">Detalle de Actividad</h3>
          <div className="text-xs font-mono text-slate-400">
            Total Semanal: <span className="text-emerald-400 font-bold">{totalWeeklyHours.toFixed(2)} horas</span>
          </div>
        </div>

        {timeLogs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-600">
            <span className="text-2xl mb-2">⏱️</span>
            <p className="text-xs">No registraste horas en este rango de fechas.</p>
            <p className="text-[10px] text-slate-700 mt-1">Usa el temporizador de tus iniciativas en el tablero para sumar tiempo.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {timeLogs.map((log) => (
              <div key={log.id} className="bg-slate-800/40 border border-slate-700/30 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-slate-600 transition">
                <div>
                  {/* CONTROL DE BUG: Validamos que si el ID o título es undefined, muestre un texto genérico limpio */}
                  <span className="text-indigo-300 font-medium block">
                    {log.task_title || (log.task_id ? `Iniciativa #${log.task_id}` : 'Iniciativa General')}
                  </span>
                  {log.note && <p className="text-slate-400 text-[11px] mt-0.5 italic">"{log.note}"</p>}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto shrink-0 font-mono text-[11px]">
                  <span className="text-slate-500">{new Date(log.created_at).toLocaleDateString()}</span>
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
                    +{log.hours.toFixed(2)}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}