import React from 'react';

// Combination of text lines and a circular arrow "replace" symbol
export const TextReplaceIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h10M3 10h10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.75l-1.125 1.125 1.125 1.125" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.125 20.25a6.75 6.75 0 100-13.5H15" />
  </svg>
);