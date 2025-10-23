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
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl', 
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Logo Image */}
      <img 
        src="/paircraft-logo.png" 
        alt="PairCraft Logo" 
        className={`${sizeClasses[size]} object-contain`}
      />
      
      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-gray-800 ${textSizeClasses[size]}`}>
            PairCraft
          </span>
          <span className={`text-xs text-gray-600 font-medium ${size === 'sm' ? 'hidden' : ''}`}>
            CHESS TOURNAMENT
          </span>
          <span className={`text-xs text-gray-600 font-medium ${size === 'sm' ? 'hidden' : ''}`}>
            PAIRING SYSTEM
          </span>
        </div>
      )}
    </div>
  );
};

export default PairCraftLogo;
