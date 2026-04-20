import React from "react";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <svg 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Pointed Arch / Shield Shape - Blue */}
      <path 
        d="M250 20C180 20 50 150 50 320C50 350 250 420 250 420C250 420 450 350 450 320C450 150 320 20 250 20Z" 
        stroke="#3ABEF9" 
        strokeWidth="12" 
        strokeLinecap="round"
        strokeLinejoin="round" 
      />
      
      {/* Open Book - Bottom */}
      <path 
        d="M100 370L250 310L400 370L400 390L250 330L100 390V370Z" 
        fill="white" 
        stroke="#A1A1AA" 
        strokeWidth="3"
      />
      <path d="M250 310V330" stroke="#A1A1AA" strokeWidth="2" />
      <path d="M120 375L240 325M380 375L260 325" stroke="#E4E4E7" strokeWidth="1" />

      {/* Center Emblem - Golden Arch */}
      <path 
        d="M250 160C220 160 210 180 210 210V260C210 290 220 310 250 310C280 310 290 290 290 260V210C290 180 280 160 250 160Z" 
        stroke="#F59E0B" 
        strokeWidth="10" 
        strokeLinejoin="round"
      />
      <path 
        d="M230 220H270M230 250H270" 
        stroke="#F59E0B" 
        strokeWidth="8" 
        strokeLinecap="round"
      />
      
      {/* Decorative Petals / Drops */}
      {/* Top Center */}
      <ellipse cx="250" cy="90" rx="8" ry="18" fill="#1D4ED8" />
      
      {/* Left Spray */}
      <ellipse cx="210" cy="110" rx="16" ry="7" fill="#FACC15" transform="rotate(-30 210 110)" />
      <ellipse cx="180" cy="140" rx="16" ry="7" fill="#BE185D" transform="rotate(-50 180 140)" />
      <ellipse cx="160" cy="180" rx="16" ry="7" fill="#3B82F6" transform="rotate(-70 160 180)" />
      
      {/* Right Spray */}
      <ellipse cx="290" cy="110" rx="16" ry="7" fill="#FACC15" transform="rotate(30 290 110)" />
      <ellipse cx="320" cy="140" rx="16" ry="7" fill="#BE185D" transform="rotate(50 320 140)" />
      <ellipse cx="340" cy="180" rx="16" ry="7" fill="#3B82F6" transform="rotate(70 340 180)" />

      {/* Middle Spray */}
      <ellipse cx="230" cy="145" rx="14" ry="6" fill="#EF4444" transform="rotate(-10 230 145)" />
      <ellipse cx="270" cy="145" rx="14" ry="6" fill="#EF4444" transform="rotate(10 270 145)" />
    </svg>
  );
}
