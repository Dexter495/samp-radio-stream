"""
Servidor Flask para el sistema de radio streaming Starlight
"""

from flask import Flask, render_template, request, jsonify, send_from_directory, session, redirect, url_for, flash
import os
import config
from werkzeug.utils import secure_filename
import json
import secrets
import database
from functools import wraps
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import yt_dlp
import threading
import time

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = config.MAX_FILE_SIZE
# Generate a random secret key for sessions
# Note: This key will change on restart, invalidating existing sessions
# For production, use a fixed key from environment variable or config file
app.config['SECRET_KEY'] = secrets.token_hex(32)

# Inicializar base de datos al iniciar la aplicación
database.init_db()

# Thread-safe lock para proteger download_status
download_status_lock = threading.Lock()


def admin_required(f):
    """Decorador para proteger rutas de administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            flash('Debes iniciar sesión para acceder')
            return redirect(url_for('login'))
        if not database.is_admin(session['username']):
            flash('Acceso denegado. Se requieren permisos de administrador.')
            return redirect(url_for('user_page', usuario=session['username']))
        return f(*args, **kwargs)
    return decorated_function


def allowed_file(filename):
    """Verifica si la extensión del archivo es permitida"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


def get_user_folder(usuario):
    """Retorna la ruta de la carpeta del usuario"""
    user_folder = os.path.join(config.UPLOAD_FOLDER, secure_filename(usuario))
    os.makedirs(user_folder, exist_ok=True)
    return user_folder


def get_user_playlist(usuario):
    """Retorna la ruta del archivo de playlist del usuario"""
    return os.path.join(config.PLAYLIST_FOLDER, f"{secure_filename(usuario)}.m3u")


def get_user_state_file(usuario):
    """Retorna la ruta del archivo de estado del usuario"""
    return os.path.join(config.PLAYLIST_FOLDER, f"{secure_filename(usuario)}_state.json")


def save_user_state(usuario, state):
    """Guarda el estado del usuario"""
    state_file = get_user_state_file(usuario)
    with open(state_file, 'w') as f:
        json.dump(state, f)


def load_user_state(usuario):
    """Carga el estado del usuario"""
    state_file = get_user_state_file(usuario)
    if os.path.exists(state_file):
        with open(state_file, 'r') as f:
            return json.load(f)
    return {'playing': False, 'current_song': None, 'paused': False}


