"""
Módulo de base de datos para el sistema de autenticación
"""

import sqlite3
import hashlib
from datetime import datetime

DB_PATH = 'starlight.db'

def init_db():
    """Inicializar base de datos y crear usuario por defecto"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Crear usuario por defecto: Dylan_Charris / 123456789
    default_password = hashlib.sha256('123456789'.encode()).hexdigest()
    try:
        c.execute('INSERT INTO users (username, password) VALUES (?, ?)', 
                  ('Dylan_Charris', default_password))
    except sqlite3.IntegrityError:
        pass  # Usuario ya existe
    
    conn.commit()
    conn.close()

def verify_user(username, password):
    """Verificar credenciales de usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    hashed = hashlib.sha256(password.encode()).hexdigest()
    c.execute('SELECT id FROM users WHERE username = ? AND password = ?', 
              (username, hashed))
    result = c.fetchone()
    conn.close()
    
    return result is not None

def create_user(username, password):
    """Crear nuevo usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    hashed = hashlib.sha256(password.encode()).hexdigest()
    try:
        c.execute('INSERT INTO users (username, password) VALUES (?, ?)', 
                  (username, hashed))
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
