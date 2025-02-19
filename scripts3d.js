let scene, camera, renderer, controls;
let targetPosition = new THREE.Vector3(0, 0, 30);
let currentSection = 0;
let isTransitioning = false;
let contentWall = null;
let exploreButton3D = null;

init();
animate();

function init() {
    // Setup scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // Setup camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Setup controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Add 3D Text
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
        // Main Title
        const textGeometry = new THREE.TextGeometry('AiWonderLAB', {
            font: font,
            size: 3,
            height: 1,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.05,
            bevelSegments: 5
        });

        textGeometry.center();

        const textMaterial = new THREE.MeshPhongMaterial({
            color: 0x6366f1,
            emissive: 0x2a2a8a,
            specular: 0xffffff,
            shininess: 100
        });

        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.y = 8;
        scene.add(textMesh);
        scene.userData.text = textMesh;

        // Create 3D Explore Button
        const buttonGeometry = new THREE.TextGeometry('EXPLORE', {
            font: font,
            size: 1,
            height: 0.2,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.02,
            bevelSegments: 3
        });

        buttonGeometry.center();

        const buttonMaterial = new THREE.MeshPhongMaterial({
            color: 0xff5722,
            emissive: 0xbf360c,
            specular: 0xffffff,
            shininess: 100
        });

        exploreButton3D = new THREE.Mesh(buttonGeometry, buttonMaterial);
        exploreButton3D.position.y = -8;
        exploreButton3D.position.z = 2;
        scene.add(exploreButton3D);

        // Create content wall (important: call this here!)
        createContentWall();

        // Add a torus knot
        const geometry = new THREE.TorusKnotGeometry(3, 1, 100, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x6366f1,
            wireframe: true
        });
        const torusKnot = new THREE.Mesh(geometry, material);
        torusKnot.position.set(-8, -5, 0);
        scene.add(torusKnot);
        scene.userData.torusKnot = torusKnot;

        // Add a sphere
        const sphereGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xff5722,
            wireframe: true
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(8, -5, 0);
        scene.add(sphere);
        scene.userData.sphere = sphere;

        // Add particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particleCount = 2000;
        const posArray = new Float32Array(particleCount * 3);
        
        for(let i = 0; i < particleCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 100;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.2,
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);
        scene.userData.particles = particlesMesh;

        // Define camera positions for exploration
        scene.userData.cameraPositions = [
            { position: new THREE.Vector3(0, 0, 30), target: new THREE.Vector3(0, 0, 0) },
            { position: new THREE.Vector3(0, 0, 40), target: new THREE.Vector3(0, 0, 0) }, // Updated: Content wall view further back
            { position: new THREE.Vector3(-15, 10, 20), target: new THREE.Vector3(-8, -5, 0) },
            { position: new THREE.Vector3(15, 10, 20), target: new THREE.Vector3(8, -5, 0) },
            { position: new THREE.Vector3(0, 15, 25), target: new THREE.Vector3(0, 8, 0) }
        ];

        // Handle window resizing
        window.addEventListener('resize', onWindowResize, false);

        // Add click handler for explore button
        document.getElementById('exploreButton').addEventListener('click', handleExplore);
        
        // Add raycaster for 3D button interaction
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        renderer.domElement.addEventListener('click', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(exploreButton3D);

            if (intersects.length > 0) {
                handleExplore();
            }
        });

        renderer.domElement.addEventListener('mousemove', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(exploreButton3D);

            if (intersects.length > 0) {
                exploreButton3D.material.emissive.setHex(0xff0000);
                document.body.style.cursor = 'pointer';
            } else {
                exploreButton3D.material.emissive.setHex(0xbf360c);
                document.body.style.cursor = 'default';
            }
        });
    });
}

