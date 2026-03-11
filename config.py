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

# Configuración de FFmpeg
# En Windows, especificar la ruta completa si no está en PATH
# En Linux/macOS, generalmente 'ffmpeg' está en PATH
FFMPEG_PATH = os.environ.get('FFMPEG_PATH', 'ffmpeg')

# Configuración de Spotify API
# IMPORTANTE: En producción, usar variables de entorno:
# SPOTIFY_CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID', 'default_value')
# SPOTIFY_CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET', 'default_value')
SPOTIFY_CLIENT_ID = "30ef581b29de42cd9e237d8387687544"
SPOTIFY_CLIENT_SECRET = "39b32562a3024a1c83dea5e8a56c63ba"

# Crear directorios si no existen
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PLAYLIST_FOLDER, exist_ok=True)
