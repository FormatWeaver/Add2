import React from 'react';

export const DocumentSearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        {...props}
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12h3m-3 3h3m-7.5 3H5.625c-.621 0-1.125-.504-1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125h9.375a3.375 3.375 0 013.375 3.375v9.375a3.375 3.375 0 01-3.375 3.375h-1.5" 
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.25 14.25a3.75 3.75 0 10-7.5 0 3.75 3.75 0 007.5 0z"
        />
    </svg>
);
