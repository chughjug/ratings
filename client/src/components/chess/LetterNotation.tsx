import React from 'react';

interface LetterNotationProps {
  label: string;
  isMainBoxColor: boolean;
}

const LetterNotation: React.FC<LetterNotationProps> = ({ label, isMainBoxColor }) => {
  return (
    <div
      className={`absolute bottom-1 right-1 text-xs font-semibold ${
        isMainBoxColor ? 'text-white' : 'text-black'
      }`}
    >
      {label}
    </div>
  );
};

export default LetterNotation;





