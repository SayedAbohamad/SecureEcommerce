import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, Environment, MeshDistortMaterial } from '@react-three/drei';
import { Suspense, useMemo } from 'react';

interface AuthSceneProps {
  accentColor?: string;
  lightColor?: string;
  rotation?: [number, number, number];
}

const Jewel = ({ accentColor = '#5B3DC8', lightColor = '#FF6B35', rotation = [0.5, 0.8, 0] }: AuthSceneProps) => {
  const color = useMemo(() => accentColor, [accentColor]);
  const emissive = useMemo(() => lightColor, [lightColor]);
  return (
    <Float speed={2.5} rotationIntensity={1.2} floatIntensity={1.5}>
      <mesh rotation={rotation}>
        <icosahedronGeometry args={[1.2, 0]} />
        <MeshDistortMaterial color={color} emissive={emissive} emissiveIntensity={0.25} roughness={0.2} distort={0.35} speed={2} />
      </mesh>
    </Float>
  );
};

export const AuthScene = ({ accentColor, lightColor, rotation }: AuthSceneProps) => {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }} style={{ width: '100%', height: '100%' }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 4]} intensity={1.4} />
        <pointLight position={[-4, -3, -2]} intensity={0.7} color={lightColor ?? '#FF6B35'} />
        <Jewel accentColor={accentColor} lightColor={lightColor} rotation={rotation} />
        <Environment files="/potsdamer_platz_1k.hdr" />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.6} />
      </Suspense>
    </Canvas>
  );
};


