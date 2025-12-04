// Cliente JavaScript para SA-MP Radio Stream

// Estado global
let currentState = {
    playing: false,
    current_song: null,
    paused: false
};

// Elementos del DOM
let uploadForm, fileInput, uploadStatus;
let songList, refreshBtn;
let pauseBtn, resumeBtn, stopBtn;
let currentSongDiv, streamInfo;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Obtener elementos
    uploadForm = document.getElementById('uploadForm');
    fileInput = document.getElementById('fileInput');
    uploadStatus = document.getElementById('uploadStatus');
    songList = document.getElementById('songList');
    refreshBtn = document.getElementById('refreshBtn');
    pauseBtn = document.getElementById('pauseBtn');
    resumeBtn = document.getElementById('resumeBtn');
    stopBtn = document.getElementById('stopBtn');
    currentSongDiv = document.getElementById('currentSong');
    streamInfo = document.getElementById('streamInfo');

    // Event listeners
    uploadForm.addEventListener('submit', handleUpload);
    refreshBtn.addEventListener('click', loadSongs);
    pauseBtn.addEventListener('click', pauseSong);
    resumeBtn.addEventListener('click', resumeSong);
    stopBtn.addEventListener('click', stopSong);

    // Cargar canciones al inicio
    loadSongs();

    // Auto-refresh cada 5 segundos
    setInterval(loadSongs, 5000);
});

// Mostrar mensaje de estado
function showStatus(message, isError = false) {
    uploadStatus.innerHTML = message;
    uploadStatus.className = 'status-message show ' + (isError ? 'error' : 'success');
    
    setTimeout(() => {
        uploadStatus.classList.remove('show');
    }, 5000);
}

// Manejar subida de archivo
async function handleUpload(e) {
    e.preventDefault();
    
    const file = fileInput.files[0];
    if (!file) {
        showStatus('Por favor selecciona un archivo', true);
        return;
    }

    if (!file.name.endsWith('.mp3')) {
        showStatus('Solo se permiten archivos MP3', true);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/${USUARIO}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`<i class="fas fa-check-circle"></i> ${data.filename} subido correctamente`);
            fileInput.value = '';
            loadSongs();
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

// Cargar lista de canciones
async function loadSongs() {
    try {
        const response = await fetch(`/api/${USUARIO}/canciones`);
        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            displaySongs(data.canciones);
            updatePlayerState();
        } else {
            songList.innerHTML = '<p class="error">Error al cargar canciones</p>';
        }
    } catch (error) {
        songList.innerHTML = '<p class="error">Error de conexión</p>';
    }
}

// Mostrar canciones en la lista
function displaySongs(canciones) {
    if (canciones.length === 0) {
        songList.innerHTML = '<p class="loading">No hay canciones. ¡Sube tu primera canción!</p>';
        return;
    }

    songList.innerHTML = '';

    canciones.forEach(cancion => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';

        const songInfo = document.createElement('div');
        songInfo.className = 'song-info';

        const songName = document.createElement('div');
        songName.className = 'song-name';
        songName.innerHTML = `<i class="fas fa-music"></i> ${cancion.nombre}`;

        const songSize = document.createElement('div');
        songSize.className = 'song-size';
        songSize.textContent = formatFileSize(cancion.tamaño);

        songInfo.appendChild(songName);
        songInfo.appendChild(songSize);

        const songActions = document.createElement('div');
        songActions.className = 'song-actions';

        const playBtn = document.createElement('button');
        playBtn.className = 'btn btn-success btn-small';
        playBtn.innerHTML = '<i class="fas fa-play"></i> Reproducir';
        playBtn.onclick = () => playSong(cancion.nombre);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-small';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
        deleteBtn.onclick = () => deleteSong(cancion.nombre);

        songActions.appendChild(playBtn);
        songActions.appendChild(deleteBtn);

        songItem.appendChild(songInfo);
        songItem.appendChild(songActions);

        songList.appendChild(songItem);
    });
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Reproducir canción
async function playSong(nombre) {
    try {
        const response = await fetch(`/api/${USUARIO}/play`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cancion: nombre })
        });

        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            updatePlayerState();
            showStatus(`<i class="fas fa-music"></i> Reproduciendo: ${nombre}`);
            
            if (data.stream_url) {
                streamInfo.innerHTML = `
                    <strong>Stream activo:</strong><br>
                    <code>${data.stream_url}</code>
                `;
            }
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

// Pausar canción
async function pauseSong() {
    try {
        const response = await fetch(`/api/${USUARIO}/pause`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            updatePlayerState();
            showStatus('<i class="fas fa-pause"></i> Reproducción pausada');
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

// Continuar canción
async function resumeSong() {
    try {
        const response = await fetch(`/api/${USUARIO}/resume`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            updatePlayerState();
            showStatus('<i class="fas fa-play"></i> Reproducción continuada');
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

// Detener canción
async function stopSong() {
    try {
        const response = await fetch(`/api/${USUARIO}/stop`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            updatePlayerState();
            showStatus('<i class="fas fa-stop"></i> Reproducción detenida');
            streamInfo.innerHTML = '';
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

// Eliminar canción
async function deleteSong(nombre) {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${nombre}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/${USUARIO}/cancion/${encodeURIComponent(nombre)}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`<i class="fas fa-trash"></i> ${nombre} eliminado`);
            loadSongs();
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

// Actualizar estado del reproductor
function updatePlayerState() {
    if (currentState.playing) {
        currentSongDiv.innerHTML = `
            <p><i class="fas fa-music"></i> <strong>${currentState.current_song}</strong></p>
            <p style="font-size: 0.9em; color: var(--text-muted);">
                Estado: ${currentState.paused ? '<i class="fas fa-pause"></i> Pausado' : '<i class="fas fa-play"></i> Reproduciendo'}
            </p>
        `;
        currentSongDiv.className = 'current-song ' + (currentState.paused ? 'paused' : 'playing');
        
        pauseBtn.disabled = currentState.paused;
        resumeBtn.disabled = !currentState.paused;
        stopBtn.disabled = false;
    } else {
        currentSongDiv.innerHTML = '<p>No hay canción seleccionada</p>';
        currentSongDiv.className = 'current-song';
        
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        stopBtn.disabled = true;
    }
}
