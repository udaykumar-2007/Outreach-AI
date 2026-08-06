import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

interface CubeProps {
  position: [number, number, number];
  scale: [number, number, number];
  speed: number;
}

const FloatingGlassCube: React.FC<CubeProps> = ({ position, scale, speed }) => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime() * speed;
    meshRef.current.rotation.x = t * 0.2;
    meshRef.current.rotation.y = t * 0.3;
    meshRef.current.position.y = position[1] + Math.sin(t) * 0.45;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial
        color="#EACEAA"
        roughness={0.12}
        metalness={0.85}
        transmission={0.65}
        thickness={1.5}
        transparent
        opacity={0.85}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
};

const Hero3DCanvas: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 opacity-45 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.6} color="#EACEAA" />
        <pointLight position={[-10, -10, -10]} intensity={0.7} color="#D39858" />
        
        <FloatingGlassCube position={[-2.6, 1.2, 0]} scale={[1.2, 1.2, 1.2]} speed={0.8} />
        <FloatingGlassCube position={[2.8, -1.5, 1]} scale={[1.6, 1.6, 1.6]} speed={0.5} />
        <FloatingGlassCube position={[0.5, 2.0, -2]} scale={[0.8, 0.8, 0.8]} speed={1.2} />

        <Stars radius={100} depth={50} count={350} factor={4} saturation={0.5} fade speed={1} />
      </Canvas>
    </div>
  );
};

export default Hero3DCanvas;
