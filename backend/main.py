# ==============================================================================
# NEXEUS INNOVATION PLATFORM - CORE BACKEND ENGINE
# ==============================================================================

# --- 1. LIBRERÍAS EXTERNAS Y UTILERÍAS ---
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, date, time, timedelta
import io
import csv

# --- 2. MÓDULOS INTERNOS DEL PROYECTO ---
from database import get_db, engine
import models
import schemas
import auth
from security import get_current_user

# --- 3. INICIALIZACIÓN Y CONFIGURACIÓN BASE ---
# Forzamos la creación de tablas en PostgreSQL si no existen en el inicio de la app
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nexeus Task & Time Tracker API",
    description="Backend oficial para la gestión de proyectos, tableros Kanban y control de horas de la empresa Nexeus.",
    version="1.0.0"
)

# Configuración de Orígenes Permitidos (CORS) para desarrollo local y pruebas
origins = [
    "http://localhost:3000",  # React tradicional
    "http://localhost:5173",  # Vite Development Server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   
    allow_credentials=True,  
    allow_methods=["*"],     
    allow_headers=["*"],     
)

# Conexión del Router Modular de Autenticación JWT
app.include_router(auth.router)


# ==============================================================================
# SECCIÓN 1: ENDPOINTS DE CONTROL DE ESTADO (HEALTH CHECKS)
# ==============================================================================

@app.get("/")
def read_root():
    """Ruta raíz para verificar la disponibilidad inmediata del servidor backend."""
    return {
        "status": "online",
        "message": "¡Bienvenidos al backend de Nexeus Platform!"
    }


@app.get("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    """Prueba de estrés de conexión cruda con PostgreSQL."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "database_status": "connected",
            "message": "¡La conexión con PostgreSQL y nexeus_db es exitosa!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error crítico al conectar con la base de datos: {str(e)}"
        )


@app.get("/users/me")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    """Retorna la identidad segura del usuario autenticado mediante el Token JWT."""
    return {
        "mensaje": "¡Bienvenido a tu perfil privado de Nexeus!",
        "id": current_user.id,
        "email": current_user.email,
        "is_active": current_user.is_active
    }


# ==============================================================================
# SECCIÓN 2: CORE KANBAN ENDPOINTS (CRUD DE INICIATIVAS / TARJETAS)
# ==============================================================================

