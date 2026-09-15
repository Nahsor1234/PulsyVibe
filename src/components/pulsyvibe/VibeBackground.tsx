"use client";
import { memo } from "react";
import { motion } from "framer-motion";
export const VibeBackground = memo(({ isPlaying = false }: { isPlaying?: boolean }) => (
  <div className="fixed inset-0 -z-10 bg-background overflow-hidden pointer-events-none transform-gpu">
    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full" style={{background:"radial-gradient(circle, hsl(var(--primary) / .30) 0%, transparent 70%)",filter:"blur(40px)"}} />
    <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full" style={{background:"radial-gradient(circle, hsl(var(--accent) / .15) 0%, transparent 70%)",filter:"blur(60px)"}} />
    <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full" animate={{scale:isPlaying?1.3:1.1}} transition={{duration:2,ease:"easeOut"}} style={{background:"radial-gradient(circle, hsl(var(--primary) / .10) 0%, transparent 80%)"}} />
    <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at center, transparent 30%, hsl(var(--background) / .6) 70%, hsl(var(--background)) 100%)"}} />
  </div>
));
VibeBackground.displayName="VibeBackground";
