// Cliente JavaScript para SA-MP Radio Stream

// ========================================
// ESTADO GLOBAL
// ========================================
let currentState = {
    playing: false,
    current_song: null,
    paused: false
};

let allSongs = [];
let currentPlaylists = [];
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationId = null;

// ========================================
// ELEMENTOS DEL DOM
// ========================================
let uploadForm, fileInput, uploadStatus, uploadProgress;
let dropZone;
let songList, refreshBtn, searchInput, clearSearchBtn, noResultsDiv;
let pauseBtn, resumeBtn, stopBtn;
let currentSongDiv, streamInfo;
let volumeSlider, volumeBtn, volumeValue;
let audioVisualizer, visualizerCanvas, visualizerCtx;
let playlistsList, createPlaylistBtn;
let createPlaylistModal, playlistDetailsModal;

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeEventListeners();
    initializeAudioVisualizer();
    initializeVolumeControl();
    initializeDragAndDrop();
    initializeSearch();
    
    // Cargar datos iniciales
    loadSongs();
    loadPlaylists();

    // Auto-refresh cada 5 segundos
    setInterval(loadSongs, 5000);
    setInterval(loadPlaylists, 10000);
});

// ========================================
// INICIALIZACIÓN DE ELEMENTOS
// ========================================
function initializeElements() {
    // Upload elements
    uploadForm = document.getElementById('uploadForm');
    fileInput = document.getElementById('fileInput');
    uploadStatus = document.getElementById('uploadStatus');
    uploadProgress = document.getElementById('uploadProgress');
    dropZone = document.getElementById('dropZone');
    
    // Song list elements
    songList = document.getElementById('songList');
    refreshBtn = document.getElementById('refreshBtn');
    searchInput = document.getElementById('searchInput');
    clearSearchBtn = document.getElementById('clearSearch');
    noResultsDiv = document.getElementById('noResults');
    
    // Player controls
    pauseBtn = document.getElementById('pauseBtn');
    resumeBtn = document.getElementById('resumeBtn');
    stopBtn = document.getElementById('stopBtn');
    currentSongDiv = document.getElementById('currentSong');
    streamInfo = document.getElementById('streamInfo');
    
    // Volume control
    volumeSlider = document.getElementById('volumeSlider');
    volumeBtn = document.getElementById('volumeBtn');
    volumeValue = document.getElementById('volumeValue');
    
    // Audio visualizer
    audioVisualizer = document.getElementById('audioVisualizer');
    if (audioVisualizer) {
        visualizerCtx = audioVisualizer.getContext('2d');
    }
    
    // Playlists
    playlistsList = document.getElementById('playlistsList');
    createPlaylistBtn = document.getElementById('createPlaylistBtn');
    createPlaylistModal = document.getElementById('createPlaylistModal');
    playlistDetailsModal = document.getElementById('playlistDetailsModal');
}

// ========================================
// INICIALIZACIÓN DE EVENT LISTENERS
// ========================================
function initializeEventListeners() {
    // Upload
    uploadForm.addEventListener('submit', handleUpload);
    
    // Song list
    refreshBtn.addEventListener('click', () => {
        loadSongs();
        loadPlaylists();
    });
    
    // Player controls
    pauseBtn.addEventListener('click', pauseSong);
    resumeBtn.addEventListener('click', resumeSong);
    stopBtn.addEventListener('click', stopSong);
    
    // Playlists
    createPlaylistBtn.addEventListener('click', openCreatePlaylistModal);
    document.getElementById('closePlaylistModal').addEventListener('click', closeCreatePlaylistModal);
    document.getElementById('cancelPlaylistBtn').addEventListener('click', closeCreatePlaylistModal);
    document.getElementById('createPlaylistForm').addEventListener('submit', handleCreatePlaylist);
    document.getElementById('closePlaylistDetailsModal').addEventListener('click', closePlaylistDetailsModal);
    
    // Close modals on outside click
    createPlaylistModal.addEventListener('click', (e) => {
        if (e.target === createPlaylistModal) closeCreatePlaylistModal();
    });
    playlistDetailsModal.addEventListener('click', (e) => {
        if (e.target === playlistDetailsModal) closePlaylistDetailsModal();
    });
}

