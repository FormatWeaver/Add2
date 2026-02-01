
import React from 'react';

const DARK_SLATE = '#1e293b'; // slate-800
const HIGHLIGHTER_AMBER = '#f59e0b'; // accent-500

export const Logo = (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className={`flex items-center gap-0 ${props.className || ''}`}>
        <svg height="40" viewBox="0 0 260 42" xmlns="http://www.w3.org/2000/svg" aria-label="AddendaConform Logo">
            {/* 
              Iconic 'A' is now integrated into the word "Addenda".
              It replaces the standard 'A' character.
            */}
            <g transform="translate(0, 3)" strokeLinecap="round" strokeLinejoin="round">
                {/* The 'A' shape, slightly condensed to better match font metrics */}
                <path 
                    d="M4 36 L15 4 L26 36" 
                    fill="none" 
                    stroke={DARK_SLATE} 
                    strokeWidth="6" 
                />
                {/* The checkmark crossbar, adjusted to match the app's standard checkmark style */}
                <path 
                    d="M9 25 L13 29 L23 19" 
                    fill="none" 
                    stroke={HIGHLIGHTER_AMBER} 
                    strokeWidth="5" 
                />
            </g>

            {/* 
              Text part of the logo, starting right after the iconic 'A'.
              The word is split into 'ddenda' and 'Conform'.
            */}
            <text x="28" y="30" fontFamily="Inter, sans-serif" fontSize="24">
                <tspan fontWeight="800" fill={DARK_SLATE}>ddenda</tspan>
                <tspan fontWeight="600" fill={HIGHLIGHTER_AMBER}>Conform</tspan>
            </text>
        </svg>
    </div>
);
