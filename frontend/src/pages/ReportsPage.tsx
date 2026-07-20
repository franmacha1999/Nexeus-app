import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 🧭 Importamos el hook para la navegación interna SPA
import api from '../api/client';

// 📋 Definición estricta de la estructura de datos del reporte según el Backend
interface ReportData {
  week: string;
  completed_tasks_count: number;
  overdue_tasks_count: number;
  new_tasks_count: number;
  total_hours: number;
  hours_by_task: { task_id: number; title: string; hours: number }[];
  hours_by_user: { user_id: number; email: string; hours: number }[];
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // 🎛️ Inicializamos el enrutador para el botón "Volver"
  
  // 🗓️ Obtener la semana actual en formato YYYY-Www necesario para la especificación
  const getCurrentWeekString = () => {
    const today = new Date();
    const target = new Date(today.valueOf());
    const dayNumber = (today.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    return `${today.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekString());

  // 🔄 Efecto para consultar las métricas de la semana seleccionada
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/reports/weekly?week=${selectedWeek}`);
        setReport(res.data);
      } catch (err) {
        console.error('Error al generar informe:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedWeek]);

  // 📥 Exportador nativo de archivos CSV basado en la especificación de Nexeus
  const exportToCSV = () => {
    if (!report) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Encabezados y Metadatos generales
    csvContent += `Reporte Semanal Nexeus - Semana: ${report.week}\n`;
    csvContent += `Iniciativas Nuevas,${report.new_tasks_count}\n`;
    csvContent += `Iniciativas Completadas,${report.completed_tasks_count}\n`;
    csvContent += `Iniciativas Vencidas,${report.overdue_tasks_count}\n`;
    csvContent += `Total de Horas Consolidadas,${report.total_hours}\n\n`;

    // Desglose de distribución por Iniciativa
    csvContent += "ID Iniciativa,Titulo de Iniciativa,Horas Invertidas\n";
    report.hours_by_task.forEach(t => {
      csvContent += `${t.task_id},"${t.title.replace(/"/g, '""')}",${t.hours}\n`;
    });

    csvContent += "\nID Usuario,Colaborador (Email),Horas Invertidas\n";
    report.hours_by_user.forEach(u => {
      csvContent += `${u.user_id},${u.email},${u.hours}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Semanal_${report.week}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ⏳ Pantalla de Carga Estilizada
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        <span className="animate-spin mr-2">🔍</span> Estructurando métricas e indicadores de rendimiento...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      
      {/* 🧭 Botón de navegación superior (Regresar al Tablero) */}
      <div className="max-w-5xl mx-auto mb-4">
        <button 
          onClick={() => navigate('/board')} // Redirección interna directa sin recargar
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800/80 transition flex items-center gap-1.5 active:scale-[0.98]"
        >
          ← Volver al Tablero
        </button>
      </div>

      {/* 📋 Encabezado de la Página */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-5xl mx-auto border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Informe Semanal</h1>
          <p className="text-xs text-slate-400 mt-1">Métricas de innovación y esfuerzo acumulado • Nexeus</p>
        </div>

        {/* Controles de Acción (Filtro por semana y Exportador) */}
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="week" 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button 
            onClick={exportToCSV}
            disabled={!report}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-emerald-600/10 flex items-center gap-1.5"
          >
            📥 Exportar CSV
          </button>
        </div>
      </header>

      {/* 🚫 Estado Alternativo: Sin Datos Disponibles */}
      {!report ? (
        <div className="max-w-5xl mx-auto p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
          No se pudieron mapear datos para la semana seleccionada.
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* 📊 Fila superior de Indicadores Core */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-500 font-mono font-bold block">✨ NUEVAS INICIATIVAS</span>
              <span className="text-2xl font-bold text-indigo-400 mt-1 block">{report.new_tasks_count}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-500 font-mono font-bold block">✅ COMPLETADAS</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">{report.completed_tasks_count}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-500 font-mono font-bold block">🚨 VENCIDAS</span>
              <span className="text-2xl font-bold text-rose-400 mt-1 block">{report.overdue_tasks_count}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-500 font-mono font-bold block">⏱️ TOTAL HORAS INVERTIDAS</span>
              <span className="text-2xl font-bold text-white mt-1 block">{report.total_hours.toFixed(2)}h</span>
            </div>
          </div>

          {/* 📈 Grillas de distribución de horas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Esfuerzo por Iniciativa */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-slate-200 text-sm border-b border-slate-800/60 pb-2 mb-3">Horas por Iniciativa</h3>
              {report.hours_by_task.length === 0 ? (
                <p className="text-xs text-slate-600 py-4 font-mono">Sin registros de tiempo cargados esta semana.</p>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {report.hours_by_task.map(t => (
                    <div key={t.task_id} className="flex justify-between items-center text-xs bg-slate-800/20 border border-slate-800 p-2 rounded-xl">
                      <span className="text-slate-300 truncate max-w-[70%]">#{t.task_id} - {t.title}</span>
                      <span className="font-mono text-indigo-400 font-bold shrink-0">{t.hours.toFixed(2)}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Esfuerzo por Usuario */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-slate-200 text-sm border-b border-slate-800/60 pb-2 mb-3">Esfuerzo por Colaborador</h3>
              {report.hours_by_user.length === 0 ? (
                <p className="text-xs text-slate-600 py-4 font-mono">Sin actividad registrada en el equipo de innovación.</p>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {report.hours_by_user.map(u => (
                    <div key={u.user_id} className="flex justify-between items-center text-xs bg-slate-800/20 border border-slate-800 p-2 rounded-xl">
                      <span className="text-slate-300 truncate font-mono">👤 {u.email}</span>
                      <span className="font-mono text-emerald-400 font-bold shrink-0">{u.hours.toFixed(2)}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}