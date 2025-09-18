"""
Módulo de utilidades de seguridad avanzadas
Incluye sanitización, rate limiting, y otras protecciones
"""
import html
import re
import time
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
from flask import request
import ipaddress

logger = logging.getLogger(__name__)

class SecurityUtils:
    """Utilidades de seguridad para sanitización y validación"""
    
    @staticmethod
    def sanitize_html(text: str) -> str:
        """
        Sanitizar texto para prevenir XSS
        Escapa caracteres HTML peligrosos
        """
        if not text or not isinstance(text, str):
            return ""
        
        # Escapar caracteres HTML básicos
        sanitized = html.escape(text.strip(), quote=True)
        
        # Remover caracteres de control peligrosos (excepto espacios y tabs normales)
        sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', sanitized)
        
        return sanitized
    
    @staticmethod
    def sanitize_input(data: Any) -> Any:
        """
        Sanitizar recursivamente un input (dict, list, str)
        Aplica sanitización HTML a todas las strings
        """
        if isinstance(data, dict):
            return {key: SecurityUtils.sanitize_input(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [SecurityUtils.sanitize_input(item) for item in data]
        elif isinstance(data, str):
            return SecurityUtils.sanitize_html(data)
        else:
            return data
    
    @staticmethod
    def validate_and_sanitize_user_input(data: dict) -> dict:
        """
        Validar y sanitizar datos de usuario específicamente
        Aplica reglas más estrictas para campos críticos
        """
        if not isinstance(data, dict):
            return {}
        
        sanitized_data = {}
        
        for key, value in data.items():
            if isinstance(value, str):
                # Sanitizar HTML
                clean_value = SecurityUtils.sanitize_html(value)
                
                # Reglas específicas por campo
                if key in ['username', 'email']:
                    # Para username y email, ser más restrictivo
                    if key == 'username':
                        # Solo alfanumérico y guiones bajos
                        clean_value = re.sub(r'[^\w]', '', clean_value)
                    elif key == 'email':
                        # Para email, permitir solo caracteres válidos
                        clean_value = re.sub(r'[^\w@.\-+]', '', clean_value)
                
                elif key in ['first_name', 'last_name']:
                    # Para nombres, solo letras y espacios
                    clean_value = re.sub(r'[^\w\s\u00C0-\u017F]', '', clean_value)
                
                sanitized_data[key] = clean_value
            else:
                sanitized_data[key] = value
        
        return sanitized_data

class RateLimiter:
    """
    Rate limiter por IP con múltiples ventanas de tiempo
    """
    
    def __init__(self):
        # Estructura: {ip: {endpoint: [(timestamp, count), ...]}}
        self._requests: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
        # Estructura para intentos de login fallidos: {ip: [(timestamp, count)]}
        self._failed_attempts: Dict[str, list] = defaultdict(list)
        # Cuentas bloqueadas temporalmente: {email: timestamp_unblock}
        self._blocked_accounts: Dict[str, datetime] = {}
    
    def _get_client_ip(self) -> str:
        """Obtener IP real del cliente considerando proxies"""
        # Verificar headers de proxy comunes
        forwarded_ips = request.headers.get('X-Forwarded-For')
        if forwarded_ips:
            # Tomar la primera IP (cliente real)
            ip = forwarded_ips.split(',')[0].strip()
        else:
            ip = request.headers.get('X-Real-IP') or request.remote_addr
        
        # Validar que sea una IP válida
        try:
            ipaddress.ip_address(ip)
            return ip
        except ValueError:
            logger.warning(f"IP inválida detectada: {ip}")
            return request.remote_addr or "unknown"
    
    def _cleanup_old_requests(self, ip: str, endpoint: str, window_seconds: int):
        """Limpiar requests antiguos fuera de la ventana de tiempo"""
        current_time = time.time()
        cutoff_time = current_time - window_seconds
        
        if ip in self._requests and endpoint in self._requests[ip]:
            self._requests[ip][endpoint] = [
                (timestamp, count) for timestamp, count in self._requests[ip][endpoint]
                if timestamp > cutoff_time
            ]
    
    def is_rate_limited(self, endpoint: str, max_requests: int = 10, 
                       window_seconds: int = 60) -> Tuple[bool, Optional[int]]:
        """
        Verificar si la IP actual está rate limited
        
        Returns:
            Tuple[bool, Optional[int]]: (is_limited, retry_after_seconds)
        """
        ip = self._get_client_ip()
        current_time = time.time()
        
        # Limpiar requests antiguos
        self._cleanup_old_requests(ip, endpoint, window_seconds)
        
        # Contar requests en la ventana actual
        request_count = sum(
            count for timestamp, count in self._requests[ip][endpoint]
        )
        
        if request_count >= max_requests:
            # Calcular tiempo de espera
            oldest_request = min(
                timestamp for timestamp, count in self._requests[ip][endpoint]
            )
            retry_after = int(window_seconds - (current_time - oldest_request)) + 1
            
            logger.warning(f"Rate limit excedido para {ip} en {endpoint}: {request_count}/{max_requests}")
            return True, max(retry_after, 1)
        
        # Registrar este request
        self._requests[ip][endpoint].append((current_time, 1))
        return False, None
    
    def record_failed_login(self, ip: str = None) -> int:
        """
        Registrar intento de login fallido
        
        Returns:
            int: Número total de intentos fallidos en la última hora
        """
        if ip is None:
            ip = self._get_client_ip()
        
        current_time = time.time()
        cutoff_time = current_time - 3600  # 1 hora
        
        # Limpiar intentos antiguos
        self._failed_attempts[ip] = [
            (timestamp, count) for timestamp, count in self._failed_attempts[ip]
            if timestamp > cutoff_time
        ]
        
        # Registrar nuevo intento fallido
        self._failed_attempts[ip].append((current_time, 1))
        
        failed_count = len(self._failed_attempts[ip])
        
        if failed_count >= 5:
            logger.warning(f"Múltiples intentos de login fallidos desde {ip}: {failed_count}")
        
        return failed_count
    
    def is_ip_suspicious(self, ip: str = None) -> bool:
        """Verificar si una IP tiene comportamiento sospechoso"""
        if ip is None:
            ip = self._get_client_ip()
        
        failed_count = len(self._failed_attempts.get(ip, []))
        return failed_count >= 10  # 10 intentos fallidos en una hora
    
    def block_account_temporarily(self, email: str, minutes: int = 15):
        """Bloquear cuenta temporalmente"""
        unblock_time = datetime.utcnow() + timedelta(minutes=minutes)
        self._blocked_accounts[email] = unblock_time
        logger.warning(f"Cuenta bloqueada temporalmente: {email} hasta {unblock_time}")
    
    def is_account_blocked(self, email: str) -> Tuple[bool, Optional[int]]:
        """
        Verificar si una cuenta está bloqueada temporalmente
        
        Returns:
            Tuple[bool, Optional[int]]: (is_blocked, remaining_seconds)
        """
        if email not in self._blocked_accounts:
            return False, None
        
        unblock_time = self._blocked_accounts[email]
        current_time = datetime.utcnow()
        
        if current_time >= unblock_time:
            # El bloqueo ha expirado
            del self._blocked_accounts[email]
            return False, None
        
        remaining_seconds = int((unblock_time - current_time).total_seconds())
        return True, remaining_seconds

class SecurityEventLogger:
    """Logger especializado para eventos de seguridad"""
    
    def __init__(self):
        self.security_logger = logging.getLogger('security')
        
        # Configurar handler específico para seguridad si no existe
        if not self.security_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - SECURITY - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.security_logger.addHandler(handler)
            self.security_logger.setLevel(logging.WARNING)
    
    def log_failed_login(self, login_field: str, ip: str, reason: str = "invalid_credentials"):
        """Log intento de login fallido"""
        self.security_logger.warning(
            f"FAILED_LOGIN - IP: {ip}, Login: {login_field}, Reason: {reason}"
        )
    
    def log_rate_limit_exceeded(self, ip: str, endpoint: str, attempts: int):
        """Log rate limit excedido"""
        self.security_logger.warning(
            f"RATE_LIMIT_EXCEEDED - IP: {ip}, Endpoint: {endpoint}, Attempts: {attempts}"
        )
    
    def log_suspicious_activity(self, ip: str, activity: str, details: str = ""):
        """Log actividad sospechosa"""
        self.security_logger.error(
            f"SUSPICIOUS_ACTIVITY - IP: {ip}, Activity: {activity}, Details: {details}"
        )
    
    def log_account_blocked(self, email: str, ip: str, reason: str):
        """Log bloqueo de cuenta"""
        self.security_logger.error(
            f"ACCOUNT_BLOCKED - Email: {email}, IP: {ip}, Reason: {reason}"
        )
    
    def log_invalid_token(self, ip: str, token_error: str):
        """Log token JWT inválido"""
        self.security_logger.warning(
            f"INVALID_TOKEN - IP: {ip}, Error: {token_error}"
        )
    
    def log_xss_attempt(self, ip: str, field: str, payload: str):
        """Log intento de XSS detectado"""
        # No logear el payload completo por seguridad, solo un hash o preview
        payload_preview = payload[:50] + "..." if len(payload) > 50 else payload
        self.security_logger.error(
            f"XSS_ATTEMPT - IP: {ip}, Field: {field}, Payload_Preview: {payload_preview}"
        )

# Instancias globales
security_utils = SecurityUtils()
rate_limiter = RateLimiter()
security_event_logger = SecurityEventLogger()

# Funciones de conveniencia
def sanitize_html(text: str) -> str:
    """Función de conveniencia para sanitizar HTML"""
    return security_utils.sanitize_html(text)

def sanitize_input(data: Any) -> Any:
    """Función de conveniencia para sanitizar input"""
    return security_utils.sanitize_input(data)

def validate_and_sanitize_user_input(data: dict) -> dict:
    """Función de conveniencia para validar y sanitizar datos de usuario"""
    return security_utils.validate_and_sanitize_user_input(data)

def check_rate_limit(endpoint: str, max_requests: int = 10, window_seconds: int = 60) -> Tuple[bool, Optional[int]]:
    """Función de conveniencia para verificar rate limit"""
    return rate_limiter.is_rate_limited(endpoint, max_requests, window_seconds)

def record_failed_login(ip: str = None) -> int:
    """Función de conveniencia para registrar login fallido"""
    return rate_limiter.record_failed_login(ip)