# 🌟 Starlight Radio Streaming System

Sistema completo de radio streaming donde cada jugador de SA-MP puede subir y reproducir su propia música.

## 📋 Características

- **30 usuarios simultáneos** máximo
- **Identificación por nombre SA-MP** - Cada usuario accede con su nombre del juego
- **Stream personal** - Cada jugador tiene su propio canal de audio
- **Gestión de música** - Subir, reproducir, pausar y eliminar canciones
- **Interfaz web** - Control completo desde el navegador
- **Formato MP3** - Soporte para archivos de audio MP3
- **🎧 Importación desde Spotify** - Importa playlists completas de Spotify
- **🎬 Descarga desde YouTube** - Busca y descarga canciones desde YouTube
- **📥 Cola de descargas** - Sistema de cola con seguimiento de progreso en tiempo real

## 🛠️ Stack Tecnológico

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Streaming**: Liquidsoap + Icecast
- **Audio**: MP3

## 📁 Estructura del Proyecto

```
samp-radio-stream/
├── app.py                 # Servidor Flask principal
├── config.py             # Configuración (Icecast, rutas, etc.)
├── requirements.txt      # Dependencias Python
├── templates/
│   └── index.html        # Página web del usuario
├── static/
│   ├── css/
│   │   └── style.css     # Estilos
│   └── js/
│       └── app.js        # JavaScript frontend
├── uploads/              # Carpeta para MP3s de usuarios
├── playlists/            # Playlists .m3u por usuario
├── liquidsoap/
│   └── radio.liq         # Script de Liquidsoap
├── icecast/
│   └── icecast.xml       # Configuración de Icecast
└── README.md             # Este archivo
```

## 🚀 Instalación

### Requisitos Previos

- **Python 3.8+**
- **Liquidsoap** (servidor de streaming de audio)
- **Icecast2** (servidor de distribución de streams)
- **FFmpeg** (requerido para conversión de audio desde YouTube)

### 1. Instalar Dependencias del Sistema

#### En Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y python3 python3-pip liquidsoap icecast2 ffmpeg
```

#### En CentOS/RHEL:

```bash
sudo yum install -y python3 python3-pip liquidsoap icecast ffmpeg
```

#### En macOS (con Homebrew):

```bash
brew install python3 liquidsoap icecast ffmpeg
```

### 2. Clonar el Repositorio

```bash
git clone https://github.com/Dexter495/samp-radio-stream.git
cd samp-radio-stream
```

### 3. Instalar Dependencias de Python

```bash
pip3 install -r requirements.txt
```

### 4. Configurar Icecast

Copiar la configuración de Icecast:

```bash
sudo cp icecast/icecast.xml /etc/icecast2/icecast.xml
```

O si prefieres mantener tu configuración existente, asegúrate de que:
- Puerto: 8000
- Source password: hackme (o cambia en `config.py`)
- Admin password: hackme

### 5. Iniciar Servicios

#### Iniciar Icecast:

```bash
sudo systemctl start icecast2
# O manualmente:
icecast2 -c /etc/icecast2/icecast.xml
```

#### Iniciar Liquidsoap:

```bash
liquidsoap liquidsoap/radio.liq &
```

#### Iniciar Flask:

**Para desarrollo (con debug):**

```bash
FLASK_DEBUG=1 python3 app.py
```

**Para producción:**

```bash
python3 app.py
```

O usar un servidor WSGI de producción como Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 📝 Uso

### Acceso Web

1. Abre tu navegador y ve a: `http://localhost:5000`
2. Para acceder a tu radio personal: `http://localhost:5000/TuNombreSAMP`
   - Reemplaza `TuNombreSAMP` con tu nombre de usuario del juego

### Subir Canciones

1. En tu página personal, haz clic en "Elegir archivo"
2. Selecciona un archivo MP3
3. Haz clic en "Subir MP3"

### Reproducir Música

1. En la sección "Mis Canciones", haz clic en "▶️ Reproducir" junto a la canción deseada
2. La canción comenzará a transmitirse en tu stream personal
3. Usa los botones de control para pausar/continuar/detener

### Importar desde Spotify

