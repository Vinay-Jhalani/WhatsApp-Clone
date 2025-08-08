import React, { useRef, useEffect } from "react";
import { NeatGradient } from "@firecms/neat";

const AnimatedGradientBackground = () => {
  const canvasRef = useRef(null);
  const gradientRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const config = {
      colors: [
        {
          color: "#A8E6CF",
          enabled: true,
        },
        {
          color: "#16A085",
          enabled: true,
        },
        {
          color: "#27AE60",
          enabled: true,
        },
        {
          color: "#145A32",
          enabled: true,
        },
        {
          color: "#FFFFFF",
          enabled: true,
        },
      ],
      speed: 2.5,
      horizontalPressure: 3,
      verticalPressure: 4,
      waveFrequencyX: 2,
      waveFrequencyY: 3,
      waveAmplitude: 5,
      shadows: 5,
      highlights: 6,
      colorBrightness: 0.6,
      colorSaturation: 7,
      wireframe: false,
      colorBlending: 8,
      backgroundColor: "#003FFF",
      backgroundAlpha: 1,
      grainScale: 3,
      grainSparsity: 0.02,
      grainIntensity: 0.3,
      grainSpeed: 1,
      resolution: 1,
      yOffset: 0,
    };

    // Initialize neat gradient
    gradientRef.current = new NeatGradient({
      ref: canvasRef.current,
      ...config,
    });

    // Cleanup function
    return () => {
      if (gradientRef.current) {
        gradientRef.current.destroy?.();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{
        width: "100vw",
        height: "100vh",
        background: "#003FFF",
      }}
    />
  );
};

export default AnimatedGradientBackground;