// ========================================
// AUDIO VISUALIZER
// ========================================
function initializeAudioVisualizer() {
    if (!audioVisualizer) return;
    
    // Resize canvas to fit container
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Draw static bars when not playing
    drawStaticVisualizer();
}

function resizeCanvas() {
    if (!audioVisualizer) return;
    const rect = audioVisualizer.parentElement.getBoundingClientRect();
    audioVisualizer.width = rect.width - 40;
    audioVisualizer.height = 120;
}

function drawStaticVisualizer() {
    if (!visualizerCtx) return;
    
    const width = audioVisualizer.width;
    const height = audioVisualizer.height;
    const barCount = 64;
    const barWidth = width / barCount;
    
    visualizerCtx.clearRect(0, 0, width, height);
    
    for (let i = 0; i < barCount; i++) {
        const x = i * barWidth;
        const barHeight = 20 + Math.random() * 15;
        
        // Gradient
        const gradient = visualizerCtx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#1DB954');
        gradient.addColorStop(1, '#1DB954CC');
        
        visualizerCtx.fillStyle = gradient;
        visualizerCtx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
    }
}

function startVisualizer() {
    if (animationId) return; // Already running
    
    // Create Web Audio API context if needed
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 128;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        } catch (e) {
            console.error('Web Audio API not supported', e);
            return;
        }
    }
    
    animateVisualizer();
}

function animateVisualizer() {
    if (!visualizerCtx || !analyser) return;
    
    animationId = requestAnimationFrame(animateVisualizer);
    
    analyser.getByteFrequencyData(dataArray);
    
    const width = audioVisualizer.width;
    const height = audioVisualizer.height;
    const barCount = dataArray.length;
    const barWidth = width / barCount;
    
    visualizerCtx.clearRect(0, 0, width, height);
    
    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i];
        const barHeight = (value / 255) * height * 0.8;
        const x = i * barWidth;
        
        // Gradient effect
        const gradient = visualizerCtx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#1DB954');
        gradient.addColorStop(1, '#1DB954CC');
        
        visualizerCtx.fillStyle = gradient;
        visualizerCtx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
    }
}

function stopVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    drawStaticVisualizer();
}

// ========================================
// VOLUME CONTROL
// ========================================
function initializeVolumeControl() {
    // Load saved volume from localStorage
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume !== null) {
        const volume = parseInt(savedVolume);
        volumeSlider.value = volume;
        updateVolumeDisplay(volume);
    }
    
    // Volume slider
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        updateVolumeDisplay(volume);
        localStorage.setItem('volume', volume);
    });
    
    // Volume button - toggle mute
    volumeBtn.addEventListener('click', toggleMute);
}

function updateVolumeDisplay(volume) {
    volumeValue.textContent = volume + '%';
    
    // Update icon
    const icon = volumeBtn.querySelector('i');
    if (volume === 0) {
        icon.className = 'fas fa-volume-xmark';
    } else if (volume < 50) {
        icon.className = 'fas fa-volume-low';
    } else {
        icon.className = 'fas fa-volume-high';
    }
}

function toggleMute() {
    const currentVolume = parseInt(volumeSlider.value);
    
    if (currentVolume > 0) {
        // Mute
        localStorage.setItem('volumeBeforeMute', currentVolume);
        volumeSlider.value = 0;
        updateVolumeDisplay(0);
        localStorage.setItem('volume', 0);
    } else {
        // Unmute
        const previousVolume = parseInt(localStorage.getItem('volumeBeforeMute') || 100);
        volumeSlider.value = previousVolume;
        updateVolumeDisplay(previousVolume);
        localStorage.setItem('volume', previousVolume);
    }
}

// ========================================
// DRAG & DROP
// ========================================
function initializeDragAndDrop() {
    // Click to select files
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const mp3Files = files.filter(file => file.name.toLowerCase().endsWith('.mp3'));
        
        if (mp3Files.length === 0) {
            showStatus('Solo se permiten archivos MP3', true);
            return;
        }
        
        uploadMultipleFiles(mp3Files);
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            uploadMultipleFiles(files);
        }
    });
}

