let scene, camera, renderer;
let stars = [];
let speedLines = [];
let scrollPosition = 0;
let scrollVelocity = 0;
const sections = document.querySelectorAll('.space-section');
const totalDepth = 2500;
const SCROLL_SENSITIVITY = 0.1;
const VISIBILITY_RANGE = 300;
const FADE_RATIO = 250;
const scrollPoints = document.querySelectorAll('.scroll-point');
const spaceship = document.querySelector('.spaceship');
const STAR_COUNT = 5000;
const SPEED_LINES_COUNT = 300;
const STAR_SPEED = 0.8;
const WORMHOLE_SEGMENTS = 50;
const WORMHOLE_RADIUS = 20;
let wormhole;

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('space-container').appendChild(renderer.domElement);

    // Create a gradient background
    const gradientTexture = createGradientTexture();
    scene.background = gradientTexture;

    // Create stars with different sizes and colors
    const starColors = [0xffffff, 0x6366f1, 0x0ea5e9, 0xff5722];
    
    for(let i = 0; i < STAR_COUNT; i++) {
        const size = Math.random() * 0.15;
        const starGeometry = new THREE.SphereGeometry(size, 8, 8);
        const starMaterial = new THREE.MeshBasicMaterial({ 
            color: starColors[Math.floor(Math.random() * starColors.length)],
            transparent: true,
            opacity: Math.random() * 0.5 + 0.5
        });
        
        const star = new THREE.Mesh(starGeometry, starMaterial);
        const radius = Math.random() * 500 + 200;
        const theta = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 1000;
        
        star.position.x = radius * Math.cos(theta);
        star.position.y = y;
        star.position.z = radius * Math.sin(theta) + 1000;
        
        star.userData.originalPosition = star.position.clone();
        star.userData.speed = (Math.random() * 0.5 + 0.5) * STAR_SPEED;
        stars.push(star);
        scene.add(star);
    }

    // Create speed lines
    const speedLineGeometry = new THREE.BufferGeometry();
    const speedLineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x6366f1,
        transparent: true,
        opacity: 0.4
    });

    for(let i = 0; i < SPEED_LINES_COUNT; i++) {
        const points = [];
        const length = Math.random() * 20 + 10;
        points.push(new THREE.Vector3(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            Math.random() * 500
        ));
        points.push(new THREE.Vector3(
            points[0].x,
            points[0].y,
            points[0].z - length
        ));
        
        speedLineGeometry.setFromPoints(points);
        const line = new THREE.Line(speedLineGeometry, speedLineMaterial);
        speedLines.push(line);
        scene.add(line);
    }

    // Set initial camera position
    camera.position.z = 5;
    document.body.classList.remove('loading');

    // Smooth scrolling
    let targetScrollPosition = 0;
    window.addEventListener('wheel', (e) => {
        targetScrollPosition = Math.max(0, Math.min(totalDepth, targetScrollPosition + e.deltaY * SCROLL_SENSITIVITY));
        scrollVelocity = e.deltaY * 0.02;
    });

    function updateScroll() {
        scrollPosition += (targetScrollPosition - scrollPosition) * 0.2;
        scrollVelocity *= 0.95;
        updateSections();
        requestAnimationFrame(updateScroll);
    }
    updateScroll();

    window.addEventListener('resize', onWindowResize, false);

    // Update return home button to simple redirect
    document.querySelector('.return-home').addEventListener('click', () => {
        document.body.classList.add('loading');
        
        // Create wormhole
        createWormhole();
        
        // Store initial camera position
        const initialCameraPos = camera.position.clone();
        let progress = 0;
        
        function transitionAnimation() {
            progress += 0.01;
            
            // Update wormhole
            wormhole.material.uniforms.time.value += 0.1;
            wormhole.material.uniforms.progress.value = progress;
            
            // Move camera through wormhole
            camera.position.z = initialCameraPos.z - progress * 100;
            
            // Rotate camera slightly for effect
            camera.rotation.z = Math.sin(progress * Math.PI * 2) * 0.1;
            
            // Fade out stars
            stars.forEach(star => {
                star.material.opacity = Math.max(0, 1 - progress * 2);
            });
            
            // Fade out speed lines
            speedLines.forEach(line => {
                line.material.opacity = Math.max(0, 1 - progress * 2);
            });

            if (progress < 1) {
                requestAnimationFrame(transitionAnimation);
            } else {
                // Store final state
                sessionStorage.setItem('transitionState', JSON.stringify({
                    progress: 1,
                    timestamp: Date.now()
                }));
                window.location.href = 'index3d.html';
            }
        }
        
        transitionAnimation();
    });
}

function createGradientTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#000510');
    gradient.addColorStop(0.5, '#020824');
    gradient.addColorStop(1, '#000510');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    return texture;
}

function updateSections() {
    sections.forEach((section, index) => {
        const depth = parseFloat(section.dataset.depth);
        const distance = Math.abs(scrollPosition - depth);
        
        if (distance < VISIBILITY_RANGE) {
            section.classList.add('active');
            const scale = 1 - (distance / FADE_RATIO) * 0.15;
            const opacity = Math.max(0, 1 - (distance / FADE_RATIO) * 1.5);
            section.style.transform = `translate(-50%, -50%) scale(${scale})`;
            section.style.opacity = opacity;
            
            // Update scroll progress
            scrollPoints.forEach(point => point.classList.remove('active'));
            if (scrollPoints[index]) {
                scrollPoints[index].classList.add('active');
            }
        } else {
            section.classList.remove('active');
            section.style.opacity = 0;
        }
    });

    // Update spaceship position
    const progress = (scrollPosition / totalDepth) * 100;
    const spaceshipPosition = Math.min(100, Math.max(0, progress));
    spaceship.style.top = `${spaceshipPosition}%`;
}

function animate() {
    requestAnimationFrame(animate);

    // Smooth star movement
    const time = Date.now() * 0.0001;
    stars.forEach(star => {
        star.position.z -= (scrollVelocity * 0.2 + star.userData.speed);
        
        const offset = star.userData.originalPosition.x * 0.01;
        star.position.x = star.userData.originalPosition.x + Math.sin(time + offset) * 2;
        star.position.y = star.userData.originalPosition.y + Math.cos(time + offset) * 2;

        if(star.position.z < -1000) {
            star.position.z = 2000;
            star.userData.originalPosition.z = star.position.z;
            const radius = Math.random() * 500 + 200;
            const theta = Math.random() * Math.PI * 2;
            star.position.x = radius * Math.cos(theta);
            star.userData.originalPosition.x = star.position.x;
        }
    });

    // Very subtle camera movement
    camera.position.x += (Math.sin(time) * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (Math.cos(time) * 0.5 - camera.position.y) * 0.02;

    // Animate speed lines
    const speedFactor = Math.abs(scrollVelocity) * 0.05;
    speedLines.forEach(line => {
        line.position.z -= 5 * speedFactor;
        if(line.position.z < -100) {
            line.position.z = 500;
        }
        line.material.opacity = Math.min(0.4, speedFactor * 0.2);
    });
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add fade-in effect on load
document.body.style.opacity = 0;
window.addEventListener('load', () => {
    document.body.style.transition = 'opacity 1s ease';
    document.body.style.opacity = 1;
});

// Add click handlers for the scroll points
scrollPoints.forEach((point, index) => {
    point.addEventListener('click', () => {
        const targetDepth = sections[index].dataset.depth;
        targetScrollPosition = parseFloat(targetDepth);
    });
});

function createWarpField() {
    const warpGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    
    for(let i = 0; i < STAR_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const radius = Math.random() * 50 + 10;
        const z = (Math.random() - 0.5) * 500;
        
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = Math.sin(theta) * radius;
        positions[i * 3 + 2] = z;
    }
    
    warpGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const warpMaterial = new THREE.PointsMaterial({
        color: 0x6366f1,
        size: 12,
        transparent: true,
        opacity: 1
    });
    
    warpField = new THREE.Points(warpGeometry, warpMaterial);
    scene.add(warpField);
}

function createWormhole() {
    const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1000)
        ]),
        WORMHOLE_SEGMENTS,
        WORMHOLE_RADIUS,
        12,
        false
    );

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            progress: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float progress;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
                float stripe = sin(vUv.x * 50.0 + time * 5.0) * 0.5 + 0.5;
                float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
                float alpha = stripe * edge * (1.0 - progress);
                vec3 color = mix(vec3(0.4, 0.4, 1.0), vec3(1.0, 0.4, 1.0), stripe);
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    wormhole = new THREE.Mesh(geometry, material);
    scene.add(wormhole);
} 