import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import api from '../api/client';
import type { Card, User, StatusType, PriorityType } from '../types';
import CardItem from '../components/CardItem';
import NewCardModal from '../components/NewCardModal';
import EditCardModal from '../components/EditCardModal';

// 📦 SUB-COMPONENTE: Contenedor de columna preparado para recibir elementos arrastrados
interface BoardColumnProps {
  column: { id: StatusType; title: string; color: string };
  cards: Card[];
  currentUser: User | null;
  onDelete: (id: number) => void;
  onEdit: (card: Card) => void;
  onSaveTime: (id: number, hours: number) => Promise<void>;
}

function BoardColumn({ column, cards, currentUser, onDelete, onEdit, onSaveTime }: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div className={`bg-slate-900/50 rounded-2xl border border-slate-800 border-t-4 ${column.color} p-4 min-h-[500px] flex flex-col`}>
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
        <h3 className="font-semibold text-slate-200 text-sm">{column.title}</h3>
        <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
          {cards.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length > 0 ? (
            cards.map((card) => (
              <CardItem 
                key={card.id} 
                card={card} 
                onDelete={onDelete}
                onEdit={onEdit}
                onSaveTime={onSaveTime}
                currentUserId={currentUser?.id}
              />
            ))
          ) : (
            <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-800/40 rounded-xl text-slate-600 text-xs p-4 text-center pointer-events-none">
              <span>Sin iniciativas acá</span>
              <span className="text-[10px] text-slate-700 mt-1">Arrastrá una tarea hasta este espacio.</span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// 🏛️ COMPONENTE PRINCIPAL
export default function BoardPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PriorityType | 'all'>('all');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false); 

  //  Estados para controlar la ventana de cerrar sesión y la alerta de bienvenida
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        setLoading(true);
        const [tasksRes, userRes] = await Promise.all([
          api.get('/tasks/'),
          api.get('/users/me')
        ]);
        
        setCards(tasksRes.data);
        setCurrentUser(userRes.data); 
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar la información del servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchBoardData();
  }, []);

  //  Efecto para detectar si venimos del login y mostrar el saludo por 4 segundos
  useEffect(() => {
    if (sessionStorage.getItem('show_welcome') === 'true') {
      setShowWelcomeToast(true);
      sessionStorage.removeItem('show_welcome'); // Limpiamos para que no salga al refrescar la página

      const timer = setTimeout(() => {
        setShowWelcomeToast(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleCardCreated = (newCard: Card) => setCards([newCard, ...cards]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as number;
    const overId = over.id;

    const cardToUpdate = cards.find(c => c.id === cardId);
    if (!cardToUpdate) return;

    let newStatus: StatusType | null = null;
    const validStatuses: StatusType[] = ['todo', 'in_progress', 'review', 'done'];

    if (validStatuses.includes(overId as StatusType)) {
      newStatus = overId as StatusType;
    } else {
      const targetCard = cards.find(c => c.id === overId);
      if (targetCard) newStatus = targetCard.status;
    }

    if (newStatus && cardToUpdate.status !== newStatus) {
      const originalCards = [...cards];
      setCards(cards.map(card => card.id === cardId ? { ...card, status: newStatus! } : card));

      try {
        await api.put(`/tasks/${cardId}`, {
          title: cardToUpdate.title,
          description: cardToUpdate.description,
          priority: cardToUpdate.priority,
          status: newStatus
        });
      } catch (err) {
        console.error(err);
        setCards(originalCards);
        alert('Hubo un error al mover la iniciativa en la base de datos.');
      }
    }
  };

  const handleDelete = async (cardId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta iniciativa?')) return;
    try {
      await api.delete(`/tasks/${cardId}`);
      setCards(cards.filter(card => card.id !== cardId));
    } catch (err) {
      console.error(err);
      alert('Hubo un error al intentar eliminar la iniciativa en el servidor.');
    }
  };

  const handleEditClick = (card: Card) => {
    setCardToEdit(card);
    setIsEditModalOpen(true);
  };

  const handleCardUpdated = (updatedCard: Card) => {
    setCards(cards.map(card => card.id === updatedCard.id ? updatedCard : card));
  };

  const handleSaveTimeLog = async (cardId: number, hours: number) => {
    try {
      const res = await api.post(`/tasks/${cardId}/time_logs`, { hours });
      setCards(prevCards => prevCards.map(card => {
        if (card.id === cardId) {
          const currentLogs = card.time_logs || [];
          return {
            ...card,
            time_logs: [...currentLogs, res.data]
          };
        }
        return card;
      }));
    } catch (err) {
      console.error(err);
      alert('No se pudo registrar el tiempo en el servidor.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexeus_token');
    navigate('/login');
    window.location.reload();
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = 
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.description && card.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriority = selectedPriority === 'all' || card.priority === selectedPriority;

    let matchesOverdue = true;
    if (filterOverdueOnly) {
      if (!card.due_date || card.status === 'done') {
        matchesOverdue = false; 
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(card.due_date);
        dueDate.setHours(0, 0, 0, 0);
        matchesOverdue = dueDate <= today; 
      }
    }

    return matchesSearch && matchesPriority && matchesOverdue; 
  });

  const columns: { id: StatusType; title: string; color: string }[] = [
    { id: 'todo', title: '📋 Backlog ', color: 'border-t-indigo-500' },
    { id: 'in_progress', title: '⚡ En Progreso', color: 'border-t-amber-500' },
    { id: 'review', title: '🔍 Revisión', color: 'border-t-blue-500' },
    { id: 'done', title: '✅ Listo ', color: 'border-t-emerald-500' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        🔄 Cargando tablero y perfil de usuario...
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        
        {/* Encabezado Principal + NAVBAR INTEGRADO */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 max-w-7xl mx-auto border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tablero de Innovación</h1>
            <p className="text-xs text-slate-400 mt-1">Nexeus • Gestión Interna</p>
          </div>
          
          {/* 🧭 NAVBAR DE NAVEGACIÓN ENTRE VISTAS */}
          <nav className="flex bg-slate-900 border border-slate-800/80 p-1 rounded-xl">
            <Link to="/board" className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition">
              📋 Tablero
            </Link>
            <Link to="/hours" className="px-4 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg transition">
              ⏱️ Mis Horas
            </Link>
            <Link to="/reports" className="px-4 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg transition">
              📊 Informes
            </Link>
          </nav>
          
          <div className="flex flex-wrap items-center gap-4 self-end md:self-auto">
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Cuenta Activa" />
                <span className="text-xs font-mono text-slate-300">
                  👤 {currentUser.email}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <span>+</span> Nueva Initiative
              </button>

              {/* Ahora el botón abre el modal de confirmación en lugar de cerrar sesión directo */}
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        {/* BARRA DE HERRAMIENTAS */}
        <div className="max-w-7xl mx-auto mb-8 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex flex-col lg:flex-row gap-4 justify-between items-center shadow-inner">
          <div className="relative w-full lg:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por título o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-mono text-slate-400 mr-1 hidden md:inline">FILTRAR:</span>
            
            {(['all', 'low', 'medium', 'high', 'urgent'] as const).map((priority) => {
              const labels = { all: 'Todas', low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
              const isSelected = selectedPriority === priority;
              
              return (
                <button
                  key={priority}
                  onClick={() => setSelectedPriority(priority)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  {labels[priority]}
                </button>
              );
            })}

            <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

            <button
              onClick={() => setFilterOverdueOnly(!filterOverdueOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1 border ${
                filterOverdueOnly
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-md shadow-rose-500/10 font-bold'
                  : 'bg-slate-800/40 text-slate-400 hover:text-rose-400 border-dashed border-slate-700 hover:border-rose-500/30'
              }`}
            >
              <span>🚨</span> {filterOverdueOnly ? 'Vencidas Activo' : 'Ver Vencidas'}
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-7xl mx-auto mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {/* Rejilla de Columnas Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-start">
          {columns.map((column) => {
            const columnCards = filteredCards.filter(card => card.status === column.id);

            return (
              <BoardColumn
                key={column.id}
                column={column}
                cards={columnCards}
                currentUser={currentUser}
                onDelete={handleDelete}
                onEdit={handleEditClick}
                onSaveTime={handleSaveTimeLog}
              />
            );
          })}
        </div>

        <NewCardModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onCardCreated={handleCardCreated} 
        />

        <EditCardModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setCardToEdit(null);
          }}
          onCardUpdated={handleCardUpdated}
          cardToEdit={cardToEdit}
        />

        {/*  MODAL DE CONFIRMACIÓN DE LOGOUT */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-xl">
                👋
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">¿Cerrar Sesión?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Estás a punto de salir de la plataforma Nexeus. Deberás volver a ingresar tus credenciales para acceder.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-rose-600/20"
                >
                  Sí, salir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST DE BIENVENIDA FLOTANTE */}
        {showWelcomeToast && (
          <div className="fixed bottom-6 right-6 z-50 transition-all">
            <div className="bg-slate-900 border border-emerald-500/30 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-slate-200">¡Sesión iniciada con éxito!</p>
                <p className="text-[11px] text-slate-400">Bienvenido al tablero de innovación de Nexeus.</p>
              </div>
              <button 
                onClick={() => setShowWelcomeToast(false)} 
                className="text-slate-500 hover:text-white text-xs ml-2 font-mono"
              >
                ✕
              </button>
            </div>
          </div>
        )}

      </div>
    </DndContext>
  );
}