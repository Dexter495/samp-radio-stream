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

// ========================================
// FUNCIONES DE IMPORTACIÓN (SPOTIFY & YOUTUBE)
// ========================================

// Estado de la cola de descargas
let downloadQueue = [];
let activeDownloads = 0;
let spotifySongsData = [];

// Elementos del DOM para importar
let spotifyImportBtn, spotifyPlaylistUrl, youtubeSearchBtn, youtubeSearchInput;
let importTabs, importTabContents;
let importStatus;
let spotifySongsModal, youtubeResultsModal, downloadQueueElement;

// Inicializar elementos de importación
function initializeImportElements() {
    // Tabs
    importTabs = document.querySelectorAll('.import-tab');
    importTabContents = document.querySelectorAll('.import-tab-content');
    
    // Spotify
    spotifyImportBtn = document.getElementById('spotifyImportBtn');
    spotifyPlaylistUrl = document.getElementById('spotifyPlaylistUrl');
    
    // YouTube
    youtubeSearchBtn = document.getElementById('youtubeSearchBtn');
    youtubeSearchInput = document.getElementById('youtubeSearchInput');
    
    // Status
    importStatus = document.getElementById('importStatus');
    
    // Modals
    spotifySongsModal = document.getElementById('spotifySongsModal');
    youtubeResultsModal = document.getElementById('youtubeResultsModal');
    downloadQueueElement = document.getElementById('downloadQueue');
    
    // Event listeners
    if (importTabs) {
        importTabs.forEach(tab => {
            tab.addEventListener('click', () => switchImportTab(tab.dataset.tab));
        });
    }
    
    if (spotifyImportBtn) {
        spotifyImportBtn.addEventListener('click', importSpotifyPlaylist);
    }
    
    if (youtubeSearchBtn) {
        youtubeSearchBtn.addEventListener('click', searchYouTube);
    }
    
    if (youtubeSearchInput) {
        youtubeSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchYouTube();
            }
        });
    }
    
    // Modal close buttons
    const closeSpotifySongsBtn = document.getElementById('closeSpotifySongsModal');
    if (closeSpotifySongsBtn) {
        closeSpotifySongsBtn.addEventListener('click', () => closeModal(spotifySongsModal));
    }
    
    const closeYoutubeResultsBtn = document.getElementById('closeYoutubeResultsModal');
    if (closeYoutubeResultsBtn) {
        closeYoutubeResultsBtn.addEventListener('click', () => closeModal(youtubeResultsModal));
    }
    
    // Select all/deselect all buttons
    const selectAllBtn = document.getElementById('selectAllSpotifySongs');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => toggleAllSpotifySongs(true));
    }
    
    const deselectAllBtn = document.getElementById('deselectAllSpotifySongs');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => toggleAllSpotifySongs(false));
    }
    
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
    if (downloadSelectedBtn) {
        downloadSelectedBtn.addEventListener('click', downloadSelectedSpotifySongs);
    }
    
    // Download queue actions
    const minimizeQueueBtn = document.getElementById('minimizeQueue');
    if (minimizeQueueBtn) {
        minimizeQueueBtn.addEventListener('click', toggleQueueMinimize);
    }
    
    const closeQueueBtn = document.getElementById('closeQueue');
    if (closeQueueBtn) {
        closeQueueBtn.addEventListener('click', () => {
            downloadQueueElement.style.display = 'none';
        });
    }
}

// Llamar a initializeImportElements cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeImportElements);
} else {
    initializeImportElements();
}

