"""
Módulo de base de datos para el sistema de autenticación
"""

import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

DB_PATH = 'starlight.db'

def init_db():
    """Inicializar base de datos y crear usuario por defecto"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Crear tabla con columna is_admin
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Verificar si necesitamos agregar la columna is_admin a una tabla existente
    c.execute("PRAGMA table_info(users)")
    columns = [column[1] for column in c.fetchall()]
    if 'is_admin' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0')
    
    # Crear tabla de playlists
    c.execute('''
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(username, name)
        )
    ''')
    
    # Crear tabla de canciones de playlist
    c.execute('''
        CREATE TABLE IF NOT EXISTS playlist_songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            song_name TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
        )
    ''')
    
    # Crear usuario admin por defecto: Dylan_Charris / 123456789
    default_password = generate_password_hash('123456789', method='pbkdf2:sha256')
    try:
        c.execute('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', 
                  ('Dylan_Charris', default_password, 1))
    except sqlite3.IntegrityError:
        # Usuario ya existe, verificar que sea admin
        c.execute('UPDATE users SET is_admin = 1 WHERE username = ?', ('Dylan_Charris',))
    
    conn.commit()
    conn.close()

def verify_user(username, password):
    """Verificar credenciales de usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('SELECT password FROM users WHERE username = ?', (username,))
    result = c.fetchone()
    conn.close()
    
    if result is None:
        return False
    
    return check_password_hash(result[0], password)

def create_user(username, password, is_admin=False):
    """Crear nuevo usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    hashed = generate_password_hash(password, method='pbkdf2:sha256')
    try:
        c.execute('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', 
                  (username, hashed, 1 if is_admin else 0))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

def user_exists(username):
    """Verificar si un usuario existe"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT id FROM users WHERE username = ?', (username,))
    result = c.fetchone()
    conn.close()
    return result is not None

def get_all_users():
    """Obtener todos los usuarios"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC')
    users = []
    for row in c.fetchall():
        users.append({
            'id': row[0],
            'username': row[1],
            'is_admin': bool(row[2]),
            'created_at': row[3]
        })
    conn.close()
    return users

def delete_user(user_id):
    """Eliminar usuario por ID"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Verificar que no sea el usuario Dylan_Charris (admin principal)
    c.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    result = c.fetchone()
    if result and result[0] == 'Dylan_Charris':
        conn.close()
        return False
    
    c.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return True

def toggle_admin(user_id):
    """Dar o quitar permisos de admin"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Verificar que no sea el usuario Dylan_Charris (admin principal)
    c.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    result = c.fetchone()
    if result and result[0] == 'Dylan_Charris':
        conn.close()
        return False
    
    c.execute('UPDATE users SET is_admin = CASE WHEN is_admin = 1 THEN 0 ELSE 1 END WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return True

def is_admin(username):
    """Verificar si un usuario es administrador"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT is_admin FROM users WHERE username = ?', (username,))
    result = c.fetchone()
    conn.close()
    return result is not None and bool(result[0])

def get_user_count():
    """Obtener el número total de usuarios"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM users')
    count = c.fetchone()[0]
    conn.close()
    return count

# ========================================
# FUNCIONES DE PLAYLISTS
# ========================================

def create_playlist(username, playlist_name):
    """Crear una nueva playlist para un usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute('INSERT INTO playlists (username, name) VALUES (?, ?)', 
                  (username, playlist_name))
        playlist_id = c.lastrowid
        conn.commit()
        conn.close()
        return playlist_id
    except sqlite3.IntegrityError:
        conn.close()
        return None

def get_user_playlists(username):
    """Obtener todas las playlists de un usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        SELECT p.id, p.name, p.created_at, COUNT(ps.id) as song_count
        FROM playlists p
        LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
        WHERE p.username = ?
        GROUP BY p.id, p.name, p.created_at
        ORDER BY p.created_at DESC
    ''', (username,))
    
    playlists = []
    for row in c.fetchall():
        playlists.append({
            'id': row[0],
            'name': row[1],
            'created_at': row[2],
            'song_count': row[3]
        })
    conn.close()
    return playlists

def get_playlist(playlist_id):
    """Obtener detalles de una playlist específica"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT id, username, name, created_at FROM playlists WHERE id = ?', 
              (playlist_id,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return None
    
    playlist = {
        'id': result[0],
        'username': result[1],
        'name': result[2],
        'created_at': result[3]
    }
    
    # Obtener canciones de la playlist
    c.execute('''
        SELECT id, song_name, position, added_at 
        FROM playlist_songs 
        WHERE playlist_id = ? 
        ORDER BY position
    ''', (playlist_id,))
    
    songs = []
    for row in c.fetchall():
        songs.append({
            'id': row[0],
            'song_name': row[1],
            'position': row[2],
            'added_at': row[3]
        })
    
    playlist['songs'] = songs
    conn.close()
    return playlist

def add_song_to_playlist(playlist_id, song_name):
    """Agregar una canción a una playlist"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Obtener la posición más alta actual
    c.execute('SELECT MAX(position) FROM playlist_songs WHERE playlist_id = ?', 
              (playlist_id,))
    max_pos = c.fetchone()[0]
    new_position = (max_pos + 1) if max_pos is not None else 0
    
    try:
        c.execute('''
            INSERT INTO playlist_songs (playlist_id, song_name, position) 
            VALUES (?, ?, ?)
        ''', (playlist_id, song_name, new_position))
        conn.commit()
        conn.close()
        return True
    except Exception:
        conn.close()
        return False

def remove_song_from_playlist(playlist_id, song_name):
    """Eliminar una canción de una playlist"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_name = ?', 
              (playlist_id, song_name))
    conn.commit()
    conn.close()
    return True

def delete_playlist(playlist_id):
    """Eliminar una playlist"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM playlists WHERE id = ?', (playlist_id,))
    conn.commit()
    conn.close()
    return True

def verify_playlist_owner(playlist_id, username):
    """Verificar que una playlist pertenece a un usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT username FROM playlists WHERE id = ?', (playlist_id,))
    result = c.fetchone()
    conn.close()
    return result is not None and result[0] == username