def update_playlist(usuario):
    """Actualiza el archivo de playlist del usuario"""
    user_folder = get_user_folder(usuario)
    playlist_file = get_user_playlist(usuario)
    
    # Obtener todas las canciones del usuario
    canciones = []
    if os.path.exists(user_folder):
        for filename in os.listdir(user_folder):
            if allowed_file(filename):
                song_path = os.path.join(user_folder, filename)
                canciones.append(song_path)
    
    # Escribir playlist
    with open(playlist_file, 'w') as f:
        for cancion in canciones:
            f.write(f"{cancion}\n")
    
    return canciones


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Página y proceso de login"""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            return render_template('login.html', error='Usuario y contraseña son requeridos')
        
        if database.verify_user(username, password):
            session['username'] = username
            session['logged_in'] = True
            return redirect(url_for('user_page', usuario=username))
        else:
            return render_template('login.html', error='Usuario o contraseña incorrectos')
    
    # Si ya está logueado, redirigir a su página
    if session.get('logged_in'):
        return redirect(url_for('user_page', usuario=session.get('username')))
    
    return render_template('login.html')


@app.route('/logout')
def logout():
    """Cerrar sesión"""
    session.clear()
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    """Página y proceso de registro"""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validaciones
        if not username or not password or not confirm_password:
            return render_template('register.html', error='Todos los campos son requeridos')
        
        if len(username) < 3 or len(username) > 50:
            return render_template('register.html', error='El usuario debe tener entre 3 y 50 caracteres')
        
        if len(password) < 6:
            return render_template('register.html', error='La contraseña debe tener al menos 6 caracteres')
        
        if password != confirm_password:
            return render_template('register.html', error='Las contraseñas no coinciden')
        
        if database.user_exists(username):
            return render_template('register.html', error='El usuario ya existe')
        
        # Crear usuario
        if database.create_user(username, password):
            return render_template('register.html', success='Usuario creado exitosamente. Ahora puedes iniciar sesión.')
        else:
            return render_template('register.html', error='Error al crear el usuario')
    
    return render_template('register.html')


@app.route('/')
def index():
    """Página de inicio - redirige a login si no está autenticado"""
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    # Si está logueado, redirigir a su página de usuario
    return redirect(url_for('user_page', usuario=session.get('username')))


@app.route('/<usuario>')
def user_page(usuario):
    """Página web del usuario - requiere autenticación"""
    # Verificar autenticación
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    # Verificar que el usuario logueado coincida con el usuario solicitado
    if session.get('username') != usuario:
        return redirect(url_for('user_page', usuario=session.get('username')))
    
    if not usuario or len(usuario) > 50:
        return "Usuario inválido", 400
    
    # Obtener el conteo de usuarios activos
    active_users = len([f for f in os.listdir(config.UPLOAD_FOLDER) 
                       if os.path.isdir(os.path.join(config.UPLOAD_FOLDER, f))])
    
    if active_users >= config.MAX_USERS:
        # Verificar si el usuario ya existe antes de llamar a get_user_folder
        user_folder_path = os.path.join(config.UPLOAD_FOLDER, secure_filename(usuario))
        if not os.path.exists(user_folder_path) or not os.listdir(user_folder_path):
            return f"Límite de usuarios alcanzado ({config.MAX_USERS} máximo)", 429
    
    # Verificar si el usuario es administrador
    is_user_admin = database.is_admin(usuario)
    
    return render_template('index.html', usuario=usuario, is_admin=is_user_admin)


@app.route('/api/<usuario>/upload', methods=['POST'])
def upload_file(usuario):
    """Subir canción"""
    if 'file' not in request.files:
        return jsonify({'error': 'No se encontró archivo'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó archivo'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Solo se permiten archivos MP3'}), 400
    
    filename = secure_filename(file.filename)
    user_folder = get_user_folder(usuario)
    
    # Verificar cuántas canciones tiene el usuario
    current_songs = len([f for f in os.listdir(user_folder) if allowed_file(f)])
    if current_songs >= 50:  # Límite de 50 canciones por usuario
        return jsonify({'error': 'Límite de canciones alcanzado (50 máximo)'}), 400
    
    filepath = os.path.join(user_folder, filename)
    file.save(filepath)
    
    # Actualizar playlist
    update_playlist(usuario)
    
    return jsonify({'success': True, 'filename': filename})


@app.route('/api/<usuario>/canciones', methods=['GET'])
def list_songs(usuario):
    """Listar canciones del usuario"""
    user_folder = get_user_folder(usuario)
    canciones = []
    
    if os.path.exists(user_folder):
        for filename in sorted(os.listdir(user_folder)):
            if allowed_file(filename):
                filepath = os.path.join(user_folder, filename)
                size = os.path.getsize(filepath)
                canciones.append({
                    'nombre': filename,
                    'tamaño': size
                })
    
    state = load_user_state(usuario)
    
    return jsonify({
        'canciones': canciones,
        'estado': state
    })


@app.route('/api/<usuario>/cancion/<nombre>', methods=['DELETE'])
def delete_song(usuario, nombre):
    """Eliminar canción"""
    # Guardar el nombre original para comparación con el estado
    original_nombre = nombre
    filename = secure_filename(nombre)
    user_folder = get_user_folder(usuario)
    filepath = os.path.join(user_folder, filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Canción no encontrada'}), 404
    
    # Verificar que el archivo esté dentro de la carpeta del usuario
    if not filepath.startswith(user_folder):
        return jsonify({'error': 'Acceso denegado'}), 403
    
    try:
        os.remove(filepath)
        
        # Actualizar playlist
        update_playlist(usuario)
        
        # Si era la canción actual, detener reproducción
        state = load_user_state(usuario)
        # Comparar con el nombre original antes de secure_filename
        if state.get('current_song') == original_nombre:
            state['playing'] = False
            state['current_song'] = None
            state['paused'] = False
            save_user_state(usuario, state)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/<usuario>/play', methods=['POST'])
def play_song(usuario):
    """Reproducir canción"""
    data = request.get_json()
    if not data or 'cancion' not in data:
        return jsonify({'error': 'Se requiere nombre de canción'}), 400
    
    nombre = data['cancion']
    filename = secure_filename(nombre)
    user_folder = get_user_folder(usuario)
    filepath = os.path.join(user_folder, filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Canción no encontrada'}), 404
    
    # Actualizar estado
    state = {
        'playing': True,
        'current_song': nombre,
        'paused': False
    }
    save_user_state(usuario, state)
    
    # Generar URL del stream
    stream_url = f"http://{config.ICECAST_HOST}:{config.ICECAST_PORT}/{secure_filename(usuario)}"
    
    return jsonify({
        'success': True,
        'stream_url': stream_url,
        'estado': state
    })


@app.route('/api/<usuario>/pause', methods=['POST'])
def pause_song(usuario):
    """Pausar reproducción"""
    state = load_user_state(usuario)
    
    if not state.get('playing'):
        return jsonify({'error': 'No hay reproducción activa'}), 400
    
    state['paused'] = True
    save_user_state(usuario, state)
    
    return jsonify({'success': True, 'estado': state})


@app.route('/api/<usuario>/resume', methods=['POST'])
def resume_song(usuario):
    """Continuar reproducción"""
    state = load_user_state(usuario)
    
    if not state.get('playing'):
        return jsonify({'error': 'No hay reproducción activa'}), 400
    
    state['paused'] = False
    save_user_state(usuario, state)
    
    return jsonify({'success': True, 'estado': state})


@app.route('/api/<usuario>/stop', methods=['POST'])
def stop_song(usuario):
    """Detener reproducción"""
    state = {
        'playing': False,
        'current_song': None,
        'paused': False
    }
    save_user_state(usuario, state)
    
    return jsonify({'success': True, 'estado': state})


# ========================================
# RUTAS DE PLAYLISTS
# ========================================

@app.route('/api/<usuario>/playlists', methods=['GET'])
def get_playlists(usuario):
    """Obtener playlists del usuario"""
    playlists = database.get_user_playlists(usuario)
    return jsonify({'playlists': playlists})


@app.route('/api/<usuario>/playlists', methods=['POST'])
def create_playlist(usuario):
    """Crear nueva playlist"""
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': 'Se requiere nombre de playlist'}), 400
    
    name = data['name'].strip()
    if not name:
        return jsonify({'error': 'El nombre no puede estar vacío'}), 400
    
    if len(name) > 100:
        return jsonify({'error': 'El nombre es demasiado largo'}), 400
    
    playlist_id = database.create_playlist(usuario, name)
    if playlist_id:
        return jsonify({'success': True, 'playlist_id': playlist_id, 'name': name})
    else:
        return jsonify({'error': 'Ya existe una playlist con ese nombre'}), 400


@app.route('/api/<usuario>/playlists/<int:playlist_id>', methods=['GET'])
def get_playlist(usuario, playlist_id):
    """Obtener detalles de una playlist"""
    # Verificar que la playlist pertenezca al usuario
    if not database.verify_playlist_owner(playlist_id, usuario):
        return jsonify({'error': 'Playlist no encontrada'}), 404
    
    playlist = database.get_playlist(playlist_id)
    if playlist:
        return jsonify(playlist)
    else:
        return jsonify({'error': 'Playlist no encontrada'}), 404


@app.route('/api/<usuario>/playlists/<int:playlist_id>', methods=['DELETE'])
def delete_playlist(usuario, playlist_id):
    """Eliminar playlist"""
    # Verificar que la playlist pertenezca al usuario
    if not database.verify_playlist_owner(playlist_id, usuario):
        return jsonify({'error': 'Playlist no encontrada'}), 404
    
    database.delete_playlist(playlist_id)
    return jsonify({'success': True})


@app.route('/api/<usuario>/playlists/<int:playlist_id>/songs', methods=['POST'])
def add_song_to_playlist(usuario, playlist_id):
    """Agregar canción a playlist"""
    # Verificar que la playlist pertenezca al usuario
    if not database.verify_playlist_owner(playlist_id, usuario):
        return jsonify({'error': 'Playlist no encontrada'}), 404
    
    data = request.get_json()
    if not data or 'song_name' not in data:
        return jsonify({'error': 'Se requiere nombre de canción'}), 400
    
    song_name = data['song_name']
    if database.add_song_to_playlist(playlist_id, song_name):
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Error al agregar canción'}), 400


@app.route('/api/<usuario>/playlists/<int:playlist_id>/songs', methods=['DELETE'])
def remove_song_from_playlist(usuario, playlist_id):
    """Eliminar canción de playlist"""
    # Verificar que la playlist pertenezca al usuario
    if not database.verify_playlist_owner(playlist_id, usuario):
        return jsonify({'error': 'Playlist no encontrada'}), 404
    
    data = request.get_json()
    if not data or 'song_name' not in data:
        return jsonify({'error': 'Se requiere nombre de canción'}), 400
    
    song_name = data['song_name']
    database.remove_song_from_playlist(playlist_id, song_name)
    return jsonify({'success': True})


# ========================================
# RUTAS DEL PANEL DE ADMINISTRACIÓN
# ========================================

@app.route('/admin')
@admin_required
def admin_dashboard():
    """Dashboard principal del administrador"""
    user_count = database.get_user_count()
    users = database.get_all_users()
    
    # Obtener últimos 5 usuarios
    latest_users = users[:5]
    
    # Contar canciones totales
    total_songs = 0
    total_size = 0
    if os.path.exists(config.UPLOAD_FOLDER):
        for user_folder in os.listdir(config.UPLOAD_FOLDER):
            user_path = os.path.join(config.UPLOAD_FOLDER, user_folder)
            if os.path.isdir(user_path):
                for filename in os.listdir(user_path):
                    if allowed_file(filename):
                        total_songs += 1
                        total_size += os.path.getsize(os.path.join(user_path, filename))
    
    stats = {
        'user_count': user_count,
        'total_songs': total_songs,
        'total_size': total_size,
        'total_size_mb': round(total_size / (1024 * 1024), 2)
    }
    
    return render_template('admin/dashboard.html', stats=stats, latest_users=latest_users)


@app.route('/admin/users')
@admin_required
def admin_users():
    """Lista de usuarios"""
    users = database.get_all_users()
    current_user = session.get('username')
    return render_template('admin/users.html', users=users, current_user=current_user)


@app.route('/admin/users/delete/<int:user_id>', methods=['POST'])
@admin_required
def admin_delete_user(user_id):
    """Eliminar usuario"""
    # No permitir que el admin se elimine a sí mismo
    users = database.get_all_users()
    user_to_delete = None
    for user in users:
        if user['id'] == user_id:
            user_to_delete = user
            break
    
    if user_to_delete and user_to_delete['username'] == session.get('username'):
        flash('No puedes eliminar tu propia cuenta')
        return redirect(url_for('admin_users'))
    
    if database.delete_user(user_id):
        flash('Usuario eliminado exitosamente')
    else:
        flash('No se pudo eliminar el usuario')
    
    return redirect(url_for('admin_users'))


@app.route('/admin/users/toggle-admin/<int:user_id>', methods=['POST'])
@admin_required
def admin_toggle_admin(user_id):
    """Dar o quitar permisos de administrador"""
    # No permitir que el admin se quite permisos a sí mismo
    users = database.get_all_users()
    user_to_toggle = None
    for user in users:
        if user['id'] == user_id:
            user_to_toggle = user
            break
    
    if user_to_toggle and user_to_toggle['username'] == session.get('username'):
        flash('No puedes modificar tus propios permisos de administrador')
        return redirect(url_for('admin_users'))
    
    if database.toggle_admin(user_id):
        flash('Permisos actualizados exitosamente')
    else:
        flash('No se pudieron actualizar los permisos')
    
    return redirect(url_for('admin_users'))


@app.route('/admin/users/create', methods=['POST'])
@admin_required
def admin_create_user():
    """Crear usuario desde el panel de administración"""
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    is_admin = request.form.get('is_admin') == 'on'
    
    # Validaciones
    if not username or not password:
        flash('Usuario y contraseña son requeridos')
        return redirect(url_for('admin_users'))
    
    if len(username) < 3 or len(username) > 50:
        flash('El usuario debe tener entre 3 y 50 caracteres')
        return redirect(url_for('admin_users'))
    
    if len(password) < 6:
        flash('La contraseña debe tener al menos 6 caracteres')
        return redirect(url_for('admin_users'))
    
    if database.user_exists(username):
        flash('El usuario ya existe')
        return redirect(url_for('admin_users'))
    
    # Crear usuario
    if database.create_user(username, password, is_admin):
        flash('Usuario creado exitosamente')
    else:
        flash('Error al crear el usuario')
    
    return redirect(url_for('admin_users'))


@app.route('/admin/stats')
@admin_required
def admin_stats():
    """Estadísticas detalladas del sistema"""
    users = database.get_all_users()
    
    # Recopilar estadísticas por usuario
    user_stats = []
    for user in users:
        user_folder = os.path.join(config.UPLOAD_FOLDER, secure_filename(user['username']))
        song_count = 0
        total_size = 0
        
        if os.path.exists(user_folder):
            for filename in os.listdir(user_folder):
                if allowed_file(filename):
                    song_count += 1
                    total_size += os.path.getsize(os.path.join(user_folder, filename))
        
        user_stats.append({
            'username': user['username'],
            'is_admin': user['is_admin'],
            'song_count': song_count,
            'total_size': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2)
        })
    
    # Estadísticas generales
    total_users = len(users)
    admin_count = sum(1 for u in users if u['is_admin'])
    total_songs = sum(u['song_count'] for u in user_stats)
    total_size = sum(u['total_size'] for u in user_stats)
    
    stats = {
        'total_users': total_users,
        'admin_count': admin_count,
        'regular_users': total_users - admin_count,
        'total_songs': total_songs,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'avg_songs_per_user': round(total_songs / total_users, 2) if total_users > 0 else 0
    }
    
    return render_template('admin/stats.html', stats=stats, user_stats=user_stats)


# ========================================
# RUTAS DE IMPORTACIÓN (SPOTIFY & YOUTUBE)
# ========================================

# Estado global de descargas - protegido por download_status_lock
download_status = {}

def init_spotify():
    """Inicializa el cliente de Spotify"""
    try:
        client_credentials_manager = SpotifyClientCredentials(
            client_id=config.SPOTIFY_CLIENT_ID,
            client_secret=config.SPOTIFY_CLIENT_SECRET
        )
        return spotipy.Spotify(client_credentials_manager=client_credentials_manager)
    except Exception as e:
        print(f"Error initializing Spotify client: {e}")
        return None


@app.route('/api/<usuario>/spotify/import', methods=['POST'])
def spotify_import(usuario):
    """Importar canciones desde una playlist de Spotify"""
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'Se requiere URL de playlist'}), 400
    
    playlist_url = data['url']
    
    try:
        sp = init_spotify()
        if not sp:
            return jsonify({'error': 'Error al conectar con Spotify'}), 500
        
        # Extraer playlist ID de la URL
        if 'playlist/' in playlist_url:
            playlist_id = playlist_url.split('playlist/')[-1].split('?')[0]
        else:
            return jsonify({'error': 'URL de playlist inválida'}), 400
        
        # Obtener información de la playlist
        playlist = sp.playlist(playlist_id)
        tracks = []
        
        # Obtener todas las canciones (manejar paginación)
        results = sp.playlist_tracks(playlist_id)
        tracks.extend(results['items'])
        
        while results['next']:
            results = sp.next(results)
            tracks.extend(results['items'])
        
        # Formatear la información de las canciones
        songs = []
        for item in tracks:
            if item['track'] and item['track']['name']:
                track = item['track']
                artists = ', '.join([artist['name'] for artist in track['artists']])
                duration_ms = track['duration_ms']
                duration_str = f"{duration_ms // 60000}:{(duration_ms % 60000) // 1000:02d}"
                
                songs.append({
                    'name': track['name'],
                    'artist': artists,
                    'album': track['album']['name'] if track['album'] else '',
                    'duration': duration_str,
                    'search_query': f"{track['name']} {artists}"
                })
        
        return jsonify({
            'success': True,
            'playlist_name': playlist['name'],
            'songs': songs
        })
    
    except Exception as e:
        return jsonify({'error': f'Error al importar playlist: {str(e)}'}), 500


@app.route('/api/<usuario>/youtube/search', methods=['POST'])
def youtube_search(usuario):
    """Buscar una canción en YouTube"""
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'Se requiere query de búsqueda'}), 400
    
    search_query = data['query']
    
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'default_search': 'ytsearch5'
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_results = ydl.extract_info(f"ytsearch5:{search_query}", download=False)
            
            if not search_results or 'entries' not in search_results:
                return jsonify({'error': 'No se encontraron resultados'}), 404
            
            results = []
            for entry in search_results['entries']:
                if entry:
                    duration = entry.get('duration', 0)
                    duration_str = f"{duration // 60}:{duration % 60:02d}" if duration else "N/A"
                    
                    results.append({
                        'id': entry.get('id', ''),
                        'title': entry.get('title', 'Sin título'),
                        'url': f"https://www.youtube.com/watch?v={entry.get('id', '')}",
                        'duration': duration_str,
                        'views': entry.get('view_count', 0),
                        'thumbnail': entry.get('thumbnail', '')
                    })
            
            return jsonify({
                'success': True,
                'results': results
            })
    
    except Exception as e:
        return jsonify({'error': f'Error al buscar en YouTube: {str(e)}'}), 500


def download_youtube_audio(video_url, output_path, usuario, download_id):
    """
    Descarga audio de YouTube y lo convierte a MP3.
    
    Args:
        video_url (str): URL del video de YouTube
        output_path (str): Ruta donde guardar el archivo
        usuario (str): Nombre de usuario
        download_id (str): ID único de la descarga
    """
    global download_status
    global download_status_lock
    
    try:
        with download_status_lock:
            download_status[download_id] = {
                'status': 'downloading',
                'progress': 0,
                'filename': '',
                'error': None
            }
        
        def progress_hook(d):
            if d['status'] == 'downloading':
                if 'downloaded_bytes' in d and 'total_bytes' in d:
                    progress = int((d['downloaded_bytes'] / d['total_bytes']) * 100)
                    with download_status_lock:
                        download_status[download_id]['progress'] = progress
            elif d['status'] == 'finished':
                with download_status_lock:
                    download_status[download_id]['progress'] = 100
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'progress_hooks': [progress_hook],
            'quiet': True,
            'no_warnings': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info)
            # Cambiar extensión a .mp3
            filename_mp3 = os.path.splitext(filename)[0] + '.mp3'
            
            # Obtener solo el nombre del archivo
            final_filename = os.path.basename(filename_mp3)
            
            with download_status_lock:
                download_status[download_id] = {
                    'status': 'completed',
                    'progress': 100,
                    'filename': final_filename,
                    'error': None
                }
            
            # Actualizar playlist
            update_playlist(usuario)
    
    except Exception as e:
        with download_status_lock:
            download_status[download_id] = {
                'status': 'error',
                'progress': 0,
                'filename': '',
                'error': str(e)
            }


@app.route('/api/<usuario>/youtube/download', methods=['POST'])
def youtube_download(usuario):
    """Descargar audio de YouTube como MP3"""
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'Se requiere URL de video'}), 400
    
    video_url = data['url']
    user_folder = get_user_folder(usuario)
    
    # Verificar cuántas canciones tiene el usuario
    current_songs = len([f for f in os.listdir(user_folder) if allowed_file(f)])
    if current_songs >= 50:
        return jsonify({'error': 'Límite de canciones alcanzado (50 máximo)'}), 400
    
    # Generar ID único para esta descarga
    download_id = f"{usuario}_{int(time.time() * 1000)}"
    
    # Iniciar descarga en segundo plano
    thread = threading.Thread(
        target=download_youtube_audio,
        args=(video_url, user_folder, usuario, download_id)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'success': True,
        'download_id': download_id,
        'message': 'Descarga iniciada'
    })


@app.route('/api/<usuario>/download/status/<download_id>', methods=['GET'])
def get_download_status(usuario, download_id):
    """Obtener el estado de una descarga"""
    with download_status_lock:
        if download_id in download_status:
            return jsonify(download_status[download_id])
        else:
            return jsonify({'error': 'Descarga no encontrada'}), 404


if __name__ == '__main__':
    # Debug mode should be disabled in production for security
    # Set environment variable FLASK_DEBUG=1 for development
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
