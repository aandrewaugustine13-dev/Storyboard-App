
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-none font-semibold transition-all duration-300 flex items-center justify-center gap-2 tracking-widest uppercase text-xs";
  
  const variants = {
    primary: "bg-red-950 text-red-200 hover:bg-red-900 border border-red-800 shadow-[0_0_15px_rgba(153,27,27,0.2)]",
    secondary: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700",
    outline: "bg-transparent border border-red-900/50 text-red-500 hover:border-red-500",
    danger: "bg-black text-red-600 border border-red-900 hover:bg-red-950/20"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};
