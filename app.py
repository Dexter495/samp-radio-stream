"""
Servidor Flask para el sistema de radio streaming Starlight
"""

from flask import Flask, render_template, request, jsonify, send_from_directory, session, redirect, url_for
import os
import config
from werkzeug.utils import secure_filename
import json
import secrets
import database

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = config.MAX_FILE_SIZE
# Generate a random secret key for sessions
# Note: This key will change on restart, invalidating existing sessions
# For production, use a fixed key from environment variable or config file
app.config['SECRET_KEY'] = secrets.token_hex(32)

# Inicializar base de datos al iniciar la aplicación
database.init_db()


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
    
    return render_template('index.html', usuario=usuario)


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


if __name__ == '__main__':
    # Debug mode should be disabled in production for security
    # Set environment variable FLASK_DEBUG=1 for development
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
