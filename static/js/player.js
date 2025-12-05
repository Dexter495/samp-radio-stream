/**
 * Enhanced Player Controls
 * Handles theme toggle, volume, shuffle, repeat, and playlist navigation
 */

class EnhancedPlayer {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'dark';
        this.volume = parseInt(localStorage.getItem('volume')) || 100;
        this.shuffle = localStorage.getItem('shuffle') === 'true';
        this.repeat = localStorage.getItem('repeat') || 'off'; // off, playlist, song
        this.currentPlaylist = [];
        this.currentIndex = -1;
        this.currentTrack = null;
        
        this.initTheme();
    }
    
    initTheme() {
        if (this.theme === 'light') {
            document.body.classList.add('light-theme');
        }
    }
    
    toggleTheme() {
        if (document.body.classList.contains('light-theme')) {
            document.body.classList.remove('light-theme');
            this.theme = 'dark';
        } else {
            document.body.classList.add('light-theme');
            this.theme = 'light';
        }
        localStorage.setItem('theme', this.theme);
        
        // Update theme toggle button
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            const icon = themeBtn.querySelector('i');
            if (this.theme === 'light') {
                icon.className = 'fas fa-moon';
            } else {
                icon.className = 'fas fa-sun';
            }
        }
    }
    
    setVolume(value) {
        this.volume = Math.max(0, Math.min(100, value));
        localStorage.setItem('volume', this.volume);
        
        // Update volume icon
        const volumeBtn = document.getElementById('volumeBtn');
        if (volumeBtn) {
            const icon = volumeBtn.querySelector('i');
            if (this.volume === 0) {
                icon.className = 'fas fa-volume-xmark';
            } else if (this.volume < 33) {
                icon.className = 'fas fa-volume-off';
            } else if (this.volume < 66) {
                icon.className = 'fas fa-volume-low';
            } else {
                icon.className = 'fas fa-volume-high';
            }
        }
        
        return this.volume;
    }
    
    toggleMute() {
        if (this.volume > 0) {
            this.lastVolume = this.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.lastVolume || 100);
        }
        return this.volume;
    }
    
    toggleShuffle() {
        this.shuffle = !this.shuffle;
        localStorage.setItem('shuffle', this.shuffle);
        
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (shuffleBtn) {
            if (this.shuffle) {
                shuffleBtn.classList.add('active');
            } else {
                shuffleBtn.classList.remove('active');
            }
        }
        
        return this.shuffle;
    }
    
    toggleRepeat() {
        if (this.repeat === 'off') {
            this.repeat = 'playlist';
        } else if (this.repeat === 'playlist') {
            this.repeat = 'song';
        } else {
            this.repeat = 'off';
        }
        localStorage.setItem('repeat', this.repeat);
        
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) {
            const icon = repeatBtn.querySelector('i');
            repeatBtn.classList.remove('active', 'repeat-one');
            
            if (this.repeat === 'playlist') {
                repeatBtn.classList.add('active');
                icon.className = 'fas fa-repeat';
            } else if (this.repeat === 'song') {
                repeatBtn.classList.add('active', 'repeat-one');
                icon.className = 'fas fa-repeat';
            } else {
                icon.className = 'fas fa-repeat';
            }
        }
        
        return this.repeat;
    }
    
    setPlaylist(songs) {
        this.currentPlaylist = [...songs];
        if (this.shuffle) {
            this.shufflePlaylist();
        }
    }
    
    shufflePlaylist() {
        for (let i = this.currentPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.currentPlaylist[i], this.currentPlaylist[j]] = 
                [this.currentPlaylist[j], this.currentPlaylist[i]];
        }
    }
    
    setCurrentTrack(songName) {
        this.currentTrack = songName;
        this.currentIndex = this.currentPlaylist.findIndex(s => s.nombre === songName);
    }
    
    getNextTrack() {
        if (this.currentPlaylist.length === 0) return null;
        
        if (this.repeat === 'song') {
            return this.currentTrack;
        }
        
        let nextIndex = this.currentIndex + 1;
        
        if (nextIndex >= this.currentPlaylist.length) {
            if (this.repeat === 'playlist') {
                nextIndex = 0;
            } else {
                return null;
            }
        }
        
        return this.currentPlaylist[nextIndex].nombre;
    }
    
    getPreviousTrack() {
        if (this.currentPlaylist.length === 0) return null;
        
        let prevIndex = this.currentIndex - 1;
        
        if (prevIndex < 0) {
            if (this.repeat === 'playlist') {
                prevIndex = this.currentPlaylist.length - 1;
            } else {
                return null;
            }
        }
        
        return this.currentPlaylist[prevIndex].nombre;
    }
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.EnhancedPlayer = EnhancedPlayer;
}
