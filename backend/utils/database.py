import mysql.connector
from mysql.connector import Error
import logging
from contextlib import contextmanager
from config import Config

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manejador de conexiones a la base de datos MySQL"""
    
    def __init__(self):
        self.config = Config.DB_CONFIG
        self._connection_pool = None
        self._init_connection_pool()
    
    def _init_connection_pool(self):
        """Inicializar pool de conexiones para mejor rendimiento"""
        try:
            from mysql.connector import pooling
            self._connection_pool = pooling.MySQLConnectionPool(
                pool_name="mi_app_pool",
                pool_size=5,
                pool_reset_session=True,
                **self.config
            )
            logger.info("Pool de conexiones MySQL inicializado correctamente")
        except Error as e:
            logger.error(f"Error al inicializar pool de conexiones: {e}")
            self._connection_pool = None
    
    def get_connection(self):
        """Obtener conexión de la base de datos"""
        try:
            if self._connection_pool:
                return self._connection_pool.get_connection()
            else:
                # Fallback: conexión directa si no hay pool
                return mysql.connector.connect(**self.config)
        except Error as e:
            logger.error(f"Error al obtener conexión: {e}")
            raise
    
    @contextmanager
    def get_db_connection(self):
        """Context manager para manejo seguro de conexiones"""
        connection = None
        try:
            connection = self.get_connection()
            yield connection
        except Error as e:
            if connection and connection.is_connected():
                connection.rollback()
            logger.error(f"Error en la base de datos: {e}")
            raise
        finally:
            if connection and connection.is_connected():
                connection.close()
    
    @contextmanager
    def get_db_cursor(self, dictionary=True):
        """Context manager para manejo de cursor con conexión automática"""
        with self.get_db_connection() as connection:
            cursor = connection.cursor(dictionary=dictionary)
            try:
                yield cursor, connection
            finally:
                cursor.close()
    
    def test_connection(self):
        """Probar conexión a la base de datos con timeout rápido"""
        try:
            with self.get_db_connection() as connection:
                cursor = connection.cursor()
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                cursor.close()
                logger.info("Conexión a la base de datos exitosa")
                return True
        except Error as e:
            logger.warning(f"Error al probar conexión: {e}")
            return False
        except Exception as e:
            logger.warning(f"Error general de conexión: {e}")
            return False
    
    def execute_query(self, query, params=None, fetch=False):
        """Ejecutar consulta de manera segura"""
        try:
            with self.get_db_cursor() as (cursor, connection):
                cursor.execute(query, params or ())
                
                if fetch:
                    if fetch == 'one':
                        return cursor.fetchone()
                    elif fetch == 'all':
                        return cursor.fetchall()
                else:
                    connection.commit()
                    # Para INSERT queries, devolver el ID del nuevo registro
                    if query.strip().upper().startswith('INSERT'):
                        return cursor.lastrowid
                    else:
                        return cursor.rowcount
        except Error as e:
            logger.error(f"Error ejecutando query: {e}")
            logger.error(f"Query: {query}")
            logger.error(f"Params: {params}")
            raise
    
    def fetch_one(self, query, params=None):
        """Método de compatibilidad para fetch_one"""
        return self.execute_query(query, params, fetch='one')
    
    def fetch_all(self, query, params=None):
        """Método de compatibilidad para fetch_all"""
        return self.execute_query(query, params, fetch='all')
    
    def execute_many(self, query, data_list):
        """Ejecutar múltiples consultas de inserción/actualización"""
        try:
            with self.get_db_cursor() as (cursor, connection):
                cursor.executemany(query, data_list)
                connection.commit()
                return cursor.rowcount
        except Error as e:
            logger.error(f"Error ejecutando multiple queries: {e}")
            raise

# Instancia global del manejador de base de datos
db_manager = DatabaseManager()

# Funciones de conveniencia
def get_db():
    """Función de conveniencia para obtener el manejador de DB"""
    return db_manager

def test_db_connection():
    """Función de conveniencia para probar la conexión"""
    return db_manager.test_connection()

# Funciones específicas para operaciones comunes
def find_user_by_email(email):
    """Buscar usuario por email"""
    query = "SELECT * FROM users WHERE email = %s"
    return db_manager.execute_query(query, (email,), fetch='one')

def find_user_by_username(username):
    """Buscar usuario por nombre de usuario"""
    query = "SELECT * FROM users WHERE username = %s"
    return db_manager.execute_query(query, (username,), fetch='one')

def find_user_by_id(user_id):
    """Buscar usuario por ID"""
    query = "SELECT * FROM users WHERE id = %s"
    return db_manager.execute_query(query, (user_id,), fetch='one')

# En utils/database.py, busca la función create_user y actualízala:

def create_user(user_data: dict) -> bool:
    """Crear nuevo usuario en la base de datos"""
    try:
        query = """
        INSERT INTO users (username, email, password_hash, first_name, last_name, 
                          phone_number, profile_picture, google_id, firebase_uid, 
                          id_rol, created_by_empresa_id, is_verified)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            user_data['username'],
            user_data['email'],
            user_data.get('password_hash'),  # Puede ser None para usuarios de Google
            user_data.get('first_name'),
            user_data.get('last_name'),
            user_data.get('phone_number'),
            user_data.get('profile_picture'),
            user_data.get('google_id'),
            user_data.get('firebase_uid'),  # Nuevo campo para Firebase UID
            user_data.get('id_rol', 4),  # Campo para rol del usuario (default: usuario normal)
            user_data.get('created_by_empresa_id'),  # Campo para empresa que creó el usuario
            user_data.get('is_verified', False)
        )
        
        db_manager.execute_query(query, params)
        return True
        
    except Exception as e:
        logger.error(f"Error creando usuario: {e}")
        return False

def update_user_last_login(user_id):
    """Actualizar última fecha de login"""
    query = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s"
    return db_manager.execute_query(query, (user_id,))

def update_user_verification_status(user_id, is_verified=True):
    """Actualizar estado de verificación del usuario"""
    query = "UPDATE users SET is_verified = %s WHERE id = %s"
    return db_manager.execute_query(query, (is_verified, user_id))

# Función para inicialización
def init_db():
    """Inicializar y probar la base de datos"""
    try:
        if test_db_connection():
            logger.info("Base de datos inicializada correctamente")
            return True
        else:
            logger.error("No se pudo conectar a la base de datos")
            return False
    except Exception as e:
        logger.error(f"Error inicializando base de datos: {e}")
        return False