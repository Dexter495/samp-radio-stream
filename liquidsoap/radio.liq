#!/usr/bin/liquidsoap

# Script de Liquidsoap para SA-MP Radio Stream
# Este script gestiona múltiples streams de usuarios

# Configuración
set("log.file.path", "/tmp/liquidsoap.log")
set("server.telnet", true)
set("server.telnet.bind_addr", "0.0.0.0")
set("server.telnet.port", 1234)

# Directorio de playlists
playlists_dir = "/home/runner/work/samp-radio-stream/samp-radio-stream/playlists"

# Función para crear un stream de usuario
def create_user_stream(username) =
  # Ruta del archivo de playlist del usuario
  playlist_file = "#{playlists_dir}/#{username}.m3u"
  
  # Crear fuente de playlist con reload automático
  source = playlist(
    mode="normal",
    reload_mode="watch",
    playlist_file
  )
  
  # Añadir silencio si no hay canciones
  source = mksafe(source)
  
  # Normalizar volumen
  source = normalize(source)
  
  # Información del stream
  source = map_metadata(
    fun (_) -> [("title", "#{username}'s Radio")],
    source
  )
  
  # Enviar a Icecast
  output.icecast(
    %mp3(bitrate=128),
    host="localhost",
    port=8000,
    password="hackme",
    mount="/#{username}",
    name="#{username}'s Radio Stream",
    description="SA-MP Radio Stream for #{username}",
    genre="Various",
    url="http://localhost:5000/#{username}",
    source
  )
end

# Nota: En producción, deberías crear streams dinámicamente
# basándose en los usuarios activos. Este es un ejemplo básico.

# Stream de ejemplo (se debe expandir para múltiples usuarios)
# Para uso real, necesitarías un script que genere esto dinámicamente
# o usar el protocolo telnet de Liquidsoap para gestionar streams

# Fallback: Stream silencioso por defecto
silence = blank()
output.icecast(
  %mp3(bitrate=128),
  host="localhost",
  port=8000,
  password="hackme",
  mount="/default",
  name="SA-MP Radio - Default",
  description="Default stream",
  silence
)

# El script debe ser extendido para gestionar múltiples usuarios dinámicamente
# usando el servidor telnet de Liquidsoap o generando este archivo dinámicamente
