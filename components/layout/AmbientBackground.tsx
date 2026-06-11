"use client";

import { motion } from "motion/react";

export function AmbientBackground() {
  return (
    <>
      <div className="ambient-bg" />
      {/* Orange glow blob — top right */}
      <motion.div
        className="ambient-blob"
        style={{
          width: 600,
          height: 600,
          top: -200,
          right: -150,
          background: "radial-gradient(circle, rgba(242,116,5,0.06) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.08, 1], x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Teal glow blob — bottom left */}
      <motion.div
        className="ambient-blob"
        style={{
          width: 500,
          height: 500,
          bottom: -150,
          left: -100,
          background: "radial-gradient(circle, rgba(32,135,142,0.06) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.12, 1], x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </>
  );
}
