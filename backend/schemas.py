from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ==========================================
# 1. ESQUEMAS DE USUARIO Y LOGIN
# ==========================================
class UserCreate(BaseModel):
    email: EmailStr  # Usamos EmailStr para validación real
    password: str = Field(..., min_length=6, max_length=72, description="La contraseña debe tener entre 6 y 72 caracteres")

class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ==========================================
# 2. ESQUEMAS DE HOJAS DE TIEMPO (TIME LOGS)
# ==========================================
class TimeLogCreate(BaseModel):
    hours: float = Field(..., gt=0, description="Las horas deben ser mayores a 0 (ej: 0.25, 1.5)")
    date: Optional[datetime] = None
    note: Optional[str] = Field(None, max_length=200, description="Nota máxima de 200 caracteres")

class TimeLogOut(TimeLogCreate):
    id: int
    user_id: int
    card_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. ESQUEMAS DE TARJETAS / TAREAS (KANBAN)
# ==========================================
class CardBase(BaseModel):
    title: str = Field(..., max_length=100, description="Título obligatorio, máx 100 caracteres")
    description: Optional[str] = None
    status: str = Field("todo", description="Estado: todo, in_progress, review, done")
    priority: str = Field("medium", description="Prioridad: low, medium, high, urgent")
    due_date: Optional[datetime] = None

class CardCreate(CardBase):
    list_id: Optional[int] = None
    position: Optional[int] = 1000

class CardUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    list_id: Optional[int] = None
    position: Optional[int] = None
    
# Esquema exclusivo para la ruta Patch /cards/{id}/move (Drag and Drop)
class CardMove(BaseModel):
    status: str = Field(..., description="Nueva columna destino (ej: review, done)")
    position: int = Field(..., description="Nuevo orden calculado (estrategia de enteros)")
    list_id: Optional[int] = None

# MODIFICADO ÚNICAMENTE ESTE BLOQUE PARA RESCATAR TUS TAREAS VIEJAS
class CardOut(CardBase):
    id: int
    position: Optional[int] = 1000                    # Si es NULL en tu BD, Pydantic asumirá 0
    list_id: Optional[int] = None                        # Si es NULL en tu BD, se asignará a la lista 1
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None   # Si es NULL, ya no romperá el servidor
    time_logs: List[TimeLogOut] = []
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 4. ESQUEMAS DE LISTAS Y TABLEROS
# ==========================================
class ListCreate(BaseModel):
    title: str
    position: int
    board_id: int

class ListOut(ListCreate):
    id: int
    cards: List[CardOut] = []
    
    model_config = ConfigDict(from_attributes=True)

class BoardCreate(BaseModel):
    title: str = "Tablero Principal Nexeus"

class BoardOut(BoardCreate):
    id: int
    owner_id: int
    created_at: datetime
    lists: List[ListOut] = []
    
    model_config = ConfigDict(from_attributes=True)