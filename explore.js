let scene, camera, renderer;
let stars = [];
let speedLines = [];
let scrollPosition = 0;
let scrollVelocity = 0;
const sections = document.querySelectorAll('.space-section');
const totalDepth = 2500;
const SCROLL_SENSITIVITY = 0.07;
const VISIBILITY_RANGE = 800;
const FADE_RATIO = 300;
const scrollPoints = document.querySelectorAll('.scroll-point');
const spaceship = document.querySelector('.spaceship');
const STAR_COUNT = 5000;
const SPEED_LINES_COUNT = 300;
const STAR_SPEED = 0.8;
const WORMHOLE_SEGMENTS = 50;
const WORMHOLE_RADIUS = 20;
let wormhole;
let eyeGroup, iris, pupil;
let mouseX = 0, mouseY = 0;
const EYE_RADIUS = 80;
const IRIS_RADIUS = 40;
const PUPIL_RADIUS = 20;
const MAX_EYE_MOVEMENT = 5;
const BLINK_INTERVAL = 5000; // 5 seconds
let lastBlinkTime = Date.now();
let isBlinking = false;
let blinkProgress = 0;
let isAnimatingScroll = false;
let targetScrollPosition = 0;

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

    let lastScrollTime = Date.now();
    
    window.addEventListener('wheel', (e) => {
        if (isAnimatingScroll) return; // Ignore wheel events during animation
        
        const currentTime = Date.now();
        const timeDelta = currentTime - lastScrollTime;
        
        if (timeDelta > 16) {
            const scrollDelta = e.deltaY * SCROLL_SENSITIVITY;
            targetScrollPosition = Math.max(0, Math.min(totalDepth, targetScrollPosition + scrollDelta));
            scrollVelocity = scrollDelta * 0.1;
            lastScrollTime = currentTime;
        }
        
        e.preventDefault();
    }, { passive: false });

    function updateScroll() {
        if (!isAnimatingScroll) {  // Only update scroll if not in click animation
            const scrollDelta = targetScrollPosition - scrollPosition;
            scrollPosition += scrollDelta * 0.1;
            scrollVelocity *= 0.9;
            
            // Snap to nearest section when almost stopped
            if (Math.abs(scrollDelta) < 0.1 && Math.abs(scrollVelocity) < 0.1) {
                const nearestSection = Array.from(sections).reduce((nearest, section) => {
                    const depth = parseFloat(section.dataset.depth);
                    const currentDistance = Math.abs(scrollPosition - depth);
                    const nearestDistance = Math.abs(scrollPosition - nearest);
                    return currentDistance < nearestDistance ? depth : nearest;
                }, scrollPosition);
                
                if (Math.abs(scrollPosition - nearestSection) < 50) {
                    scrollPosition = nearestSection;
                    targetScrollPosition = nearestSection;
                }
            }
        }
        
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

    // Add lights specifically for the eye
    const frontLight = new THREE.DirectionalLight(0xffffff, 1);
    frontLight.position.set(0, 0, 1);
    scene.add(frontLight);

    const ambientLight = new THREE.AmbientLight(0x666666);
    scene.add(ambientLight);

    createEye();

    // Add mouse move listener
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
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
            
            // Smoother scaling and opacity transitions
            let scale = 1;
            let opacity = 1;
            
            if (distance > 0) {
                scale = 1 - Math.pow(distance / FADE_RATIO, 2) * 0.15;
                opacity = 1 - Math.pow(distance / FADE_RATIO, 2);
            }
            
            // Ensure full visibility when spaceship is at the dot
            if (distance < 50) {
                scale = 1;
                opacity = 1;
            }
            
            section.style.transform = `translate(-50%, -50%) scale(${scale})`;
            section.style.opacity = opacity;
            
            // Update scroll progress and dot labels
            scrollPoints.forEach((point, pointIndex) => {
                point.classList.remove('active');
                point.classList.remove('near-spaceship');
                
                // Calculate distance between spaceship and this dot
                const dotDepth = parseFloat(sections[pointIndex].dataset.depth);
                const spaceshipDepth = scrollPosition;
                const distanceToDot = Math.abs(spaceshipDepth - dotDepth);
                
                // Show label when spaceship is near
                if (distanceToDot < 100) {
                    point.classList.add('near-spaceship');
                }
                
                // Active state for current section
                if (pointIndex === index && distance < 50) {
                    point.classList.add('active');
                    section.style.opacity = 1;
                    section.style.transform = 'translate(-50%, -50%) scale(1)';
                }
            });
        } else {
            section.classList.remove('active');
            section.style.opacity = 0;
        }
    });

    // Update spaceship position with smoother movement
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
    
    // Update eye movement and blinking
    if (eyeGroup) {
        const currentTime = Date.now();
        
        // Handle blinking
        if (!isBlinking && currentTime - lastBlinkTime > BLINK_INTERVAL) {
            isBlinking = true;
            blinkProgress = 0;
            lastBlinkTime = currentTime;
        }

        if (isBlinking) {
            blinkProgress += 0.15; // Speed of blink
            
            // Full blink animation cycle
            let blinkScale;
            if (blinkProgress < 1) {
                // Closing eye
                blinkScale = 1 - blinkProgress;
            } else if (blinkProgress < 2) {
                // Opening eye
                blinkScale = (blinkProgress - 1);
            } else {
                // Reset blink
                isBlinking = false;
                blinkScale = 1;
            }
            
            // Only scale the eye parts, not the triangle
            if (blinkScale > 0) {
                eyeGroup.userData.eye.scale.y = Math.max(0.1, blinkScale);
                iris.scale.y = Math.max(0.1, blinkScale);
                pupil.scale.y = Math.max(0.1, blinkScale);
            } else {
                eyeGroup.userData.eye.scale.y = 1;
                iris.scale.y = 1;
                pupil.scale.y = 1;
            }
        }

        // Smooth eye movement
        const targetX = mouseX * MAX_EYE_MOVEMENT;
        const targetY = mouseY * MAX_EYE_MOVEMENT;
        
        iris.position.x += (targetX - iris.position.x) * 0.1;
        iris.position.y += (targetY - iris.position.y) * 0.1;
        
        pupil.position.x = iris.position.x;
        pupil.position.y = iris.position.y;

        // Keep the mystical rotation for rays only
        eyeGroup.children.forEach(child => {
            if (child.type === 'Line') {
                child.rotation.z = Math.sin(Date.now() * 0.0005) * 0.1;
                child.material.opacity = 0.3 + Math.sin(Date.now() * 0.002) * 0.2;
            }
        });
    }

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

