/**
 * Effects — Efeitos visuais pós-processamento para a cena 3D
 * Usa apenas recursos nativos do @react-three/drei (sem @react-three/postprocessing)
 */
'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * Ajusta tone mapping e exposure para visual mais cinematográfico
 */
export function Effects() {
  const { gl } = useThree();

  useEffect(() => {
    // Tone mapping para cores mais ricas
    gl.toneMapping = 2; // ACESFilmicToneMapping
    gl.toneMappingExposure = 1.2;
  }, [gl]);

  return null;
}
