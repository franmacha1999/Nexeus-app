import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../types';

interface CardItemProps {
  card: Card;
  onDelete?: (cardId: number) => void;
  onEdit?: (card: Card) => void;
  onSaveTime?: (cardId: number, hours: number) => Promise<void>; // 👈 NUEVA PROP
  currentUserId?: number;
}

export default function CardItem({ card, onDelete, onEdit, onSaveTime, currentUserId }: CardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    urgent: 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold animate-pulse shadow-sm shadow-purple-500/20',
  };

  const isMine = currentUserId && card.owner_id === currentUserId;
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const historicalHours = card.time_logs?.reduce((acc, log) => acc + log.hours, 0) || 0;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatLiveTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHistoricalHours = (totalHours: number) => {
    if (totalHours === 0) return "0m";
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-slate-800/80 p-4 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md mb-3 group flex flex-col justify-between select-none cursor-grab active:cursor-grabbing ${
        isMine ? 'border-indigo-500/50 hover:border-indigo-400' : 'border-slate-700/80 hover:border-slate-500'
      }`}
    >
      <div>
        <div className="flex justify-between items-start gap-2 mb-2">
          <h4 className="font-semibold text-white text-sm leading-snug group-hover:text-indigo-300 transition-colors">
            {card.title}
          </h4>
          
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${priorityColors[card.priority] || priorityColors.medium}`}>
              {card.priority === 'urgent' ? '🚨 URGENT' : card.priority}
            </span>

            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 p-1 rounded transition text-xs font-mono ml-0.5"
                title="Editar iniciativa"
              >
                ✏️
              </button>
            )}

            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded transition text-xs font-mono"
                title="Eliminar iniciativa"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
        
        {card.description && (
          <p className="text-slate-400 text-xs line-clamp-2 mb-3">
            {card.description}
          </p>
        )}

        {card.due_date && (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0); 
          const dueDate = new Date(card.due_date);
          dueDate.setHours(0, 0, 0, 0);

          const isOverdue = dueDate < today && card.status !== 'done';
          const isDueToday = dueDate.getTime() === today.getTime() && card.status !== 'done';

          return (
            <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md w-fit mb-3 border ${
              isOverdue 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse font-bold' 
                : isDueToday
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold'
                  : 'bg-slate-500/10 text-slate-400 border-slate-700/50'
            }`}>
              <span>{isOverdue ? '🚨 VENCIDA:' : isDueToday ? '⏳ VENCE HOY:' : '📅 Vence:'}</span>
              <span>{new Date(card.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
            </div>
          );
        })()}
      </div>

      <div>
        <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono border-t border-slate-700/50 pt-2 mt-2">
          <div className="flex items-center gap-1.5">
            <span>#{card.id}</span>
            {isMine ? (
              <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1">
                👤 Mía
              </span>
            ) : (
              <span className="text-slate-600 text-[10px]">👤 ID: {card.owner_id}</span>
            )}
          </div>
          <span>{new Date(card.created_at).toLocaleDateString()}</span>
        </div>

        <div className="mt-3 bg-slate-900/50 border border-slate-700/40 p-2 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <span>⏱️ Total:</span>
              <span className="text-indigo-400 font-bold">{formatHistoricalHours(historicalHours)}</span>
            </div>
            
            {isTimerRunning && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded animate-pulse font-bold">
                • {formatLiveTime(secondsElapsed)}
              </span>
            )}
          </div>

          <div className="flex gap-1.5">
            {!isTimerRunning ? (
              <button
                onClick={(e) => { e.stopPropagation(); setIsTimerRunning(true); }}
                className="w-full py-1 bg-slate-700/40 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 rounded-lg text-[11px] font-medium transition border border-transparent hover:border-emerald-500/20"
              >
                ▶️ Iniciar
              </button>
            ) : (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const hoursToSave = Number((secondsElapsed / 3600).toFixed(2));
                  const finalHours = hoursToSave > 0 ? hoursToSave : 0.01; 
                  
                  if (onSaveTime) {
                    setIsTimerRunning(false);
                    setSecondsElapsed(0);
                    await onSaveTime(card.id, finalHours); // 👈 DISPARA GUARDADO REAL
                  }
                }}
                className="w-full py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-[11px] font-bold transition"
              >
                ⏹️ Detener y Guardar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}