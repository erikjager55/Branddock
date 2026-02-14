import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

interface CustomConfettiProps {
  active: boolean;
  numberOfPieces?: number;
  duration?: number;
}

const COLORS = ['#1FD1B2', '#3B82F6', '#EC4899', '#F97316', '#84CC16'];

export function CustomConfetti({ 
  active, 
  numberOfPieces = 50,
  duration = 3000 
}: CustomConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = Array.from({ length: numberOfPieces }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // Percentage
      y: -10,
      rotation: Math.random() * 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4, // 4-12px
      velocityX: (Math.random() - 0.5) * 100, // -50 to 50
      velocityY: Math.random() * 50 + 50, // 50-100 (downward)
      rotationSpeed: (Math.random() - 0.5) * 360, // -180 to 180 deg/s
    }));

    setPieces(newPieces);

    // Clear after duration
    const timeout = setTimeout(() => {
      setPieces([]);
    }, duration);

    return () => clearTimeout(timeout);
  }, [active, numberOfPieces, duration]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{
            x: `${piece.x}%`,
            y: piece.y,
            rotate: piece.rotation,
            opacity: 1,
          }}
          animate={{
            x: `${piece.x + piece.velocityX * 0.1}%`,
            y: '120%',
            rotate: piece.rotation + piece.rotationSpeed * 3,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: duration / 1000,
            ease: [0.25, 0.46, 0.45, 0.94], // Cubic bezier for realistic fall
          }}
          style={{
            position: 'absolute',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
          }}
        />
      ))}
    </div>
  );
}
