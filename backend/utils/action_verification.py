# Crear este nuevo archivo: src/utils/action_verification.py

import random
from datetime import datetime, timedelta
import logging

from .database import db_manager

logger = logging.getLogger(__name__)

class ActionVerificationManager:
    """Gestiona los códigos de verificación para acciones críticas de administradores."""

    @staticmethod
    def create_code(user_id: int, action_type: str, expires_in_minutes: int = 5) -> str:
        """
        Genera un código de 6 dígitos, lo guarda en la BD y lo retorna.
        """
        try:
            code = str(random.randint(100000, 999999))
            expires_at = datetime.now() + timedelta(minutes=expires_in_minutes)

            # Invalidar códigos anteriores del mismo tipo para el mismo usuario
            invalidate_query = """
                UPDATE action_verification_codes SET used = TRUE 
                WHERE user_id = %s AND action_type = %s AND used = FALSE
            """
            db_manager.execute_query(invalidate_query, (user_id, action_type))

            # Insertar el nuevo código
            insert_query = """
                INSERT INTO action_verification_codes (user_id, action_type, verification_code, expires_at) 
                VALUES (%s, %s, %s, %s)
            """
            db_manager.execute_query(insert_query, (user_id, action_type, code, expires_at))
            
            logger.info(f"Código de acción '{action_type}' creado para el usuario {user_id}.")
            return code
        except Exception as e:
            logger.error(f"Error creando código de acción para el usuario {user_id}: {e}")
            raise

    @staticmethod
    def verify_code(user_id: int, action_type: str, code: str) -> bool:
        """
        Verifica si un código es válido para un usuario y una acción específica.
        Si es válido, lo marca como usado y retorna True.
        """
        try:
            query = """
                SELECT id FROM action_verification_codes
                WHERE user_id = %s 
                  AND action_type = %s 
                  AND verification_code = %s
                  AND expires_at > NOW() 
                  AND used = FALSE
            """
            record = db_manager.fetch_one(query, (user_id, action_type, code))

            if not record:
                logger.warning(f"Intento de verificación fallido para el usuario {user_id} con código '{code}'.")
                return False

            # Marcar el código como usado para que no se pueda reutilizar
            update_query = "UPDATE action_verification_codes SET used = TRUE WHERE id = %s"
            db_manager.execute_query(update_query, (record['id'],))
            
            logger.info(f"Código de acción verificado exitosamente para el usuario {user_id}.")
            return True
        except Exception as e:
            logger.error(f"Error verificando código de acción para el usuario {user_id}: {e}")
            return False