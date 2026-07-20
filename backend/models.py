from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# Tabla de Usuarios (Para login y propiedades de tarea)
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones : Un usuario puede tener muchos tableros, tarjetas creadas y registros de horas 
    boards = relationship("Board", back_populates="owner")
    cards = relationship("Card", back_populates="owner")
    time_logs = relationship("TimeLog", back_populates="user")
    tasks = relationship("Task", back_populates="owner")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    
    # El estado resprestará en que columna del Kanan está la tarjeta
    # Valores permitidos por convención:  "todo" (Por Hacer), "in_progress" (En progreso), "done" (Listo)
    status = Column(String, default="todo", index=True)
    
    # Prioridad: "low"(Baja), "medium" (Media), high (Alta)
    priority = Column(String, default="medium")
    
    # Fecha de creación automática
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # CLAVE FÓRANEA: Conecta esta tarjeta con el id de la tabla users
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # RELACIÓN: El puente de vuelta hacia el usuario dueño
    owner = relationship("User", back_populates="tasks")
    
    due_date = Column(Date, nullable=True)
    position = Column(Integer, default=1000)
    
# Tabla de Tableros Kanban
class Board(Base):
    __tablename__ = "boards"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, default="Tablero Principal Nexeus")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    owner = relationship("User", back_populates="boards")
    lists = relationship("List", back_populates="board", cascade="all, delete-orphan")
    

# Tabla de Listas / Columnas (Backlog, En Progreso, Revisión, Listo)
class List(Base):
    __tablename__ = "lists"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    position = Column(Integer, nullable=False) # Para mantener el orden de las columnas
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    
    # Relaciones
    board = relationship("Board", back_populates="lists")
    cards = relationship("Card", back_populates="list", cascade="all, delete-orphan")
    
# Tabla de Tarjetas de Tareas
class Card(Base):
    __tablename__ = "cards"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False) # Límite de caracteres según rúbrica
    description = Column(Text, nullable=True)
    
    # 👇 AGREGADOS: Para que coincida 100% con Pydantic y el frontend
    status = Column(String, default="todo", index=True)
    priority = Column(String, default="medium")
    
    due_date = Column(Date, nullable=True)
    position = Column(Integer, default=1000, nullable=False) # Le sumamos el default=1000
    
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    list = relationship("List", back_populates="cards")
    owner = relationship("User", back_populates="cards")
    time_logs = relationship("TimeLog", back_populates="card", cascade="all, delete-orphan")
    
# Tabla de registros de Tiempo (Time Logs / Control de horas)
class TimeLog(Base):
    __tablename__ = "time_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    hours = Column(Float, nullable=False) 
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    note = Column(String(200), nullable=True) # Limite de 200 caracteres según rúbrica
    
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    card = relationship("Card", back_populates="time_logs")
    user = relationship("User", back_populates="time_logs")