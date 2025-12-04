"""
Módulo de gestión de base de datos para Starlight Radio Stream
Maneja usuarios, autenticación y permisos de administrador
"""

import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# Ruta de la base de datos
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'starlight.db')


def get_db_connection():
    """Crear conexión a la base de datos"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Inicializar la base de datos con la tabla de usuarios"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Crear tabla de usuarios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    
    # Crear usuario admin por defecto si no existe
    # NOTA: En producción, cambiar la contraseña por defecto
    try:
        create_user('Dylan_Charris', '123456789', is_admin=True)
    except sqlite3.IntegrityError:
        pass  # El usuario ya existe
    
    conn.close()


def hash_password(password):
    """Hashear contraseña usando Werkzeug (pbkdf2:sha256)"""
    return generate_password_hash(password)


def create_user(username, password, is_admin=False):
    """
    Crear un nuevo usuario
    
    Args:
        username: Nombre de usuario
        password: Contraseña en texto plano
        is_admin: Si el usuario es administrador (default: False)
    
    Returns:
        True si se creó exitosamente, False si el usuario ya existe
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        hashed_pw = hash_password(password)
        cursor.execute(
            'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
            (username, hashed_pw, 1 if is_admin else 0)
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False


def authenticate_user(username, password):
    """
    Autenticar usuario
    
    Args:
        username: Nombre de usuario
        password: Contraseña en texto plano
    
    Returns:
        True si las credenciales son correctas, False en caso contrario
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        'SELECT password FROM users WHERE username = ?',
        (username,)
    )
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return check_password_hash(user['password'], password)
    return False


def get_user(username):
    """
    Obtener información de un usuario
    
    Args:
        username: Nombre de usuario
    
    Returns:
        Diccionario con información del usuario o None si no existe
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None


def is_admin(username):
    """
    Verificar si un usuario es administrador
    
    Args:
        username: Nombre de usuario
    
    Returns:
        True si el usuario es admin, False en caso contrario
    """
    user = get_user(username)
    if user:
        return bool(user['is_admin'])
    return False


def get_all_users():
    """
    Obtener todos los usuarios
    
    Returns:
        Lista de diccionarios con información de todos los usuarios
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC')
    users = cursor.fetchall()
    conn.close()
    
    return [dict(user) for user in users]


def get_user_count():
    """
    Contar el número total de usuarios
    
    Returns:
        Número total de usuarios registrados
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) as count FROM users')
    result = cursor.fetchone()
    conn.close()
    
    return result['count'] if result else 0


def delete_user(user_id):
    """
    Eliminar un usuario
    
    Args:
        user_id: ID del usuario a eliminar
    
    Returns:
        True si se eliminó exitosamente, False en caso contrario
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    except sqlite3.Error:
        conn.close()
        return False


def toggle_admin(user_id):
    """
    Cambiar el estado de administrador de un usuario
    
    Args:
        user_id: ID del usuario
    
    Returns:
        True si se cambió exitosamente, False en caso contrario
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Obtener el estado actual
        cursor.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,))
        result = cursor.fetchone()
        
        if result:
            new_status = 0 if result['is_admin'] else 1
            cursor.execute('UPDATE users SET is_admin = ? WHERE id = ?', (new_status, user_id))
            conn.commit()
            conn.close()
            return True
        
        conn.close()
        return False
    except sqlite3.Error:
        conn.close()
        return False


def get_user_by_id(user_id):
    """
    Obtener información de un usuario por su ID
    
    Args:
        user_id: ID del usuario
    
    Returns:
        Diccionario con información del usuario o None si no existe
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None


# Inicializar la base de datos al importar el módulo
init_db()
