import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  className = '',
  disabled = false
}) => {
  const baseStyles = "px-8 py-3 rounded-full font-bold uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 shadow-lg border-2";
  
  const variants = {
    primary: "bg-cyan-500 border-cyan-400 text-black hover:bg-cyan-400 hover:shadow-cyan-500/50",
    secondary: "bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:shadow-slate-500/50",
    danger: "bg-red-600 border-red-500 text-white hover:bg-red-500 hover:shadow-red-500/50"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};