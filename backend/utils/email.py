import smtplib
import ssl
import os
import random
import string
from email.mime.text import MIMEText as MimeText
from email.mime.multipart import MIMEMultipart as MimeMultipart
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Servicio para envío de emails usando Gmail SMTP"""
    
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.port = 587
        self.email = os.getenv('GMAIL_EMAIL')
        self.password = os.getenv('GMAIL_APP_PASSWORD')  # App Password, NO la contraseña normal
        
        if not self.email or not self.password:
            logger.error("❌ Variables de entorno GMAIL_EMAIL y GMAIL_APP_PASSWORD no configuradas")
            raise ValueError("Configuración de Gmail incompleta")
            
        logger.info(f"📧 Configuración Gmail: {self.email} (servidor: {self.smtp_server}:{self.port})")
    
    def generate_verification_code(self) -> str:
        """Generar código de verificación de 6 dígitos"""
        return ''.join(random.choices(string.digits, k=6))
    
    def send_verification_email(self, recipient_email: str, verification_code: str, username: str = None) -> bool:
        """Enviar email de verificación con código"""
        try:
            # Crear mensaje
            message = MimeMultipart("alternative")
            message["Subject"] = "🔐 Código de verificación - Aureum"
            message["From"] = f"Aureum App <{self.email}>"
            message["To"] = recipient_email
            
            # Plantilla HTML del email
            html_content = self._get_verification_email_template(verification_code, username or recipient_email)
            
            # Plantilla texto plano (fallback)
            text_content = f"""
            Hola{' ' + username if username else ''},
            
            Tu código de verificación para Aureum es: {verification_code}
            
            Este código expira en 5 minutos.
            
            Si no solicitaste este código, ignora este mensaje.
            
            Saludos,
            Equipo de Aureum
            """
            
            # Adjuntar partes
            part1 = MimeText(text_content, "plain")
            part2 = MimeText(html_content, "html")
            
            message.attach(part1)
            message.attach(part2)
            
            # Crear contexto SSL
            context = ssl.create_default_context()
            
            # Enviar email con múltiples intentos
            return self._send_with_fallback(message, recipient_email, context)
            
        except Exception as e:
            logger.error(f"❌ Error enviando email a {recipient_email}: {e}")
            return False
    
    def _send_with_fallback(self, message, recipient_email: str, context) -> bool:
        """Enviar email con múltiples intentos y fallbacks"""
        
        # Configuraciones a probar (puerto, usar TLS)
        # Priorizar 465 (SSL directo) sobre 587 (STARTTLS)
        configs = [
            (465, False),  # Gmail SSL/TLS directo (más confiable)
            (587, True),   # Gmail estándar con STARTTLS (fallback)
        ]
        
        for port, use_starttls in configs:
            try:
                logger.info(f"🔄 Intentando envío por puerto {port}, STARTTLS: {use_starttls}")
                
                if port == 465:
                    # Para puerto 465, usar SMTP_SSL directamente
                    with smtplib.SMTP_SSL(self.smtp_server, port, context=context, timeout=10) as server:
                        server.login(self.email, self.password)
                        server.sendmail(self.email, recipient_email, message.as_string())
                else:
                    # Para otros puertos, usar SMTP normal
                    with smtplib.SMTP(self.smtp_server, port, timeout=10) as server:
                        if use_starttls:
                            try:
                                server.starttls(context=context)
                            except Exception as starttls_error:
                                logger.warning(f"STARTTLS falló en puerto {port}: {starttls_error}")
                                continue
                        
                        server.login(self.email, self.password)
                        server.sendmail(self.email, recipient_email, message.as_string())
                
                logger.info(f"✅ Email enviado exitosamente por puerto {port} a {recipient_email}")
                return True
                
            except Exception as e:
                logger.warning(f"❌ Fallo en puerto {port}: {e}")
                continue
        
        logger.error(f"❌ Todos los intentos de envío fallaron para {recipient_email}")
        
        return False
    
    def _get_verification_email_template(self, code: str, username: str) -> str:
        """Plantilla HTML para el email de verificación"""
        return f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Código de Verificación</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f8fafc;
                    margin: 0;
                    padding: 20px;
                    line-height: 1.6;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: bold;
                }}
                .content {{
                    padding: 40px 30px;
                    text-align: center;
                }}
                .greeting {{
                    color: #1e293b;
                    font-size: 18px;
                    margin-bottom: 20px;
                }}
                .message {{
                    color: #64748b;
                    font-size: 16px;
                    margin-bottom: 30px;
                }}
                .code-container {{
                    background-color: #f1f5f9;
                    border: 2px dashed #f59e0b;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                }}
                .code {{
                    font-family: 'Courier New', monospace;
                    font-size: 32px;
                    font-weight: bold;
                    color: #f59e0b;
                    letter-spacing: 8px;
                    margin: 0;
                }}
                .expiry {{
                    color: #ef4444;
                    font-size: 14px;
                    margin-top: 15px;
                    font-weight: 500;
                }}
                .footer {{
                    background-color: #f8fafc;
                    padding: 20px 30px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 14px;
                }}
                .security-note {{
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .security-note p {{
                    margin: 0;
                    color: #92400e;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Aureum</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">
                        ¡Hola{' ' + username if username != username.split('@')[0] else ''}! 👋
                    </div>
                    
                    <div class="message">
                        Para completar tu registro en <strong>Aureum</strong>, necesitamos verificar tu email.
                        <br>Usa el siguiente código de verificación:
                    </div>
                    
                    <div class="code-container">
                        <div class="code">{code}</div>
                        <div class="expiry">⏰ Este código expira en 5 minutos</div>
                    </div>
                    
                    <div class="security-note">
                        <p><strong>🛡️ Nota de seguridad:</strong> Si no solicitaste este código, ignora este mensaje. Nunca compartas este código con nadie.</p>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Este es un mensaje automático, por favor no respondas a este email.</p>
                    <p>&copy; 2025 Aureum. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """

# Instancia global del servicio
try:
    email_service = EmailService()
except ValueError as e:
    logger.warning(f"⚠️ EmailService no inicializado: {e}")
    email_service = None

def send_verification_code(email: str, username: str = None) -> tuple[bool, str, str]:
    """
    Función helper para enviar código de verificación
    Returns: (success, message, code)
    """
    if not email_service:
        return False, "Servicio de email no configurado", ""

    try:
        code = email_service.generate_verification_code()
        success = email_service.send_verification_email(email, code, username)

        if success:
            return True, "Email enviado exitosamente", code
        else:
            return False, "Error enviando email", ""

    except Exception as e:
        logger.error(f"Error en send_verification_code: {e}")
        return False, "Error interno enviando email", ""

def send_generic_code(email: str, code: str, subject: str = "Código de verificación") -> bool:
    """
    Función para enviar un código genérico por email (para acciones administrativas)
    Returns: bool (success)
    """
    if not email_service:
        logger.error("Servicio de email no configurado")
        return False

    try:
        # Crear mensaje personalizado para códigos genéricos
        message = MimeMultipart("alternative")
        message["Subject"] = f"🔐 {subject} - Aureum"
        message["From"] = f"Aureum App <{email_service.email}>"
        message["To"] = email

        # Plantilla HTML para código genérico
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{subject}</title>
            <style>
                body {{ font-family: 'Segoe UI', sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
                .header {{ background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: bold; }}
                .content {{ padding: 40px 30px; text-align: center; }}
                .message {{ color: #64748b; font-size: 16px; margin-bottom: 30px; }}
                .code-container {{ background-color: #f1f5f9; border: 2px dashed #f59e0b; border-radius: 12px; padding: 25px; margin: 30px 0; }}
                .code {{ font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #f59e0b; letter-spacing: 8px; margin: 0; }}
                .expiry {{ color: #ef4444; font-size: 14px; margin-top: 15px; font-weight: 500; }}
                .footer {{ background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Aureum</h1>
                </div>
                <div class="content">
                    <div class="message">
                        Para completar la acción solicitada, usa el siguiente código de verificación:
                    </div>
                    <div class="code-container">
                        <div class="code">{code}</div>
                        <div class="expiry">⏰ Este código expira en 5 minutos</div>
                    </div>
                </div>
                <div class="footer">
                    <p>Este es un mensaje automático, por favor no respondas a este email.</p>
                    <p>&copy; 2025 Aureum. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plantilla texto plano
        text_content = f"""
        {subject}

        Tu código de verificación es: {code}

        Este código expira en 5 minutos.

        Si no solicitaste este código, ignora este mensaje.

        Saludos,
        Equipo de Aureum
        """

        # Adjuntar partes
        part1 = MimeText(text_content, "plain")
        part2 = MimeText(html_content, "html")

        message.attach(part1)
        message.attach(part2)

        # Crear contexto SSL
        import ssl
        context = ssl.create_default_context()

        # Enviar usando el método existente
        return email_service._send_with_fallback(message, email, context)

    except Exception as e:
        logger.error(f"Error enviando código genérico a {email}: {e}")
        return False