@app.post("/tasks/", response_model=schemas.CardOut, status_code=status.HTTP_201_CREATED)
@app.post("/cards/", response_model=schemas.CardOut, status_code=status.HTTP_201_CREATED)
def create_card(
    card: schemas.CardCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Crea de forma persistente una nueva iniciativa vinculada al creador logueado."""
    card_data = card.model_dump()
    
    # Verificación preventiva de Listas para mitigar errores de integridad relacional
    if card_data.get("list_id") is not None:
        lista_existe = db.query(models.List).filter(models.List.id == card_data["list_id"]).first()
        if not lista_existe:
            card_data["list_id"] = None

    db_card = models.Card(**card_data, owner_id=current_user.id)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card


@app.get("/tasks/", response_model=list[schemas.CardOut])
@app.get("/cards/", response_model=list[schemas.CardOut])
def read_cards(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Recupera todas las iniciativas Kanban que pertenecen estrictamente al usuario."""
    cards = db.query(models.Card)\
              .filter(models.Card.owner_id == current_user.id)\
              .order_by(models.Card.position.asc())\
              .offset(skip).limit(limit).all()
    return cards


@app.put("/tasks/{card_id}", response_model=schemas.CardOut)
@app.put("/cards/{card_id}", response_model=schemas.CardOut)
def update_card(
    card_id: int, 
    card_update: schemas.CardUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Actualiza de forma atómica propiedades generales de una iniciativa (título, fechas, etc)."""
    db_card = db.query(models.Card)\
                .filter(models.Card.id == card_id, models.Card.owner_id == current_user.id)\
                .first()
    
    if not db_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="La iniciativa no fue encontrada o no tienes permisos para editarla."
        )
    
    update_data = card_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_card, key, value)
        
    db.commit()
    db.refresh(db_card)
    return db_card


@app.patch("/tasks/{card_id}/move", response_model=schemas.CardOut)
@app.patch("/cards/{card_id}/move", response_model=schemas.CardOut)
def move_card(
    card_id: int, 
    move_data: schemas.CardMove, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Endpoint de alto rendimiento especializado en transiciones Drag and Drop."""
    db_card = db.query(models.Card)\
                .filter(models.Card.id == card_id, models.Card.owner_id == current_user.id)\
                .first()
    
    if not db_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="La iniciativa no fue encontrada o no te pertenece."
        )
    
    db_card.status = move_data.status
    db_card.position = move_data.position
    
    if move_data.list_id is not None:
        db_card.list_id = move_data.list_id
        
    db.commit()
    db.refresh(db_card)
    return db_card


@app.delete("/tasks/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
@app.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Elimina permanentemente una iniciativa del ecosistema de base de datos."""
    db_card = db.query(models.Card)\
                .filter(models.Card.id == card_id, models.Card.owner_id == current_user.id)\
                .first()
                
    if not db_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="La iniciativa no fue encontrada o no tienes permisos para eliminarla."
        )
        
    db.delete(db_card)
    db.commit()
    return None


# ==============================================================================
# SECCIÓN 3: CONTROL DE HOJAS DE TIEMPO (TIME LOGGING ENGINE)
# ==============================================================================

@app.post("/tasks/{card_id}/time_logs", response_model=schemas.TimeLogOut, status_code=status.HTTP_201_CREATED)
@app.post("/cards/{card_id}/time_logs", response_model=schemas.TimeLogOut, status_code=status.HTTP_201_CREATED)
def create_time_log(
    card_id: int,
    log: schemas.TimeLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Registra y audita bloques de horas sobre una tarjeta Kanban específica."""
    db_card = db.query(models.Card).filter(models.Card.id == card_id, models.Card.owner_id == current_user.id).first()
    if not db_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La iniciativa asociada no existe o no cuentas con los permisos requeridos."
        )

    db_log = models.TimeLog(
        hours=log.hours,
        note=log.note or "Tiempo registrado vía temporizador",
        date=log.date or datetime.utcnow(),
        card_id=card_id,
        user_id=current_user.id
    )
    
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@app.get("/users/me/time_logs", response_model=list[schemas.TimeLogOut])
def get_my_time_logs(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Extrae cronológicamente los registros de esfuerzo para poblar la vista de 'Mis Horas'."""
    start_datetime = datetime.combine(start_date, time.min)
    end_datetime = datetime.combine(end_date, time.max)

    logs = db.query(models.TimeLog).filter(
        models.TimeLog.user_id == current_user.id,
        models.TimeLog.date >= start_datetime,
        models.TimeLog.date <= end_datetime
    ).all()
    
    return logs


# ==============================================================================
# SECCIÓN 4: BUSINESS INTELLIGENCE (INFORMES DINÁMICOS Y EXPORTACIÓN CSV)
# ==============================================================================

@app.get("/reports/weekly")
def get_weekly_report(
    week: str,  
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Compila, calcula y unifica métricas de rendimiento en base a una semana ISO."""
    try:
        start_of_week = datetime.strptime(f"{week}-1", "%G-W%V-%u")
        end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de semana erróneo. Utilice la convención estándar YYYY-Www (Ej: 2026-W30)"
        )

    new_tasks = db.query(models.Card).filter(
        models.Card.owner_id == current_user.id,
        models.Card.created_at >= start_of_week,
        models.Card.created_at <= end_of_week
    ).count()

    completed_tasks = db.query(models.Card).filter(
        models.Card.owner_id == current_user.id,
        models.Card.status == "done",
        models.Card.updated_at >= start_of_week,
        models.Card.updated_at <= end_of_week
    ).count()

    overdue_tasks = db.query(models.Card).filter(
        models.Card.owner_id == current_user.id,
        models.Card.status != "done",
        models.Card.due_date < date.today()
    ).count()

    logs = db.query(models.TimeLog).filter(
        models.TimeLog.user_id == current_user.id,
        models.TimeLog.date >= start_of_week,
        models.TimeLog.date <= end_of_week
    ).all()

    total_hours = sum(log.hours for log in logs)

    task_map = {}
    for log in logs:
        if log.card_id not in task_map:
            card = db.query(models.Card).filter(models.Card.id == log.card_id).first()
            task_map[log.card_id] = {
                "card_id": log.card_id,
                "title": card.title if card else "Iniciativa Eliminada",
                "hours": 0.0
            }
        task_map[log.card_id]["hours"] += log.hours

    return {
        "week": week,
        "completed_tasks_count": completed_tasks,
        "overdue_tasks_count": overdue_tasks,
        "new_tasks_count": new_tasks,
        "total_hours": total_hours,
        "hours_by_task": list(task_map.values()),
        "hours_by_user": [
            {"user_id": current_user.id, "email": current_user.email, "hours": total_hours}
        ]
    }


@app.get("/reports/csv")
def export_report_csv(
    week: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Genera al vuelo un documento CSV descargable con el desglose contable de horas."""
    try:
        start_of_week = datetime.strptime(f"{week}-1", "%G-W%V-%u")
        end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de semana erróneo.")

    logs = db.query(models.TimeLog).filter(
        models.TimeLog.user_id == current_user.id,
        models.TimeLog.date >= start_of_week,
        models.TimeLog.date <= end_of_week
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["ID Registro", "ID Tarjeta", "Iniciativa", "Horas Invertidas", "Nota de Actividad", "Fecha de Registro"])
    
    for log in logs:
        card = db.query(models.Card).filter(models.Card.id == log.card_id).first()
        writer.writerow([
            log.id, 
            log.card_id, 
            card.title if card else "Eliminada", 
            log.hours, 
            log.note, 
            log.date.strftime("%Y-%m-%d %H:%M")
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=reporte_esfuerzo_{week}.csv"}
    )