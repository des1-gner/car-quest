import { usePlane, useHeightfield } from "@react-three/cannon";
import { OrbitControls, PerspectiveCamera, Plane } from "@react-three/drei";
import { Suspense, useEffect, useState, useRef, useMemo } from "react";
import { Car } from "./Car";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// Simplex noise function for more natural-looking terrain
function noise(nx, ny) {
  // Returns a value between -1 and 1
  return THREE.MathUtils.seededRandom(nx * 123.456 + ny * 789.012) * 2 - 1;
}

export function Scene() {
  const [thirdPerson, setThirdPerson] = useState(false);
  const [cameraPosition, setCameraPosition] = useState([-6, 3.9, 6.21]);

  function Terrain() {
    const meshRef = useRef();
    
    // Generate terrain data
    const terrainData = useMemo(() => {
      const size = 100;
      const resolution = 100;
      const segments = resolution - 1;
      const heightData = new Float32Array(resolution * resolution);
      
      // Multiple octaves of noise for more natural-looking terrain
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          let height = 0;
          
          // Large features
          height += noise(x / 50, y / 50) * 5;
          
          // Medium features
          height += noise(x / 20, y / 20) * 2;
          
          // Small features
          height += noise(x / 10, y / 10) * 1;
          
          // Add a base height and ensure some flat areas for driving
          height = Math.pow(Math.abs(height), 1.5) * Math.sign(height);
          height = Math.max(height, -2); // Prevent too deep valleys
          
          heightData[y * resolution + x] = height;
        }
      }
      
      return {
        heightData,
        size,
        resolution,
        segments
      };
    }, []);

    // Use heightfield for physics
    useHeightfield(
      () => ({
        args: [
          terrainData.heightData,
          {
            elementSize: terrainData.size / (terrainData.resolution - 1),
          },
        ],
        position: [0, -2, 0],
        rotation: [-Math.PI / 2, 0, 0],
      }),
      useRef(null)
    );

    useEffect(() => {
      if (meshRef.current) {
        const position = meshRef.current.geometry.attributes.position;
        const array = position.array;
        const { heightData, resolution } = terrainData;
        
        // Apply height data to geometry
        for (let i = 0; i < array.length; i += 3) {
          const x = Math.floor((array[i] + terrainData.size/2) / terrainData.size * (resolution-1));
          const z = Math.floor((array[i + 2] + terrainData.size/2) / terrainData.size * (resolution-1));
          const index = z * resolution + x;
          array[i + 1] = heightData[index] || 0;
        }
        
        position.needsUpdate = true;
        meshRef.current.geometry.computeVertexNormals();
      }
    }, [terrainData]);

    return (
      <Plane
        ref={meshRef}
        args={[terrainData.size, terrainData.size, terrainData.segments, terrainData.segments]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2, 0]} // Lowered slightly to give more room for the car
      >
        <meshStandardMaterial
          color="#3a7e1f"
          metalness={0.1}
          roughness={0.8}
          vertexColors={false}
          wireframe={false}
        />
      </Plane>
    );
  }

  useEffect(() => {
    function keydownHandler(e) {
      if (e.key === "k") {
        if (thirdPerson) {
          setCameraPosition([-6, 3.9, 6.21 + Math.random() * 0.01]);
        }
        setThirdPerson(!thirdPerson);
      }
    }

    window.addEventListener("keydown", keydownHandler);
    return () => window.removeEventListener("keydown", keydownHandler);
  }, [thirdPerson]);

  return (
    <Suspense fallback={null}>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <hemisphereLight
        skyColor={new THREE.Color(0x87ceeb)}
        groundColor={new THREE.Color(0x444444)}
        intensity={0.5}
      />
      
      <color attach="background" args={['#87CEEB']} />
      
      <PerspectiveCamera makeDefault position={cameraPosition} fov={40} />
      
      {!thirdPerson && (
        <OrbitControls target={[-2.64, -0.71, 0.03]} />
      )}

      <Terrain />
      <Car thirdPerson={thirdPerson} />
    </Suspense>
  );
}