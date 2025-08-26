from datetime import datetime
from typing import Optional, Dict, Any
import logging
from utils.database import (
    find_user_by_email, find_user_by_username, find_user_by_id,
    create_user, update_user_last_login, update_user_verification_status,
    db_manager
)
from utils.auth import hash_password, verify_password, generate_jwt_token
from utils.auth import ValidationUtils

logger = logging.getLogger(__name__)

class User:
    """Modelo de usuario para operaciones de base de datos y autenticación"""
    
    def __init__(self, user_data: dict = None):
        """Inicializar usuario con datos de la base de datos o vacío"""
        if user_data:
            self.id = user_data.get('id')
            self.username = user_data.get('username')
            self.email = user_data.get('email')
            self.password_hash = user_data.get('password_hash')
            self.first_name = user_data.get('first_name')
            self.last_name = user_data.get('last_name')
            self.is_active = user_data.get('is_active', True)
            self.is_verified = user_data.get('is_verified', False)
            self.created_at = user_data.get('created_at')
            self.updated_at = user_data.get('updated_at')
            self.last_login = user_data.get('last_login')
        else:
            # Usuario vacío para crear nuevo
            self.id = None
            self.username = None
            self.email = None
            self.password_hash = None
            self.first_name = None
            self.last_name = None
            self.is_active = True
            self.is_verified = False
            self.created_at = None
            self.updated_at = None
            self.last_login = None
    
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """Convertir usuario a diccionario (sin contraseña por defecto)"""
        user_dict = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        
        if include_sensitive:
            user_dict['password_hash'] = self.password_hash
        
        return user_dict
    
    def get_full_name(self) -> str:
        """Obtener nombre completo del usuario"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        else:
            return self.username or ""
    
    def set_password(self, password: str) -> bool:
        """Establecer contraseña (genera hash automáticamente)"""
        try:
            self.password_hash = hash_password(password)
            return True
        except Exception as e:
            logger.error(f"Error estableciendo contraseña: {e}")
            return False
    
    def check_password(self, password: str) -> bool:
        """Verificar contraseña contra el hash almacenado"""
        if not self.password_hash:
            return False
        return verify_password(password, self.password_hash)
    
    def generate_auth_token(self) -> str:
        """Generar token JWT para el usuario"""
        return generate_jwt_token(self.to_dict())
    
    def update_last_login(self) -> bool:
        """Actualizar timestamp de último login"""
        try:
            if self.id:
                update_user_last_login(self.id)
                self.last_login = datetime.utcnow()
                return True
            return False
        except Exception as e:
            logger.error(f"Error actualizando last_login: {e}")
            return False
    
    def verify_email(self) -> bool:
        """Marcar email como verificado"""
        try:
            if self.id:
                update_user_verification_status(self.id, True)
                self.is_verified = True
                return True
            return False
        except Exception as e:
            logger.error(f"Error verificando email: {e}")
            return False
    
    def save(self) -> bool:
        """Guardar usuario en la base de datos"""
        try:
            if self.id:
                # Actualizar usuario existente
                query = """
                UPDATE users SET 
                    username = %s, email = %s, first_name = %s, last_name = %s,
                    is_active = %s, is_verified = %s
                WHERE id = %s
                """
                params = (
                    self.username, self.email, self.first_name, self.last_name,
                    self.is_active, self.is_verified, self.id
                )
                db_manager.execute_query(query, params)
            else:
                # Crear nuevo usuario
                user_data = {
                    'username': self.username,
                    'email': self.email,
                    'password_hash': self.password_hash,
                    'first_name': self.first_name,
                    'last_name': self.last_name,
                    'is_verified': self.is_verified
                }
                create_user(user_data)
                
                # Obtener el ID del usuario recién creado
                created_user = find_user_by_email(self.email)
                if created_user:
                    self.id = created_user['id']
                    self.created_at = created_user['created_at']
                    self.updated_at = created_user['updated_at']
            
            return True
        except Exception as e:
            logger.error(f"Error guardando usuario: {e}")
            return False
    
    @classmethod
    def find_by_email(cls, email: str) -> Optional['User']:
        """Buscar usuario por email"""
        try:
            user_data = find_user_by_email(email)
            return cls(user_data) if user_data else None
        except Exception as e:
            logger.error(f"Error buscando usuario por email: {e}")
            return None
    
    @classmethod
    def find_by_username(cls, username: str) -> Optional['User']:
        """Buscar usuario por nombre de usuario"""
        try:
            user_data = find_user_by_username(username)
            return cls(user_data) if user_data else None
        except Exception as e:
            logger.error(f"Error buscando usuario por username: {e}")
            return None
    
    @classmethod
    def find_by_id(cls, user_id: int) -> Optional['User']:
        """Buscar usuario por ID"""
        try:
            user_data = find_user_by_id(user_id)
            return cls(user_data) if user_data else None
        except Exception as e:
            logger.error(f"Error buscando usuario por ID: {e}")
            return None
    
    @classmethod
    def create_user(cls, username: str, email: str, password: str, 
                   first_name: str = None, last_name: str = None) -> tuple[bool, str, Optional['User']]:
        """Crear nuevo usuario con validaciones completas"""
        
        # Validar datos de entrada
        is_valid, error_msg = cls.validate_user_data(
            username, email, password, first_name, last_name
        )
        if not is_valid:
            return False, error_msg, None
        
        # Verificar que no exista usuario con mismo email o username
        if cls.find_by_email(email):
            return False, "Ya existe un usuario con este email", None
        
        if cls.find_by_username(username):
            return False, "Ya existe un usuario con este nombre de usuario", None
        
        # Crear usuario
        try:
            user = cls()
            user.username = username.strip()
            user.email = email.strip().lower()
            user.first_name = first_name.strip() if first_name else None
            user.last_name = last_name.strip() if last_name else None
            
            # Establecer contraseña
            if not user.set_password(password):
                return False, "Error procesando contraseña", None
            
            # Guardar en base de datos
            if user.save():
                return True, "Usuario creado exitosamente", user
            else:
                return False, "Error guardando usuario en base de datos", None
        
        except Exception as e:
            logger.error(f"Error creando usuario: {e}")
            return False, "Error interno creando usuario", None
    
    @classmethod
    def authenticate(cls, login: str, password: str) -> tuple[bool, str, Optional['User']]:
        """Autenticar usuario por email/username y contraseña"""
        try:
            # Buscar usuario (puede ser email o username)
            user = None
            if '@' in login:
                user = cls.find_by_email(login)
            else:
                user = cls.find_by_username(login)
            
            if not user:
                return False, "Credenciales inválidas", None
            
            # Verificar que el usuario esté activo
            if not user.is_active:
                return False, "Cuenta desactivada", None
            
            # Verificar contraseña
            if not user.check_password(password):
                return False, "Credenciales inválidas", None
            
            # Actualizar último login
            user.update_last_login()
            
            return True, "Autenticación exitosa", user
        
        except Exception as e:
            logger.error(f"Error autenticando usuario: {e}")
            return False, "Error interno de autenticación", None
    
    @staticmethod
    def validate_user_data(username: str, email: str, password: str, 
                          first_name: str = None, last_name: str = None) -> tuple[bool, str]:
        """Validar todos los datos de usuario"""
        
        # Validar username
        is_valid, error = ValidationUtils.validate_username(username)
        if not is_valid:
            return False, error
        
        # Validar email
        is_valid, error = ValidationUtils.validate_email(email)
        if not is_valid:
            return False, error
        
        # Validar contraseña
        is_valid, error = ValidationUtils.validate_password(password)
        if not is_valid:
            return False, error
        
        # Validar nombres (opcionales)
        if first_name:
            is_valid, error = ValidationUtils.validate_name(first_name, "Nombre")
            if not is_valid:
                return False, error
        
        if last_name:
            is_valid, error = ValidationUtils.validate_name(last_name, "Apellido")
            if not is_valid:
                return False, error
        
        return True, ""