// Cambiar tab de importación
function switchImportTab(tabName) {
    importTabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    importTabContents.forEach(content => {
        if (content.id === `${tabName}-content`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Mostrar mensaje de estado de importación
function showImportStatus(message, type = 'info') {
    importStatus.textContent = message;
    importStatus.className = `import-status ${type}`;
    importStatus.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            importStatus.style.display = 'none';
        }, 5000);
    }
}

// Importar playlist de Spotify
async function importSpotifyPlaylist() {
    const url = spotifyPlaylistUrl.value.trim();
    
    if (!url) {
        showImportStatus('Por favor, ingresa una URL de playlist de Spotify', 'error');
        return;
    }
    
    if (!url.includes('spotify.com/playlist/')) {
        showImportStatus('URL de playlist inválida', 'error');
        return;
    }
    
    spotifyImportBtn.disabled = true;
    showImportStatus('Obteniendo canciones de Spotify...', 'info');
    
    try {
        const response = await fetch(`/api/${USUARIO}/spotify/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            spotifySongsData = data.songs;
            showSpotifySongsModal(data.playlist_name, data.songs);
            showImportStatus(`${data.songs.length} canciones encontradas`, 'success');
        } else {
            showImportStatus(data.error || 'Error al importar playlist', 'error');
        }
    } catch (error) {
        showImportStatus(`Error de conexión: ${error.message}`, 'error');
    } finally {
        spotifyImportBtn.disabled = false;
    }
}

// Mostrar modal de canciones de Spotify
function showSpotifySongsModal(playlistName, songs) {
    const playlistNameEl = document.getElementById('spotifyPlaylistName');
    const songsList = document.getElementById('spotifySongsList');
    
    playlistNameEl.textContent = playlistName;
    
    songsList.innerHTML = songs.map((song, index) => `
        <div class="spotify-song-item" onclick="toggleSpotifySongSelection(${index})">
            <input type="checkbox" class="spotify-song-checkbox" data-index="${index}" onclick="event.stopPropagation();">
            <div class="spotify-song-info">
                <div class="spotify-song-name">${escapeHtml(song.name)}</div>
                <div class="spotify-song-artist">${escapeHtml(song.artist)}</div>
                <div class="spotify-song-details">
                    <span><i class="fas fa-compact-disc"></i> ${escapeHtml(song.album)}</span>
                    <span><i class="fas fa-clock"></i> ${song.duration}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    openModal(spotifySongsModal);
}

// Toggle selección de canción de Spotify
function toggleSpotifySongSelection(index) {
    const checkbox = document.querySelector(`.spotify-song-checkbox[data-index="${index}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        updateSpotifySongItemStyle(index);
    }
}

// Actualizar estilo de item de canción
function updateSpotifySongItemStyle(index) {
    const checkbox = document.querySelector(`.spotify-song-checkbox[data-index="${index}"]`);
    const item = checkbox.closest('.spotify-song-item');
    
    if (checkbox.checked) {
        item.classList.add('selected');
    } else {
        item.classList.remove('selected');
    }
}

// Seleccionar/Deseleccionar todas las canciones de Spotify
function toggleAllSpotifySongs(select) {
    const checkboxes = document.querySelectorAll('.spotify-song-checkbox');
    checkboxes.forEach((checkbox, index) => {
        checkbox.checked = select;
        updateSpotifySongItemStyle(index);
    });
}

// Descargar canciones seleccionadas de Spotify
async function downloadSelectedSpotifySongs() {
    const checkboxes = document.querySelectorAll('.spotify-song-checkbox:checked');
    
    if (checkboxes.length === 0) {
        showImportStatus('Por favor, selecciona al menos una canción', 'error');
        return;
    }
    
    closeModal(spotifySongsModal);
    showImportStatus(`Buscando ${checkboxes.length} canciones en YouTube...`, 'info');
    
    for (const checkbox of checkboxes) {
        const index = parseInt(checkbox.dataset.index);
        const song = spotifySongsData[index];
        
        // Buscar en YouTube y agregar a la cola
        await searchAndDownloadSong(song);
    }
    
    showImportStatus('Canciones agregadas a la cola de descargas', 'success');
}

// Buscar y descargar canción automáticamente
async function searchAndDownloadSong(song) {
    try {
        const response = await fetch(`/api/${USUARIO}/youtube/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: song.search_query })
        });
        
        const data = await response.json();
        
        if (response.ok && data.results.length > 0) {
            // Tomar el primer resultado
            const video = data.results[0];
            addToDownloadQueue(song.name, video.url);
        }
    } catch (error) {
        console.error('Error searching song:', error);
    }
}

