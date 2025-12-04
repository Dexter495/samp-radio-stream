"""
Configuración del sistema de radio streaming Starlight
"""

import os

# Configuración de la aplicación
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
PLAYLIST_FOLDER = os.path.join(BASE_DIR, 'playlists')
MAX_USERS = 30
ALLOWED_EXTENSIONS = {'mp3'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Configuración de Icecast
ICECAST_HOST = 'localhost'
ICECAST_PORT = 8000
ICECAST_PASSWORD = 'hackme'
ICECAST_ADMIN_PASSWORD = 'hackme'

# Configuración de Liquidsoap
LIQUIDSOAP_HOST = 'localhost'
LIQUIDSOAP_TELNET_PORT = 1234

# Crear directorios si no existen
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PLAYLIST_FOLDER, exist_ok=True)