// ========================================
// SEARCH
// ========================================
function initializeSearch() {
    // Real-time search
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (query) {
            clearSearchBtn.style.display = 'block';
            filterSongs(query);
        } else {
            clearSearchBtn.style.display = 'none';
            displaySongs(allSongs);
        }
    });
    
    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        displaySongs(allSongs);
        searchInput.focus();
    });
    
    // Ctrl+F shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

function filterSongs(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = allSongs.filter(song => 
        song.nombre.toLowerCase().includes(lowerQuery)
    );
    
    if (filtered.length === 0) {
        songList.style.display = 'none';
        noResultsDiv.style.display = 'block';
    } else {
        songList.style.display = 'block';
        noResultsDiv.style.display = 'none';
        displaySongs(filtered, query);
    }
}

function highlightText(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function showStatus(message, isError = false) {
    uploadStatus.innerHTML = message;
    uploadStatus.className = 'status-message show ' + (isError ? 'error' : 'success');
    
    setTimeout(() => {
        uploadStatus.classList.remove('show');
    }, 5000);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ========================================
// FILE UPLOAD
// ========================================
async function handleUpload(e) {
    e.preventDefault();
    
    const files = Array.from(fileInput.files);
    if (files.length === 0) {
        showStatus('Por favor selecciona archivos', true);
        return;
    }
    
    uploadMultipleFiles(files);
}

async function uploadMultipleFiles(files) {
    uploadProgress.innerHTML = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.name.toLowerCase().endsWith('.mp3')) {
            showStatus(`${file.name} no es un archivo MP3`, true);
            continue;
        }
        
        await uploadSingleFile(file, i);
    }
    
    // Clear file input
    fileInput.value = '';
    
    // Reload songs
    setTimeout(loadSongs, 500);
}

