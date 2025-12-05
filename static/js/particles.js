/**
 * ParticleSystem - Floating particles background effect
 * Creates animated stars and glowing dots
 */

class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 80; // Reduced for mobile performance
        this.animationId = null;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.initParticles();
        this.animate();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Adjust particle count based on screen size
        if (window.innerWidth < 768) {
            this.particleCount = 40; // Fewer particles on mobile
        } else {
            this.particleCount = 80;
        }
    }
    
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.2,
            twinkleSpeed: Math.random() * 0.02 + 0.01,
            twinklePhase: Math.random() * Math.PI * 2
        };
    }
    
    update() {
        this.particles.forEach(particle => {
            // Move particle
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
            
            // Twinkle effect
            particle.twinklePhase += particle.twinkleSpeed;
            particle.opacity = 0.3 + Math.sin(particle.twinklePhase) * 0.3;
        });
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const isDarkTheme = !document.body.classList.contains('light-theme');
        
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            
            // Different colors for dark and light theme
            if (isDarkTheme) {
                // Cyan, magenta, and purple particles for dark theme
                const colors = [
                    `rgba(0, 255, 255, ${particle.opacity})`,
                    `rgba(255, 0, 255, ${particle.opacity})`,
                    `rgba(139, 92, 246, ${particle.opacity})`
                ];
                const colorIndex = Math.floor(particle.x + particle.y) % 3;
                this.ctx.fillStyle = colors[colorIndex];
            } else {
                // Blue and purple particles for light theme
                const colors = [
                    `rgba(59, 130, 246, ${particle.opacity})`,
                    `rgba(139, 92, 246, ${particle.opacity})`
                ];
                const colorIndex = Math.floor(particle.x + particle.y) % 2;
                this.ctx.fillStyle = colors[colorIndex];
            }
            
            this.ctx.fill();
            
            // Add glow effect
            if (particle.size > 2) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = this.ctx.fillStyle;
            } else {
                this.ctx.shadowBlur = 0;
            }
        });
        
        this.ctx.shadowBlur = 0;
    }
    
    animate() {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.ParticleSystem = ParticleSystem;
}
