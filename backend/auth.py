from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, security

# Inicializamos el Router para modularizar nuestras rutas
router = APIRouter(
    prefix="/auth", # Todas las rutas empezarán con /auth)
    tags=["Autenticación"] # Para agruparlas ordenadamente en la documentacion oficial (/docs)
)

# RUTA DE REGISTRO (/auth/register)
@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Verificamos si ya existe un usuario con ese mismo email en la BD
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este correo electrónico ya está registrado en Nexeus."
        )

# Encriptamos la contraseña utilizando nuestra función de security.py
    hashed_pwd = security.get_password_hash(user.password)

    # Creamos el nuvo objeto de usuario con la contraseña protegida
    new_user = models.User(
        email=user.email,
        hashed_password = hashed_pwd
    )
    
    # Guardamos los cambios físicamente en PostgreSQL
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # Refrescamos para obtener el ID generado y la fecha de creacion
    
    return new_user


# RUTA DE LOGIN (/auth/login)
@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # OAuth2PasswordRequestForm requiere que el campo de usuario se llame 'username'
    # por lo que nuestro caso, 'form_data.username' contendrá el email del usuario.
    
    # Buscamos el usuario por email en PostgreSQL
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # Si el usuario no existe o la contraseña no coincide con el hash, bloqueamos el acceso
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electronico o contraseñ incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Si la autenticacion es exitosa, fabricamos su pasaporte digital (Token JWT)
    access_token = security.create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    # Devolvemos el token al frontend/cliente
    return {"access_token": access_token, "token_type": "bearer"} 