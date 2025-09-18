#!/usr/bin/env python3
"""
Script para iniciar el servidor de desarrollo optimizado para Expo Go
"""
import subprocess
import socket
import os
from dotenv import load_dotenv

def get_local_ip():
    """Obtener la IP local de la red"""
    try:
        # Crear socket temporal para obtener IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"

def main():
    load_dotenv()
    
    local_ip = get_local_ip()
    port = os.getenv('FLASK_PORT', '5000')
    
    print("🚀 AUREUM BACKEND - EXPO GO MODE")
    print("="*50)
    print(f"📍 IP Local: {local_ip}")
    print(f"🔌 Puerto: {port}")
    print(f"📱 URL para Expo: http://{local_ip}:{port}")
    print("="*50)
    print("💡 INSTRUCCIONES:")
    print(f"1. En tu app React Native, usa: http://{local_ip}:{port}")
    print("2. Asegúrate que tu dispositivo esté en la misma red WiFi")
    print("3. El backend estará disponible para Expo Go")
    print("="*50)
    
    # Ejecutar la aplicación
    os.system(f"python app.py")

if __name__ == "__main__":
    main()