async function uploadSingleFile(file, index) {
    const progressId = `upload-${index}-${Date.now()}`;
    
    // Create progress element
    const progressItem = document.createElement('div');
    progressItem.className = 'upload-progress-item';
    progressItem.id = progressId;
    progressItem.innerHTML = `
        <div class="upload-progress-name">${file.name}</div>
        <div class="upload-progress-bar">
            <div class="upload-progress-fill" style="width: 0%"></div>
        </div>
        <div class="upload-progress-text">Subiendo...</div>
    `;
    uploadProgress.appendChild(progressItem);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`/api/${USUARIO}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        const progressFill = progressItem.querySelector('.upload-progress-fill');
        const progressText = progressItem.querySelector('.upload-progress-text');
        
        if (response.ok) {
            progressFill.style.width = '100%';
            progressText.textContent = 'Completado';
            progressText.style.color = 'var(--spotify-green)';
            
            setTimeout(() => {
                progressItem.remove();
            }, 2000);
        } else {
            progressFill.style.width = '100%';
            progressFill.style.background = '#ef5350';
            progressText.textContent = `Error: ${data.error}`;
            progressText.style.color = '#ef5350';
        }
    } catch (error) {
        const progressText = progressItem.querySelector('.upload-progress-text');
        progressText.textContent = `Error: ${error.message}`;
        progressText.style.color = '#ef5350';
    }
}

// ========================================
// SONG LIST
// ========================================
async function loadSongs() {
    try {
        const response = await fetch(`/api/${USUARIO}/canciones`);
        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            allSongs = data.canciones;
            
            // Apply current search filter if any
            const query = searchInput.value.trim();
            if (query) {
                filterSongs(query);
            } else {
                displaySongs(allSongs);
            }
            
            updatePlayerState();
        } else {
            songList.innerHTML = '<p class="error">Error al cargar canciones</p>';
        }
    } catch (error) {
        songList.innerHTML = '<p class="error">Error de conexión</p>';
    }
}

function displaySongs(canciones, searchQuery = '') {
    if (canciones.length === 0 && !searchQuery) {
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
        const highlightedName = searchQuery ? highlightText(cancion.nombre, searchQuery) : cancion.nombre;
        songName.innerHTML = `<i class="fas fa-music"></i> ${highlightedName}`;

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

        const addToPlaylistMenu = document.createElement('div');
        addToPlaylistMenu.className = 'add-to-playlist-menu';
        
        const addToPlaylistBtn = document.createElement('button');
        addToPlaylistBtn.className = 'btn btn-small add-to-playlist-btn';
        addToPlaylistBtn.innerHTML = '<i class="fas fa-plus"></i> Playlist';
        addToPlaylistBtn.onclick = (e) => {
            e.stopPropagation();
            togglePlaylistDropdown(addToPlaylistMenu, cancion.nombre);
        };
        
        const playlistDropdown = document.createElement('div');
        playlistDropdown.className = 'playlist-dropdown';
        
        addToPlaylistMenu.appendChild(addToPlaylistBtn);
        addToPlaylistMenu.appendChild(playlistDropdown);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-small';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
        deleteBtn.onclick = () => deleteSong(cancion.nombre);

        songActions.appendChild(playBtn);
        songActions.appendChild(addToPlaylistMenu);
        songActions.appendChild(deleteBtn);

        songItem.appendChild(songInfo);
        songItem.appendChild(songActions);

        songList.appendChild(songItem);
    });
}

function togglePlaylistDropdown(menuElement, songName) {
    const dropdown = menuElement.querySelector('.playlist-dropdown');
    
    // Close all other dropdowns
    document.querySelectorAll('.playlist-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
    });
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        return;
    }
    
    // Populate dropdown
    dropdown.innerHTML = '';
    
    if (currentPlaylists.length === 0) {
        dropdown.innerHTML = '<div class="playlist-dropdown-item" style="color: var(--text-muted); cursor: default;">No hay playlists</div>';
    } else {
        currentPlaylists.forEach(playlist => {
            const item = document.createElement('div');
            item.className = 'playlist-dropdown-item';
            item.innerHTML = `<i class="fas fa-list"></i> ${playlist.name}`;
            item.onclick = () => addSongToPlaylist(playlist.id, songName, dropdown);
            dropdown.appendChild(item);
        });
    }
    
    dropdown.classList.add('show');
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!menuElement.contains(e.target)) {
                dropdown.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

// ========================================
// PLAYER CONTROLS
// ========================================
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
            startVisualizer();
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

async function pauseSong() {
    try {
        const response = await fetch(`/api/${USUARIO}/pause`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            updatePlayerState();
            stopVisualizer();
            showStatus('<i class="fas fa-pause"></i> Reproducción pausada');
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

async function resumeSong() {
    try {
        const response = await fetch(`/api/${USUARIO}/resume`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            updatePlayerState();
            startVisualizer();
            showStatus('<i class="fas fa-play"></i> Reproducción continuada');
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

async function stopSong() {
    try {
        const response = await fetch(`/api/${USUARIO}/stop`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            currentState = data.estado;
            updatePlayerState();
            stopVisualizer();
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
        
        if (!currentState.paused) {
            startVisualizer();
        } else {
            stopVisualizer();
        }
    } else {
        currentSongDiv.innerHTML = '<p>No hay canción seleccionada</p>';
        currentSongDiv.className = 'current-song';
        
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        stopBtn.disabled = true;
        stopVisualizer();
    }
}

// ========================================
// PLAYLIST MANAGEMENT
// ========================================
async function loadPlaylists() {
    try {
        const response = await fetch(`/api/${USUARIO}/playlists`);
        const data = await response.json();

        if (response.ok) {
            currentPlaylists = data.playlists;
            displayPlaylists(data.playlists);
        } else {
            playlistsList.innerHTML = '<p class="error">Error al cargar playlists</p>';
        }
    } catch (error) {
        playlistsList.innerHTML = '<p class="error">Error de conexión</p>';
    }
}

function displayPlaylists(playlists) {
    if (playlists.length === 0) {
        playlistsList.innerHTML = '<p class="loading">No hay playlists. ¡Crea tu primera playlist!</p>';
        return;
    }

    playlistsList.innerHTML = '';

    playlists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';

        playlistItem.innerHTML = `
            <div class="playlist-item-header">
                <div class="playlist-item-name">${playlist.name}</div>
                <div class="playlist-item-actions">
                    <button class="view-playlist-btn" title="Ver playlist">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="delete-playlist-btn" title="Eliminar playlist">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="playlist-item-info">
                <i class="fas fa-music"></i> ${playlist.song_count} canción${playlist.song_count !== 1 ? 'es' : ''}
            </div>
        `;

        // View playlist
        playlistItem.querySelector('.view-playlist-btn').onclick = (e) => {
            e.stopPropagation();
            viewPlaylist(playlist.id);
        };

        // Delete playlist
        playlistItem.querySelector('.delete-playlist-btn').onclick = (e) => {
            e.stopPropagation();
            deletePlaylistConfirm(playlist.id, playlist.name);
        };

        // Click on item to view
        playlistItem.onclick = () => viewPlaylist(playlist.id);

        playlistsList.appendChild(playlistItem);
    });
}

function openCreatePlaylistModal() {
    createPlaylistModal.classList.add('show');
    document.getElementById('playlistName').focus();
}

function closeCreatePlaylistModal() {
    createPlaylistModal.classList.remove('show');
    document.getElementById('playlistName').value = '';
}

async function handleCreatePlaylist(e) {
    e.preventDefault();
    
    const name = document.getElementById('playlistName').value.trim();
    
    if (!name) {
        showStatus('El nombre de la playlist no puede estar vacío', true);
        return;
    }
    
    try {
        const response = await fetch(`/api/${USUARIO}/playlists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`<i class="fas fa-check-circle"></i> Playlist "${name}" creada`);
            closeCreatePlaylistModal();
            loadPlaylists();
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

