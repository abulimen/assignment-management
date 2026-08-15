import React from 'react';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'inverted';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showWordmark = true,
  size = 'md',
  variant = 'default',
}) => {
  const markDimensions = {
    sm: 'w-6 h-8 p-0.5',
    md: 'w-7 h-9 p-1',
    lg: 'w-9 h-11 p-1',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const isLightOnDark = variant === 'inverted';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Geometric Balance architectural mark */}
      <div
        className={`${markDimensions[size]} ${
          isLightOnDark ? 'bg-white' : 'bg-[#1A1A1B]'
        } flex items-end rounded-xs flex-shrink-0 transition-transform`}
      >
        <div className="w-full h-1/2 bg-[#0047FF] rounded-xs" />
      </div>

      {showWordmark && (
        <span
          className={`font-bold tracking-tight font-sans ${textSizes[size]} ${
            isLightOnDark ? 'text-white' : 'text-[#1A1A1B]'
          }`}
        >
          Draftly
        </span>
      )}
    </div>
  );
};