1. Ve a la sección "Importar Música" y selecciona la pestaña "Spotify"
2. Copia la URL de tu playlist de Spotify (ej: https://open.spotify.com/playlist/...)
3. Pega la URL y haz clic en "Obtener canciones"
4. Selecciona las canciones que deseas descargar
5. Haz clic en "Descargar seleccionadas"
6. Las canciones se buscarán en YouTube y se descargarán automáticamente

### Descargar desde YouTube

1. Ve a la sección "Importar Música" y selecciona la pestaña "YouTube"
2. Ingresa el nombre de la canción o artista que buscas
3. Haz clic en "Buscar"
4. Selecciona el video correcto de los resultados
5. Haz clic en "Descargar" y la canción se agregará a tu biblioteca

### Cola de Descargas

- Las descargas se procesan en segundo plano
- Puedes ver el progreso en la cola de descargas (esquina inferior derecha)
- Minimiza la cola para seguir usando la aplicación
- Las canciones descargadas aparecerán automáticamente en "Mis Canciones"

### Escuchar en SA-MP

En SA-MP, usa el comando para reproducir audio con tu URL de stream:

```
Tu URL: http://localhost:8000/TuNombreSAMP
```

## 🔌 API Endpoints

### Subir Canción
```
POST /api/<usuario>/upload
Content-Type: multipart/form-data

Body: file (archivo MP3)
```

### Listar Canciones
```
GET /api/<usuario>/canciones

Response:
{
  "canciones": [
    {"nombre": "cancion.mp3", "tamaño": 5242880}
  ],
  "estado": {
    "playing": false,
    "current_song": null,
    "paused": false
  }
}
```

### Eliminar Canción
```
DELETE /api/<usuario>/cancion/<nombre>

Response:
{"success": true}
```

### Reproducir Canción
```
POST /api/<usuario>/play
Content-Type: application/json

Body: {"cancion": "nombre.mp3"}

Response:
{
  "success": true,
  "stream_url": "http://localhost:8000/usuario",
  "estado": {...}
}
```

### Pausar Reproducción
```
POST /api/<usuario>/pause

Response:
{"success": true, "estado": {...}}
```

### Continuar Reproducción
```
POST /api/<usuario>/resume

Response:
{"success": true, "estado": {...}}
```

### Detener Reproducción
```
POST /api/<usuario>/stop

Response:
{"success": true, "estado": {...}}
```

### Importar Playlist de Spotify
```
POST /api/<usuario>/spotify/import
Content-Type: application/json

Body: {"url": "https://open.spotify.com/playlist/..."}

Response:
{
  "success": true,
  "playlist_name": "Mi Playlist",
  "songs": [
    {
      "name": "Nombre de la canción",
      "artist": "Artista",
      "album": "Álbum",
      "duration": "3:45",
      "search_query": "Nombre Artista"
    }
  ]
}
```

### Buscar en YouTube
```
POST /api/<usuario>/youtube/search
Content-Type: application/json

Body: {"query": "nombre de la canción"}

Response:
{
  "success": true,
  "results": [
    {
      "id": "video_id",
      "title": "Título del video",
      "url": "https://www.youtube.com/watch?v=...",
      "duration": "3:45",
      "views": 1000000,
      "thumbnail": "https://..."
    }
  ]
}
```

### Descargar desde YouTube
```
POST /api/<usuario>/youtube/download
Content-Type: application/json

Body: {"url": "https://www.youtube.com/watch?v=..."}

Response:
{
  "success": true,
  "download_id": "usuario_1234567890",
  "message": "Descarga iniciada"
}
```

### Estado de Descarga
```
GET /api/<usuario>/download/status/<download_id>

Response:
{
  "status": "downloading" | "completed" | "error",
  "progress": 75,
  "filename": "nombre.mp3",
  "error": null
}
```

## ⚙️ Configuración

Edita `config.py` para personalizar:

- `MAX_USERS`: Número máximo de usuarios simultáneos (default: 30)
- `MAX_FILE_SIZE`: Tamaño máximo de archivo MP3 (default: 10 MB)
- `ICECAST_HOST`: Host de Icecast (default: localhost)
- `ICECAST_PORT`: Puerto de Icecast (default: 8000)
- `ICECAST_PASSWORD`: Contraseña de Icecast (default: hackme)
- `SPOTIFY_CLIENT_ID`: ID de cliente de Spotify API
- `SPOTIFY_CLIENT_SECRET`: Secret de cliente de Spotify API

## 🔒 Seguridad

### Recomendaciones para Producción:

1. **Cambiar contraseñas por defecto** en `config.py` y `icecast.xml`
2. **Usar HTTPS** con certificados SSL
3. **Implementar autenticación** de usuarios
4. **Limitar tamaño de archivos** según tus recursos
5. **Configurar firewall** adecuadamente
6. **Ejecutar servicios con usuarios no privilegiados**
7. **Las descargas de YouTube son solo para uso personal** - Respeta los derechos de autor

## 🐛 Solución de Problemas

### El servidor Flask no inicia
- Verifica que el puerto 5000 esté disponible
- Revisa los permisos de las carpetas `uploads/` y `playlists/`

### No se pueden descargar videos de YouTube
- Verifica que FFmpeg esté instalado: `ffmpeg -version`
- Instala FFmpeg si es necesario:
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: Descarga desde https://ffmpeg.org/

### Error al importar de Spotify
- Verifica que las credenciales en `config.py` sean correctas
- Asegúrate de que la URL de la playlist sea pública

### Icecast no se conecta
- Verifica que Icecast esté ejecutándose: `sudo systemctl status icecast2`
- Revisa los logs: `tail -f /var/log/icecast2/error.log`
- Confirma que el puerto 8000 esté abierto

### Liquidsoap no funciona
- Revisa los logs: `tail -f /tmp/liquidsoap.log`
- Verifica la sintaxis del script: `liquidsoap --check liquidsoap/radio.liq`

### No se pueden subir archivos
- Verifica permisos de la carpeta `uploads/`: `chmod 755 uploads/`
- Confirma el tamaño máximo en `config.py`

## 📄 Licencia

Este proyecto es de código abierto. Siéntete libre de usarlo y modificarlo.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o sugerencias, abre un issue en GitHub.

## 🙏 Agradecimientos

- **SA-MP Community** - Por la inspiración
- **Liquidsoap** - Por el excelente servidor de streaming
- **Icecast** - Por la distribución de streams
- **Flask** - Por el framework web simple y potente

---

**¡Disfruta de tu música en SA-MP!** 🎮🎵
