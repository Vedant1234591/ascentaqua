// Bottle animations
document.addEventListener('DOMContentLoaded', function() {
    initBottleAnimations();
});

function initBottleAnimations() {
    const bottles = document.querySelectorAll('.bottle');
    
    bottles.forEach(bottle => {
        // Add hover effect
        bottle.addEventListener('mouseenter', function() {
            this.style.animation = 'none';
            setTimeout(() => {
                this.style.animation = 'float 2s ease-in-out infinite';
            }, 10);
        });
        
        // Create bubbles
        setInterval(() => {
            createBubbles(bottle);
        }, 2000);
    });
}

function createBubbles(bottle) {
    const bottleBody = bottle.querySelector('.bottle-body');
    if (!bottleBody) return;
    
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            
            const size = Math.random() * 8 + 4;
            const left = Math.random() * 60 + 10;
            
            bubble.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: rgba(255,255,255,0.6);
                border-radius: 50%;
                left: ${left}%;
                bottom: 10%;
                animation: bubbleRise 2s ease-in infinite;
            `;
            
            bottleBody.appendChild(bubble);
            
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.parentNode.removeChild(bubble);
                }
            }, 2000);
        }, i * 300);
    }
}

// Add bubble animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes bubbleRise {
        0% { transform: translateY(0) scale(0); opacity: 0; }
        20% { opacity: 1; transform: translateY(-20px) scale(1); }
        100% { transform: translateY(-150px) scale(0.5); opacity: 0; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);