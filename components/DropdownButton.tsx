

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface DropdownOption {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    disabled?: boolean;
}

interface DropdownButtonProps {
    label: string;
    options: DropdownOption[];
    buttonStyle: string;
    disabled?: boolean;
    icon?: React.ElementType;
}

const MotionDiv = motion.div as any;

export const DropdownButton = ({ label, options, buttonStyle, disabled, icon: ButtonIcon }: DropdownButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOptionClick = (onClick: () => void) => {
        onClick();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={buttonStyle}
            >
                {ButtonIcon && <ButtonIcon className="h-5 w-5" />}
                <span>{label}</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    >
                        <div className="py-1">
                            {options.map(({ label, icon: Icon, onClick, disabled: optionDisabled }) => (
                                <button
                                    key={label}
                                    onClick={() => handleOptionClick(onClick)}
                                    disabled={optionDisabled}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                >
                                    <Icon className="h-5 w-5 text-gray-500" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};