// Buscar en YouTube
async function searchYouTube() {
    const query = youtubeSearchInput.value.trim();
    
    if (!query) {
        showImportStatus('Por favor, ingresa un término de búsqueda', 'error');
        return;
    }
    
    youtubeSearchBtn.disabled = true;
    showImportStatus('Buscando en YouTube...', 'info');
    
    try {
        const response = await fetch(`/api/${USUARIO}/youtube/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showYoutubeResultsModal(data.results);
            showImportStatus(`${data.results.length} resultados encontrados`, 'success');
        } else {
            showImportStatus(data.error || 'Error al buscar en YouTube', 'error');
        }
    } catch (error) {
        showImportStatus(`Error de conexión: ${error.message}`, 'error');
    } finally {
        youtubeSearchBtn.disabled = false;
    }
}

// Mostrar modal de resultados de YouTube
function showYoutubeResultsModal(results) {
    const resultsList = document.getElementById('youtubeResultsList');
    
    resultsList.innerHTML = results.map(video => `
        <div class="youtube-result-item">
            <img src="${video.thumbnail || 'https://via.placeholder.com/120x90?text=No+Image'}" 
                 alt="${escapeHtml(video.title)}" 
                 class="youtube-thumbnail">
            <div class="youtube-info">
                <div class="youtube-title">${escapeHtml(video.title)}</div>
                <div class="youtube-meta">
                    <span><i class="fas fa-clock"></i> ${video.duration}</span>
                    <span><i class="fas fa-eye"></i> ${formatViews(video.views)} vistas</span>
                </div>
                <button class="youtube-download-btn" onclick="downloadFromYouTube('${escapeHtml(video.url)}', '${escapeHtml(video.title)}')">
                    <i class="fas fa-download"></i> Descargar
                </button>
            </div>
        </div>
    `).join('');
    
    openModal(youtubeResultsModal);
}

// Descargar desde YouTube
function downloadFromYouTube(url, title) {
    closeModal(youtubeResultsModal);
    addToDownloadQueue(title, url);
}

// Agregar a la cola de descargas
async function addToDownloadQueue(title, url) {
    try {
        const response = await fetch(`/api/${USUARIO}/youtube/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const download = {
                id: data.download_id,
                title: title,
                status: 'downloading',
                progress: 0,
                error: null
            };
            
            downloadQueue.push(download);
            renderDownloadQueue();
            monitorDownload(data.download_id);
        } else {
            showImportStatus(data.error || 'Error al iniciar descarga', 'error');
        }
    } catch (error) {
        showImportStatus(`Error de conexión: ${error.message}`, 'error');
    }
}

// Monitorear progreso de descarga
async function monitorDownload(downloadId) {
    const checkStatus = async () => {
        try {
            const response = await fetch(`/api/${USUARIO}/download/status/${downloadId}`);
            
            if (response.ok) {
                const status = await response.json();
                updateDownloadStatus(downloadId, status);
                
                if (status.status === 'downloading') {
                    setTimeout(checkStatus, 1000);
                } else if (status.status === 'completed') {
                    // Recargar lista de canciones
                    setTimeout(loadSongs, 1000);
                }
            }
        } catch (error) {
            console.error('Error checking download status:', error);
        }
    };
    
    checkStatus();
}

// Actualizar estado de descarga
function updateDownloadStatus(downloadId, status) {
    const download = downloadQueue.find(d => d.id === downloadId);
    if (download) {
        download.status = status.status;
        download.progress = status.progress || 0;
        download.error = status.error;
        renderDownloadQueue();
    }
}

// Renderizar cola de descargas
function renderDownloadQueue() {
    if (downloadQueue.length === 0) {
        downloadQueueElement.style.display = 'none';
        return;
    }
    
    downloadQueueElement.style.display = 'block';
    
    const queueCount = document.getElementById('queueCount');
    const queueBody = document.getElementById('downloadQueueBody');
    
    const completed = downloadQueue.filter(d => d.status === 'completed').length;
    queueCount.textContent = `(${completed}/${downloadQueue.length})`;
    
    queueBody.innerHTML = downloadQueue.map(download => {
        let icon = '<i class="fas fa-spinner fa-spin"></i>';
        let statusClass = 'downloading';
        let statusText = `${download.progress}%`;
        
        if (download.status === 'completed') {
            icon = '<i class="fas fa-check-circle"></i>';
            statusClass = 'completed';
            statusText = '¡Listo!';
        } else if (download.status === 'error') {
            icon = '<i class="fas fa-exclamation-circle"></i>';
            statusClass = 'error';
            statusText = 'Error';
        }
        
        return `
            <div class="download-item ${statusClass}">
                <div class="download-item-header">
                    <span class="download-item-icon ${statusClass}">${icon}</span>
                    <span class="download-item-name">${escapeHtml(download.title)}</span>
                    <span class="download-item-status">${statusText}</span>
                </div>
                <div class="download-progress-bar">
                    <div class="download-progress-fill" style="width: ${download.progress}%"></div>
                </div>
                ${download.error ? `<div class="download-error-message">${escapeHtml(download.error)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Toggle minimizar cola de descargas
function toggleQueueMinimize() {
    downloadQueueElement.classList.toggle('minimized');
    const icon = document.querySelector('#minimizeQueue i');
    
    if (downloadQueueElement.classList.contains('minimized')) {
        icon.className = 'fas fa-plus';
    } else {
        icon.className = 'fas fa-minus';
    }
}

// Funciones auxiliares
function openModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatViews(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
}