async function viewPlaylist(playlistId) {
    try {
        const response = await fetch(`/api/${USUARIO}/playlists/${playlistId}`);
        const data = await response.json();

        if (response.ok) {
            displayPlaylistDetails(data);
            playlistDetailsModal.classList.add('show');
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error al cargar playlist`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

function displayPlaylistDetails(playlist) {
    document.getElementById('playlistDetailsTitle').innerHTML = 
        `<i class="fas fa-list"></i> ${playlist.name}`;
    
    const songsList = document.getElementById('playlistSongsList');
    
    if (playlist.songs.length === 0) {
        songsList.innerHTML = '<p class="loading">Esta playlist está vacía</p>';
        return;
    }
    
    songsList.innerHTML = '';
    
    playlist.songs.forEach(song => {
        const songItem = document.createElement('div');
        songItem.className = 'playlist-song-item';
        
        songItem.innerHTML = `
            <div class="playlist-song-name">
                <i class="fas fa-music"></i> ${song.song_name}
            </div>
            <div class="playlist-song-actions">
                <button class="remove-from-playlist-btn" title="Quitar de playlist">
                    <i class="fas fa-times"></i> Quitar
                </button>
            </div>
        `;
        
        songItem.querySelector('.remove-from-playlist-btn').onclick = () => {
            removeSongFromPlaylist(playlist.id, song.song_name);
        };
        
        songsList.appendChild(songItem);
    });
}

function closePlaylistDetailsModal() {
    playlistDetailsModal.classList.remove('show');
}

async function addSongToPlaylist(playlistId, songName, dropdown) {
    try {
        const response = await fetch(`/api/${USUARIO}/playlists/${playlistId}/songs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ song_name: songName })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`<i class="fas fa-check-circle"></i> Canción agregada a la playlist`);
            dropdown.classList.remove('show');
            loadPlaylists();
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

async function removeSongFromPlaylist(playlistId, songName) {
    try {
        const response = await fetch(`/api/${USUARIO}/playlists/${playlistId}/songs`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ song_name: songName })
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`<i class="fas fa-check-circle"></i> Canción eliminada de la playlist`);
            viewPlaylist(playlistId); // Refresh the playlist view
            loadPlaylists(); // Update playlist counts
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}

async function deletePlaylistConfirm(playlistId, playlistName) {
    if (!confirm(`¿Estás seguro de que quieres eliminar la playlist "${playlistName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/${USUARIO}/playlists/${playlistId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`<i class="fas fa-trash"></i> Playlist "${playlistName}" eliminada`);
            loadPlaylists();
        } else {
            showStatus(`<i class="fas fa-exclamation-circle"></i> Error: ${data.error}`, true);
        }
    } catch (error) {
        showStatus(`<i class="fas fa-exclamation-circle"></i> Error de conexión: ${error.message}`, true);
    }
}
