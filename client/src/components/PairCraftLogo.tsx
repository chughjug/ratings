import React from 'react';

interface PairCraftLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const PairCraftLogo: React.FC<PairCraftLogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12', 
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  };

  const textSizeClasses = {
    sm: 'text-lg font-bold',
    md: 'text-2xl font-bold',
    lg: 'text-3xl font-bold', 
    xl: 'text-4xl font-bold'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Image with Modern Styling */}
      <div className="relative group">
        <div className="absolute inset-0 bg-white rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
        <img 
          src="/new-logo.png" 
          alt="PairCraft Logo" 
          className={`${sizeClasses[size]} object-contain relative z-10 drop-shadow-lg transition-transform group-hover:scale-105`}
        />
      </div>
      
      {/* Text with Modern Typography */}
      {showText && (
        <div className="flex flex-col">
          <span className={`text-black ${textSizeClasses[size]}`}>
            PairCraft
          </span>
          <span className={`text-gray-600 font-semibold tracking-wide ${size === 'sm' || size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-base'}`}>
            CHESS TOURNAMENTS
          </span>
        </div>
      )}
    </div>
  );
};

export default PairCraftLogo;
