import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CarQuest = () => {
  const mountRef = useRef(null);
  const carRef = useRef(null);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const isBrakingRef = useRef(false);
  const keysRef = useRef({});
  const cameraRef = useRef(null);
  const cameraOffsetRef = useRef(new THREE.Vector3(0, 5, 10));

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 0, 500); // Add fog for distance fading
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // Expanded map size
    const mapSize = 500; // 10x bigger than before
    const resolution = 256; // Increased resolution for better detail
    const terrainGeometry = new THREE.PlaneGeometry(mapSize, mapSize, resolution - 1, resolution - 1);
    
    // Enhanced height map generation
    const generateHeight = (width, height) => {
      const size = width * height;
      const data = new Float32Array(size);
      
      // Multiple layers of noise for more natural terrain
      for (let i = 0; i < size; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        
        // Base terrain with multiple frequencies
        let height = 0;
        height += Math.sin(x / 100) * Math.cos(y / 100) * 10; // Large hills
        height += Math.sin(x / 30) * Math.cos(y / 30) * 5; // Medium features
        height += Math.sin(x / 10) * Math.cos(y / 10) * 2; // Small details
        
        // Add random mountains
        if (Math.random() > 0.995) {
          const mountain = (x, y, peakHeight, radius) => {
            const distance = Math.sqrt(
              Math.pow(x - width / 2, 2) + 
              Math.pow(y - height / 2, 2)
            );
            return Math.max(0, (1 - distance / radius) * peakHeight);
          };
          
          height += mountain(x, y, 20, 40);
        }
        
        // Add small bumps for detail
        height += (Math.random() - 0.5) * 0.5;
        
        data[i] = height;
      }
      
      return data;
    };

    const heightData = generateHeight(resolution, resolution);
    
    // Apply height map
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i + 2] = heightData[i / 3] * 2;
    }
    
    terrainGeometry.computeVertexNormals();
    
    // Enhanced terrain material
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d5e3d,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });
    
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Add more ramps throughout the larger map
    const addRamp = (x, y, rotation) => {
      const rampGeometry = new THREE.BoxGeometry(8, 0.2, 4);
      const rampMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.7,
        metalness: 0.3
      });
      const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
      ramp.position.set(x, y, 2);
      ramp.rotation.z = rotation;
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      scene.add(ramp);
    };

    // Add ramps across the larger map
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * mapSize * 0.8;
      const y = (Math.random() - 0.5) * mapSize * 0.8;
      const rotation = Math.random() * Math.PI / 3;
      addRamp(x, y, rotation);
    }

    // Enhanced car model
    const carWidth = 2;
    const carHeight = 1;
    const carLength = 4;
    const carGeometry = new THREE.BoxGeometry(carWidth, carHeight, carLength);
    const carMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.7
    });
    const car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.set(0, 3, 0);
    car.castShadow = true;
    scene.add(car);
    carRef.current = car;
    car.rotation.y = Math.PI / 2;

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Physics parameters
    const acceleration = 0.04;
    const brakingForce = 0.05;
    const maxSpeed = 2.0; // Increased for larger map
    const rotationSpeed = 0.03;
    const gravity = 0.015;
    const groundLevel = 0.5;

    // Camera smoothing parameters
    const cameraSmoothness = 0.1;
    const targetCameraOffset = new THREE.Vector3(0, 5, 15);

    const handleKeyDown = (event) => {
      keysRef.current[event.key] = true;
    };

    const handleKeyUp = (event) => {
      keysRef.current[event.key] = false;
      if (event.key === ' ') {
        isBrakingRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mouse wheel handler for camera distance
    const handleWheel = (event) => {
      const zoomSpeed = 0.5;
      targetCameraOffset.z = Math.max(5, Math.min(30, 
        targetCameraOffset.z + event.deltaY * 0.01 * zoomSpeed
      ));
    };

    window.addEventListener('wheel', handleWheel);

    const getHeightAtPosition = (x, z) => {
      const worldX = ((x + mapSize / 2) / mapSize) * (resolution - 1);
      const worldZ = ((z + mapSize / 2) / mapSize) * (resolution - 1);
      
      const ix = Math.floor(worldX);
      const iz = Math.floor(worldZ);
      
      if (ix < 0 || ix >= resolution - 1 || iz < 0 || iz >= resolution - 1) {
        return 0;
      }
      
      const heightIndex = iz * resolution + ix;
      return heightData[heightIndex] * 2;
    };

    const animate = () => {
      requestAnimationFrame(animate);

      const car = carRef.current;
      const velocity = velocityRef.current;
      const keys = keysRef.current;

      // Terrain physics
      const terrainHeight = getHeightAtPosition(car.position.x, car.position.z);
      const heightAboveGround = car.position.y - (terrainHeight + groundLevel);
      
      if (heightAboveGround > 0) {
        velocity.y -= gravity;
      } else {
        car.position.y = terrainHeight + groundLevel;
        velocity.y = Math.max(0, velocity.y);
      }

      // Car controls
      if (keys['w']) {
        velocity.z -= acceleration;
      }
      if (keys['s']) {
        velocity.z += acceleration;
      }
      if (keys['a']) {
        car.rotation.y += rotationSpeed;
      }
      if (keys['d']) {
        car.rotation.y -= rotationSpeed;
      }

      if (keys[' ']) {
        isBrakingRef.current = true;
        velocity.multiplyScalar(1 - brakingForce);
      }

      if (velocity.length() > maxSpeed) {
        velocity.normalize().multiplyScalar(maxSpeed);
      }

      // Movement and terrain interaction
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion);
      const movement = forward.multiplyScalar(velocity.z);
      
      const aheadHeight = getHeightAtPosition(
        car.position.x + movement.x,
        car.position.z + movement.z
      );
      const heightDifference = aheadHeight - terrainHeight;
      
      if (Math.abs(heightDifference) > 1.0) {
        movement.multiplyScalar(0.5);
      }
      
      car.position.add(movement);
      car.position.y += velocity.y;

      velocity.multiplyScalar(0.98);

      // Smooth third-person camera follow
      const idealOffset = new THREE.Vector3(
        targetCameraOffset.x,
        targetCameraOffset.y,
        targetCameraOffset.z
      ).applyQuaternion(car.quaternion);

      const idealPosition = car.position.clone().add(idealOffset);
      const currentPosition = camera.position.clone();
      
      // Smooth camera movement
      camera.position.lerp(idealPosition, cameraSmoothness);
      
      // Look at car with slight offset for better view
      const lookAtPosition = car.position.clone().add(new THREE.Vector3(0, 2, 0));
      camera.lookAt(lookAtPosition);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return <div ref={mountRef}></div>;
};

export default CarQuest;