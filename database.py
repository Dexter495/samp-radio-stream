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
