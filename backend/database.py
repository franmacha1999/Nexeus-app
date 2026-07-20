import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings, SettingsConfigDict

# 1. Configuración de Entorno moderna (Pydantic v2)
class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    # Esta línea moderna le fuerza a Pydantic a leer el archivo .env local
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# 2. Crear el "Motor" de la conexión
engine = create_engine(settings.DATABASE_URL)

# 3. Crear la fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Clase Base para nuestros futuros Modelos
Base = declarative_base()

# 5. Función Auxiliar para abrir y cerrar la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()