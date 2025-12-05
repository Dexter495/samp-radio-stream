/**
 * AudioVisualizer - Web Audio API Frequency Visualizer
 * Creates animated frequency bars and circular wave effects
 */

class AudioVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.animationId = null;
        this.isPlaying = false;
        
        // Visualization settings
        this.barCount = 64; // Number of frequency bars
        this.waveCount = 3; // Number of circular waves
        this.waves = [];
        
        // Initialize waves
        for (let i = 0; i < this.waveCount; i++) {
            this.waves.push({
                radius: 0,
                opacity: 1,
                speed: 1 + i * 0.3
            });
        }
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Start idle animation
        this.startIdleAnimation();
    }
    
    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.offsetWidth;
        this.canvas.height = parent.offsetHeight || 300;
    }
    
    async initialize(audioElement) {
        try {
            // Create audio context if not exists
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            // Connect audio source
            const source = this.audioContext.createMediaElementSource(audioElement);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            return true;
        } catch (error) {
            console.error('Error initializing audio visualizer:', error);
            return false;
        }
    }
    
    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.animate();
    }
    
    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.startIdleAnimation();
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        if (!this.analyser || !this.dataArray) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw circular waves
        this.drawCircularWaves();
        
        // Draw frequency bars
        this.drawFrequencyBars();
    }
    
    drawFrequencyBars() {
        const barWidth = this.canvas.width / this.barCount;
        const centerY = this.canvas.height / 2;
        
        // Get theme from body class
        const isDarkTheme = !document.body.classList.contains('light-theme');
        
        for (let i = 0; i < this.barCount; i++) {
            const dataIndex = Math.floor((i / this.barCount) * this.bufferLength);
            const value = this.dataArray ? this.dataArray[dataIndex] : 0;
            const barHeight = (value / 255) * (this.canvas.height / 2) * 0.8;
            
            const x = i * barWidth;
            
            // Color based on frequency intensity
            let gradient;
            if (isDarkTheme) {
                if (value > 200) {
                    gradient = this.ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
                    gradient.addColorStop(0, '#ff00ff'); // Magenta
                    gradient.addColorStop(0.5, '#00ffff'); // Cyan
                    gradient.addColorStop(1, '#ff00ff'); // Magenta
                } else if (value > 150) {
                    gradient = this.ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
                    gradient.addColorStop(0, '#00ffff'); // Cyan
                    gradient.addColorStop(1, '#8b5cf6'); // Purple
                } else {
                    gradient = this.ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
                    gradient.addColorStop(0, '#8b5cf6'); // Purple
                    gradient.addColorStop(1, '#00ffff'); // Cyan
                }
            } else {
                if (value > 200) {
                    gradient = this.ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
                    gradient.addColorStop(0, '#8b5cf6'); // Purple
                    gradient.addColorStop(0.5, '#3b82f6'); // Blue
                    gradient.addColorStop(1, '#8b5cf6'); // Purple
                } else if (value > 150) {
                    gradient = this.ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
                    gradient.addColorStop(0, '#3b82f6'); // Blue
                    gradient.addColorStop(1, '#8b5cf6'); // Purple
                } else {
                    gradient = this.ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
                    gradient.addColorStop(0, '#3b82f6'); // Blue
                    gradient.addColorStop(1, '#6366f1'); // Indigo
                }
            }
            
            this.ctx.fillStyle = gradient;
            
            // Draw bar from center outward
            this.ctx.fillRect(x, centerY - barHeight, barWidth - 2, barHeight * 2);
            
            // Add glow effect
            if (value > 150) {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = isDarkTheme ? '#00ffff' : '#3b82f6';
            } else {
                this.ctx.shadowBlur = 0;
            }
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    drawCircularWaves() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.min(this.canvas.width, this.canvas.height) / 2;
        
        // Get average frequency
        let avgFrequency = 0;
        if (this.dataArray) {
            for (let i = 0; i < this.bufferLength; i++) {
                avgFrequency += this.dataArray[i];
            }
            avgFrequency /= this.bufferLength;
        }
        
        const isDarkTheme = !document.body.classList.contains('light-theme');
        
        // Update and draw waves
        this.waves.forEach((wave, index) => {
            wave.radius += wave.speed * (1 + avgFrequency / 255);
            wave.opacity = 1 - (wave.radius / maxRadius);
            
            if (wave.radius > maxRadius) {
                wave.radius = 0;
                wave.opacity = 1;
            }
            
            if (wave.opacity > 0) {
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, wave.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = isDarkTheme 
                    ? `rgba(0, 255, 255, ${wave.opacity * 0.3})`
                    : `rgba(59, 130, 246, ${wave.opacity * 0.3})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
    }
    
    startIdleAnimation() {
        const animate = () => {
            if (this.isPlaying) return;
            
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            const centerY = this.canvas.height / 2;
            const barWidth = this.canvas.width / this.barCount;
            const time = Date.now() / 1000;
            
            const isDarkTheme = !document.body.classList.contains('light-theme');
            
            for (let i = 0; i < this.barCount; i++) {
                const x = i * barWidth;
                const height = Math.sin(time + i * 0.2) * 20 + 25;
                
                this.ctx.fillStyle = isDarkTheme 
                    ? 'rgba(139, 92, 246, 0.3)'
                    : 'rgba(59, 130, 246, 0.3)';
                this.ctx.fillRect(x, centerY - height / 2, barWidth - 2, height);
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.AudioVisualizer = AudioVisualizer;
}