// Update the click handlers for the scroll points
scrollPoints.forEach((point, index) => {
    point.addEventListener('click', () => {
        const targetDepth = parseFloat(sections[index].dataset.depth);
        
        if (isAnimatingScroll) return;
        
        isAnimatingScroll = true;
        scrollVelocity = 0;
        
        const startPosition = scrollPosition;
        const distance = targetDepth - startPosition;
        const duration = 1000;
        const startTime = Date.now();
        
        function smoothScroll() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;
            
            scrollPosition = startPosition + (distance * easeProgress);
            targetScrollPosition = scrollPosition;
            
            if (progress < 1) {
                requestAnimationFrame(smoothScroll);
            } else {
                scrollPosition = targetDepth;
                targetScrollPosition = targetDepth;
                scrollVelocity = 0;
                isAnimatingScroll = false;
            }
        }
        
        smoothScroll();
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

function createEye() {
    eyeGroup = new THREE.Group();
    
    // Create the eye (a true smooth oval)
    const eyeCurve = new THREE.EllipseCurve(
        0, 0,                     // ax, aY (center)
        EYE_RADIUS, EYE_RADIUS * 0.5,  // xRadius, yRadius
        0, 2 * Math.PI,           // startAngle, endAngle
        false,                    // clockwise
        0                         // rotation
    );
    const eyePoints = eyeCurve.getPoints(100);
    const eyeShape = new THREE.Shape(eyePoints);
    const eyeGeometry = new THREE.ShapeGeometry(eyeShape);
    const eyeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        shininess: 100,
        specular: 0x333333
    });
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeGroup.add(eye);
    eyeGroup.userData.eye = eye; // Store reference

    // Create iris with gradient and texture
    const irisGeometry = new THREE.CircleGeometry(IRIS_RADIUS, 64);
    const irisTexture = createIrisTexture();
    const irisMaterial = new THREE.MeshPhongMaterial({
        map: irisTexture,
        transparent: true,
        opacity: 0.9,
        shininess: 50,
        specular: 0x555555
    });
    iris = new THREE.Mesh(irisGeometry, irisMaterial);
    iris.position.z = 0.1;
    eyeGroup.add(iris);

    // Create pupil
    const pupilGeometry = new THREE.CircleGeometry(PUPIL_RADIUS, 32);
    const pupilMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        shininess: 100,
        specular: 0x111111
    });
    pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.position.z = 0.2;
    eyeGroup.add(pupil);

    // Add rays of light around the eye
    createLightRays();

    // Position the eye group
    eyeGroup.position.z = -200;
    eyeGroup.scale.set(1.5, 1.5, 1.5);
    scene.add(eyeGroup);
}

function createIrisTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Create a detailed radial gradient for the iris
    const gradient = ctx.createRadialGradient(512, 512, 50, 512, 512, 512);
    gradient.addColorStop(0, '#8B4513');     // Dark brown center
    gradient.addColorStop(0.3, '#CD853F');     
    gradient.addColorStop(0.5, '#D2B48C');    
    gradient.addColorStop(0.7, '#CD853F');
    gradient.addColorStop(1, '#8B4513');       // Dark brown edge

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);

    // Draw subtle radial striations for iris fibers
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#654321'; // Darker stroke for striations
    ctx.lineWidth = 2;
    for (let i = 0; i < 360; i += 5) {
        ctx.beginPath();
        ctx.moveTo(512, 512);
        const endX = 512 + Math.cos(i * Math.PI / 180) * 512;
        const endY = 512 + Math.sin(i * Math.PI / 180) * 512;
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
}

function createLightRays() {
    const rayCount = 12;
    const rayLength = EYE_RADIUS * 3;
    const rayGeometry = new THREE.BufferGeometry();
    const rayMaterial = new THREE.LineBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.5
    });

    for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const x = Math.cos(angle) * rayLength;
        const y = Math.sin(angle) * rayLength;

        const points = [];
        points.push(new THREE.Vector3(0, 0, -1));
        points.push(new THREE.Vector3(x, y, -1));

        const ray = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            rayMaterial
        );
        eyeGroup.add(ray);
    }
} 