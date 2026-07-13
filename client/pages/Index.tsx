import { useAppContext } from '@/context/AppContext';
import { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import UserPage from './UserPage';

type PageState = 'landing' | 'login' | 'user';

export default function Index() {
  const { showUserPage, setShowUserPage, setIsLoggedIn, isLoggedIn } = useAppContext();
  const [currentPage, setCurrentPage] = useState<PageState>('landing');

  // Handle logout - redirect to landing
  useEffect(() => {
    if (!isLoggedIn && currentPage === 'user') {
      setCurrentPage('landing');
    }
  }, [isLoggedIn, currentPage]);

  const handleCreateSchedule = () => {
    setCurrentPage('login');
  };

  const handleLoginSuccess = (userData: any) => {
    setIsLoggedIn(true);
    setShowUserPage(true);
    setCurrentPage('user');
  };

  const handleLoginCancel = () => {
    setCurrentPage('landing');
  };

  if (currentPage === 'user' && isLoggedIn) {
    return <UserPage />;
  }

  if (currentPage === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} onCancel={handleLoginCancel} />;
  }

  return <LandingPage onCreateSchedule={handleCreateSchedule} />;
}
