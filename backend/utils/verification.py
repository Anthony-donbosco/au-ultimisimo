from datetime import datetime, timedelta
import logging
import json
from typing import Optional, Tuple, Dict, Any
from utils.database import db_manager

logger = logging.getLogger(__name__)

# Cache temporal para datos de usuario durante registro
_user_data_cache: Dict[str, Dict[str, Any]] = {}

class VerificationTokenManager:
    """Gestión de tokens de verificación de email"""
    
    @staticmethod
    def create_verification_token(user_email: str, token: str, user_data: Optional[Dict[str, Any]] = None, expires_in_minutes: int = 5) -> bool:
        """Crear token de verificación en la base de datos"""
        try:
            # Calcular tiempo de expiración
            expires_at = datetime.now() + timedelta(minutes=expires_in_minutes)
            
            # NUEVO: Invalidar cualquier token previo para este email
            VerificationTokenManager.invalidate_all_tokens_for_email(user_email)
            
            # Limpiar tokens expirados/usados para este email
            VerificationTokenManager.cleanup_expired_tokens_for_email(user_email)
            
            # Insertar nuevo token
            query = """
                INSERT INTO email_verification_tokens (user_email, token, expires_at, created_at)
                VALUES (%s, %s, %s, %s)
            """
            params = (user_email, token, expires_at, datetime.now())
            
            db_manager.execute_query(query, params)

            # Guardar datos adicionales en cache temporal si se proporcionan
            if user_data:
                cache_key = f"{user_email}:{token}"
                _user_data_cache[cache_key] = user_data
                logger.info(f"✅ Token y datos de usuario guardados para {user_email}")
            else:
                logger.info(f"✅ Token de verificación creado para {user_email}")

            return True
            
        except Exception as e:
            logger.error(f"❌ Error creando token de verificación para {user_email}: {e}")
            return False
    
    @staticmethod
    def verify_token(user_email: str, token: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Verificar si un token es válido
        Returns: (is_valid, message, user_data)
        """
        try:
            query = """
                SELECT id, expires_at, used 
                FROM email_verification_tokens 
                WHERE user_email = %s AND token = %s
                ORDER BY created_at DESC
                LIMIT 1
            """
            params = (user_email, token)
            
            result = db_manager.fetch_one(query, params)
            
            if not result:
                logger.warning(f"Token no encontrado para {user_email}")
                return False, "Código de verificación inválido", None

            # Verificar si ya fue usado
            if result['used']:
                logger.warning(f"Token ya utilizado para {user_email}")
                return False, "Este código ya ha sido utilizado", None

            # Verificar si ha expirado
            if datetime.now() > result['expires_at']:
                logger.warning(f"Token expirado para {user_email}")
                return False, "El código de verificación ha expirado", None

            # Token válido - marcarlo como usado
            VerificationTokenManager.mark_token_as_used(result['id'])

            # Recuperar datos adicionales del cache
            cache_key = f"{user_email}:{token}"
            user_data = _user_data_cache.get(cache_key)

            # Limpiar cache después de usar los datos
            if cache_key in _user_data_cache:
                del _user_data_cache[cache_key]

            logger.info(f"✅ Token verificado exitosamente para {user_email}")
            return True, "Código verificado exitosamente", user_data
            
        except Exception as e:
            logger.error(f"❌ Error verificando token para {user_email}: {e}")
            return False, "Error interno verificando código", None
    
    @staticmethod
    def mark_token_as_used(token_id: int) -> bool:
        """Marcar token como usado"""
        try:
            query = """
                UPDATE email_verification_tokens 
                SET used = TRUE, used_at = %s 
                WHERE id = %s
            """
            params = (datetime.now(), token_id)
            
            db_manager.execute_query(query, params)
            return True
            
        except Exception as e:
            logger.error(f"❌ Error marcando token como usado: {e}")
            return False
    
    @staticmethod
    def cleanup_expired_tokens_for_email(user_email: str) -> int:
        """Limpiar tokens expirados para un email específico"""
        try:
            query = """
                DELETE FROM email_verification_tokens 
                WHERE user_email = %s AND (expires_at < %s OR used = TRUE)
            """
            params = (user_email, datetime.now())
            
            result = db_manager.execute_query(query, params)
            deleted_count = result if isinstance(result, int) else 0
            
            if deleted_count > 0:
                logger.info(f"🧹 Limpiados {deleted_count} tokens expirados para {user_email}")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ Error limpiando tokens para {user_email}: {e}")
            return 0
    
    @staticmethod
    def cleanup_all_expired_tokens() -> int:
        """Limpiar todos los tokens expirados (para ejecutar periódicamente)"""
        try:
            query = """
                DELETE FROM email_verification_tokens 
                WHERE expires_at < %s
            """
            params = (datetime.now(),)
            
            result = db_manager.execute_query(query, params)
            deleted_count = result if isinstance(result, int) else 0
            
            if deleted_count > 0:
                logger.info(f"🧹 Limpiados {deleted_count} tokens expirados globalmente")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ Error limpiando tokens expirados: {e}")
            return 0
    
    @staticmethod
    def has_valid_token(user_email: str) -> bool:
        """Verificar si un email tiene un token válido pendiente"""
        try:
            query = """
                SELECT COUNT(*) as count
                FROM email_verification_tokens 
                WHERE user_email = %s 
                AND expires_at > %s 
                AND used = FALSE
            """
            params = (user_email, datetime.now())
            
            result = db_manager.fetch_one(query, params)
            return result and result['count'] > 0
            
        except Exception as e:
            logger.error(f"❌ Error verificando tokens válidos para {user_email}: {e}")
            return False
    
    @staticmethod
    def get_token_info(user_email: str) -> Optional[dict]:
        """Obtener información del último token para un email"""
        try:
            query = """
                SELECT token, expires_at, used, created_at
                FROM email_verification_tokens 
                WHERE user_email = %s
                ORDER BY created_at DESC
                LIMIT 1
            """
            params = (user_email,)
            
            result = db_manager.fetch_one(query, params)
            return result
            
        except Exception as e:
            logger.error(f"❌ Error obteniendo info de token para {user_email}: {e}")
            return None
    
    @staticmethod
    def invalidate_all_tokens_for_email(user_email: str) -> int:
        """Invalidar todos los tokens activos para un email"""
        try:
            query = """
                UPDATE email_verification_tokens 
                SET used = TRUE, used_at = %s 
                WHERE user_email = %s AND used = FALSE AND expires_at > %s
            """
            params = (datetime.now(), user_email, datetime.now())
            
            result = db_manager.execute_query(query, params)
            invalidated_count = result if isinstance(result, int) else 0
            
            if invalidated_count > 0:
                logger.info(f"🔒 Invalidados {invalidated_count} tokens previos para {user_email}")
            
            return invalidated_count
            
        except Exception as e:
            logger.error(f"❌ Error invalidando tokens para {user_email}: {e}")
            return 0
    
    @staticmethod
    def get_recent_token_requests(user_email: str, minutes: int = 15) -> int:
        """Contar solicitudes de token recientes para rate limiting"""
        try:
            since_time = datetime.now() - timedelta(minutes=minutes)
            query = """
                SELECT COUNT(*) as count
                FROM email_verification_tokens 
                WHERE user_email = %s AND created_at > %s
            """
            params = (user_email, since_time)
            
            result = db_manager.fetch_one(query, params)
            return result['count'] if result else 0
            
        except Exception as e:
            logger.error(f"❌ Error contando requests recientes para {user_email}: {e}")
            return 0
    
    @staticmethod
    def get_last_token_time(user_email: str) -> Optional[datetime]:
        """Obtener timestamp del último token generado"""
        try:
            query = """
                SELECT created_at
                FROM email_verification_tokens 
                WHERE user_email = %s
                ORDER BY created_at DESC
                LIMIT 1
            """
            params = (user_email,)
            
            result = db_manager.fetch_one(query, params)
            return result['created_at'] if result else None
            
        except Exception as e:
            logger.error(f"❌ Error obteniendo último token para {user_email}: {e}")
            return None