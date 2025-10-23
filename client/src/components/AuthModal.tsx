import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);

  const handleLogin = (token: string, user: any) => {
    login(token, user);
    onClose();
    navigate('/dashboard');
  };

  const handleSignup = async (userData: any) => {
    const result = await signup(userData);
    if (result.success) {
      onClose();
      navigate('/dashboard');
    }
    return result;
  };

  const handleShowSignup = () => {
    setIsSignup(true);
  };

  const handleShowLogin = () => {
    setIsSignup(false);
  };

  const handleClose = () => {
    setIsSignup(false);
    onClose();
  };

  return (
    <>
      {isSignup ? (
        <SignupModal
          isOpen={isOpen}
          onClose={handleClose}
          onSignup={handleSignup}
        />
      ) : (
        <LoginModal
          isOpen={isOpen}
          onClose={handleClose}
          onLogin={handleLogin}
          onShowSignup={handleShowSignup}
        />
      )}
    </>
  );
};

export default AuthModal;
