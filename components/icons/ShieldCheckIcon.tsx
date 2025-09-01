import React from 'react';

export const ShieldCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
            d="M9 12.75L11.25 15 15 9.75M12 21.75c2.435 0 4.817-.618 6.95-1.782a1.125 1.125 0 00.45-1.921V6.993a1.125 1.125 0 00-1.125-1.125H5.725a1.125 1.125 0 00-1.125 1.125v11.054a1.125 1.125 0 00.45 1.921C7.183 21.132 9.565 21.75 12 21.75z" 
        />
    </svg>
);
