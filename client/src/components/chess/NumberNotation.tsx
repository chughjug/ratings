import React from 'react';

interface NumberNotationProps {
  label: string;
  isMainBoxColor: boolean;
}

const NumberNotation: React.FC<NumberNotationProps> = ({ label, isMainBoxColor }) => {
  return (
    <div
      className={`absolute left-1 top-1 text-xs font-semibold ${
        isMainBoxColor ? 'text-white' : 'text-black'
      }`}
    >
      {label}
    </div>
  );
};

export default NumberNotation;










