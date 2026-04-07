/**
 * SceneLights — Iluminação 3D realista para o estacionamento
 */
'use client';

export function SceneLights() {
  return (
    <>
      {/* Luz ambiente suave */}
      <ambientLight intensity={0.4} color="#b0c4de" />

      {/* Luz direcional principal (simula sol/poste) */}
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Luz de preenchimento (reduz sombras duras) */}
      <directionalLight
        position={[-5, 8, -4]}
        intensity={0.3}
        color="#4a90d9"
      />

      {/* Point lights simulando postes de luz */}
      <pointLight position={[-3, 4, 0]} intensity={0.5} color="#ffeedd" distance={12} />
      <pointLight position={[3, 4, 0]} intensity={0.5} color="#ffeedd" distance={12} />
    </>
  );
}
