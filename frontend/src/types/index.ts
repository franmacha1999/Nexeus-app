export type PriorityType = 'low' | 'medium' | 'high' | 'urgent';
export type Priority = PriorityType;

export type StatusType = 'todo' | 'in_progress' | 'review' | 'done';
export type Status = StatusType;

export interface TimeLog {
  id: number;
  user_id: number;
  card_id: number;
  hours: number;
  date?: string;
  note?: string;
  created_at: string;
}

export interface Card {
  id: number;
  title: string;
  description?: string;
  priority: PriorityType;
  status: StatusType;
  position?: number;
  list_id?: number;
  owner_id: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  time_logs?: TimeLog[];
}

export interface CreateCardData {
  title: string;
  description?: string;
  priority: PriorityType;
  status: StatusType;
  list_id?: number;
  due_date?: string;
}

export interface UpdateCardData {
  title?: string;
  description?: string;
  priority?: PriorityType;
  status?: StatusType;
  list_id?: number;
  position?: number;
  due_date?: string;
}

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  mensaje?: string;
}

export interface KanbanList {
  id: number;
  title: string;
  position: number;
  board_id: number;
  cards: Card[];
}

export interface Board {
  id: number;
  title: string;
  owner_id: number;
  created_at: string;
  lists: KanbanList[];
}