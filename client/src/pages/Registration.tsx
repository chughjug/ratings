import React from 'react';
import { useParams } from 'react-router-dom';
import RegistrationFormWithPayment from '../components/RegistrationFormWithPayment';

const Registration: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  if (!tournamentId) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">Invalid tournament ID.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <RegistrationFormWithPayment tournamentId={tournamentId} />
    </div>
  );
};

export default Registration;