function createContentWall() {
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
        // Define text materials for titles and regular text
        const titleMaterial = new THREE.MeshPhongMaterial({
            color: 0x6366f1,
            emissive: 0x2a2a8a,
            specular: 0xffffff,
            shininess: 100
        });
        const textMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0x333333,
            specular: 0xffffff,
            shininess: 50
        });

        // Starting vertical offset for content
        let yOffset = 15;

        // Hero Section
        createTextSection("Welcome to AiWonderLAB", 2, yOffset, titleMaterial);
        yOffset -= 3;
        createTextSection('"We don\'t know where we\'re going and that\'s Wonderful."', 1, yOffset, textMaterial);
        yOffset -= 4;

        // How We Work Section
        createTextSection("How We Work", 1.5, yOffset, titleMaterial);
        yOffset -= 2.5;
        createTextSection("We start with curiosity, embrace play,", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("and discover unexpected results.", 0.8, yOffset, textMaterial);
        yOffset -= 3;

        // Our Experiments Section
        createTextSection("Our Experiments", 1.5, yOffset, titleMaterial);
        yOffset -= 2.5;
        createTextSection("TheAccelerators.ai", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("AI-Generated Content Profiles", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("OnlyAIam - Your AI companion", 0.8, yOffset, textMaterial);
        yOffset -= 3;

        // Why We Do It Section
        createTextSection("Why We Do It", 1.5, yOffset, titleMaterial);
        yOffset -= 2.5;
        createTextSection("We believe in the power of curiosity", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("and the beauty of the unknown.", 0.8, yOffset, textMaterial);
        yOffset -= 3;

        // Our Process Section
        createTextSection("Our Process", 1.5, yOffset, titleMaterial);
        yOffset -= 2;
        createTextSection("Embrace the Unknown", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Make New Connections", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Take On Difficulty", 0.8, yOffset, textMaterial);
        yOffset -= 2;

        // Who's Backing us? Section
        createTextSection("Who's Backing us?", 1.5, yOffset, titleMaterial);
        yOffset -= 2.5;
        createTextSection("Athens Coconut - Strategy & storytelling", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("WDMF - Content & engagement", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Viral Passion - Performance & growth", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Let's Go Bananas - Creativity & entertainment", 0.8, yOffset, textMaterial);
        yOffset -= 2;

        // What Are We Doing? Section
        createTextSection("What Are We Doing?", 1.5, yOffset, titleMaterial);
        yOffset -= 2.5;
        createTextSection("Playing with AI tools with the intent of expression and entertainment", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Mixing AI with ideas, people, and randomness", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Going with the flow", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Some part works out and we create something new", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Some part doesn't and we learn something new", 0.8, yOffset, textMaterial);
        yOffset -= 2;

        // Let's Connect Section
        createTextSection("Let's Connect", 1.5, yOffset, titleMaterial);
        yOffset -= 2.5;
        createTextSection("Join Our Journey", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Explore Our Experiments", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Get in Touch", 0.8, yOffset, textMaterial);
        yOffset -= 2;

        // Contact Us Section
        createTextSection("Contact Us", 1.5, yOffset, titleMaterial);
        yOffset -= 2.5;
        createTextSection("Email: contact@aiwonderlab.com", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("Start a Conversation", 0.8, yOffset, textMaterial);
        yOffset -= 2;

        // Behind the Scenes Section
        createTextSection("Behind the Scenes", 1.5, yOffset, titleMaterial);
        yOffset -= 2.5;
        createTextSection("Created by AI in 30 Minutes", 0.8, yOffset, textMaterial);
        yOffset -= 1.5;
        createTextSection("This entire website was generated using AI assistance.", 0.8, yOffset, textMaterial);
        yOffset -= 2;

        // Helper: create a 3D text section with the given settings.
        function createTextSection(text, size, yPos, material) {
            const geometry = new THREE.TextGeometry(text, {
                font: font,
                size: size,
                height: 0.1,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.01,
                bevelSize: 0.01,
                bevelSegments: 3
            });
            geometry.center();
            const textMesh = new THREE.Mesh(geometry, material);
            textMesh.position.y = yPos;
            textMesh.position.z = -20;
            scene.add(textMesh);
            
            if (!scene.userData.contentTexts) {
                scene.userData.contentTexts = [];
            }
            scene.userData.contentTexts.push(textMesh);
            textMesh.visible = false;
        }
    });
}

function handleExplore() {
    if (isTransitioning) return;
    
    isTransitioning = true;
    
    // Fade out effect
    const overlay = document.getElementById('overlay');
    overlay.style.transition = 'opacity 1s ease';
    overlay.style.opacity = 0;
    
    // Move camera back
    targetPosition.z = 60;
    
    // After camera movement and fade, redirect to explore page
    setTimeout(() => {
        window.location.href = 'explore.html';
    }, 2000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Update TWEEN
    TWEEN.update();

    // Rotate the torus knot
    if (scene.userData.torusKnot) {
        scene.userData.torusKnot.rotation.x += 0.01;
        scene.userData.torusKnot.rotation.y += 0.02;
    }

    // Rotate and pulse the sphere
    if (scene.userData.sphere) {
        scene.userData.sphere.rotation.y += 0.01;
        const scale = 1 + Math.sin(Date.now() * 0.001) * 0.2;
        scene.userData.sphere.scale.set(scale, scale, scale);
    }

    // Gently rotate the text
    if (scene.userData.text) {
        scene.userData.text.rotation.y = Math.sin(Date.now() * 0.0005) * 0.2;
    }

    // Animate 3D button
    if (exploreButton3D) {
        exploreButton3D.rotation.y = Math.sin(Date.now() * 0.001) * 0.1;
        exploreButton3D.position.y = -8 + Math.sin(Date.now() * 0.002) * 0.2;
    }

    // Gently animate content texts if visible
    if (scene.userData.contentTexts) {
        scene.userData.contentTexts.forEach((textMesh, index) => {
            if (textMesh.visible) {
                textMesh.rotation.y = Math.sin(Date.now() * 0.0005 + index * 0.1) * 0.05;
            }
        });
    }

    // Rotate the particles
    if (scene.userData.particles) {
        scene.userData.particles.rotation.y += 0.0003;
    }

    // Smooth camera movement
    if (isTransitioning) {
        camera.position.lerp(targetPosition, 0.02);
    }

    controls.update();
    renderer.render(scene, camera);
} 