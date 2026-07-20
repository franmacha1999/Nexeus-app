from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models
from database import settings, get_db

# =====================================================================
# 1. CONFIGURACIÓN DEL SISTEMA DE SEGURIDAD
# =====================================================================

# Configuración del motor de encriptación (bcrypt).
# Transforma contraseñas de texto plano en huellas digitales irreversibles.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Le indica a FastAPI y a Swagger (/docs) cómo obtener el token.
# Buscará automáticamente en la cabecera HTTP: "Authorization: Bearer <TOKEN>".
# Si no hay token, el botón "Authorize" de Swagger enviará las credenciales a "/auth/login".
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# =====================================================================
# 2. GESTIÓN Y HASHING DE CONTRASEÑAS
# =====================================================================

def get_password_hash(password: str) -> str:
    """
    Recibe una contraseña en texto plano (ej: "holahola7"),
    le aplica el algoritmo bcrypt y devuelve el hash encriptado
    para guardarlo de forma segura en PostgreSQL.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara la clave que escribe el usuario al intentar loguearse (plain)
    contra el hash que tenemos guardado en la base de datos (hashed).
    Devuelve True si coinciden, False si la contraseña es incorrecta.
    """
    return pwd_context.verify(plain_password, hashed_password)


# =====================================================================
# 3. CREACIÓN Y EMISIÓN DEL TOKEN JWT (PASAPORTE DIGITAL)
# =====================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Genera un Token JWT sellado criptográficamente.
    
    Parámetros:
    - data: Diccionario con los datos a guardar en el payload (ej: {"sub": "1"}).
    - expires_delta: Tiempo de validez del token. Si no se especifica,
      utiliza los minutos configurados en el archivo .env (ACCESS_TOKEN_EXPIRE_MINUTES).
    """
    # Hacemos una copia de los datos para no modificar el diccionario original
    to_encode = data.copy()
    
    # Calculamos la fecha y hora exacta en la que vencerá el token (expiración)
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    # Agregamos la marca de tiempo de expiración al estándar "exp" del JWT
    to_encode.update({"exp": expire})

    # Empacamos los datos y firmamos digitalmente el token con nuestra SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


# =====================================================================
# 4. VERIFICACIÓN Y AUTENTICACIÓN EN RUTAS PROTEGIDAS
# =====================================================================

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependencia de seguridad para inyectar en rutas privadas (ej: /users/me o crear tareas).
    
    Flujo de ejecución:
    1. Extrae automáticamente el token Bearer de la petición web.
    2. Decodifica y verifica que la firma matemática sea auténtica.
    3. Comprueba que el token no haya expirado por tiempo.
    4. Extrae el ID del usuario ("sub") y busca su registro real en PostgreSQL.
    5. Si todo es válido, devuelve el objeto del usuario; si algo falla, lanza error 401.
    """
    # Excepción estándar que lanzaremos ante cualquier irregularidad con el token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de acceso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Intentamos abrir y decodificar el token con nuestra clave secreta
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # Extraemos el identificador principal del sujeto (sub = ID del usuario)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        # Captura tokens mal formados, alterados por terceros o vencidos en el tiempo
        raise credentials_exception

    # Consultamos a la base de datos para confirmar que el usuario existe y sigue activo
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
        
    # Devolvemos el modelo de usuario autenticado y listo para usar en el endpoint
    return user