import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Card, CreateCardData, PriorityType, StatusType } from '../types';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardUpdated: (updatedCard: Card) => void;
  cardToEdit: Card | null;
}

export default function EditCardModal({ isOpen, onClose, onCardUpdated, cardToEdit }: EditCardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityType>('medium');
  const [status, setStatus] = useState<StatusType>('todo');
  const [dueDate, setDueDate] = useState(''); // 👈 Estado para la fecha

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cardToEdit) {
      setTitle(cardToEdit.title);
      setDescription(cardToEdit.description || '');
      setPriority(cardToEdit.priority as PriorityType);
      setStatus(cardToEdit.status as StatusType);
      
      // 👈 Extrae solo 'YYYY-MM-DD' si la fecha existe en la iniciativa
      if (cardToEdit.due_date) {
        setDueDate(cardToEdit.due_date.split('T')[0]);
      } else {
        setDueDate('');
      }
    }
  }, [cardToEdit]);

  if (!isOpen || !cardToEdit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      setError('');

      const updatedData: CreateCardData = {
        title,
        description: description || undefined,
        priority,
        status,
        due_date: dueDate || undefined, // 👈 Sincroniza la edición de la fecha
      };

      const response = await api.put(`/tasks/${cardToEdit.id}`, updatedData);
      onCardUpdated(response.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Hubo un error al actualizar la iniciativa en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>✏️</span> Editar Iniciativa
            </h3>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: #{cardToEdit.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-mono">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">TÍTULO DE LA INICIATIVA *</label>
            <input
              type="text"
              placeholder="Ej: Integrar API de laboratorios..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">DESCRIPCIÓN (OPCIONAL)</label>
            <textarea
              placeholder="Detalles técnicos, alcance, objetivos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">PRIORIDAD</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="low">Low (Baja)</option>
                <option value="medium">Medium (Media)</option>
                <option value="high">High (Alta)</option>
                <option value="urgent" className="font-bold text-purple-400">🚨 Urgent (Urgente)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ESTADO / COLUMNA</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusType)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="todo">Por Hacer</option>
                <option value="in_progress">En Progreso</option>
                <option value="review">En Revisión</option>
                <option value="done">Listo</option>
              </select>
            </div>
          </div>

          {/* FECHA DE VENCIMIENTO 👈 NUEVO CAMPO */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">FECHA DE VENCIMIENTO (OPCIONAL)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-indigo-600/30 flex items-center gap-1"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}