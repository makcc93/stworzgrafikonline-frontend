import { useAppContext } from '@/context/AppContext';
import { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import UserPage from './UserPage';

type PageState = 'landing' | 'login' | 'user';

export default function Index() {
  const { showUserPage, setShowUserPage, setIsLoggedIn, isLoggedIn } = useAppContext();
  // WAŻNE: isLoggedIn (localStorage) i showUserPage (sessionStorage) są celowo
  // persystowane w AppContext właśnie po to, żeby przetrwać odświeżenie strony.
  // Musimy je odczytać już w inicjalizatorze useState — bez tego currentPage
  // zawsze startowało od 'landing' przy każdym mount (czyli też po F5), mimo
  // że użytkownik był cały czas zalogowany, i strona "resetowała się" do
  // ekranu startowego zamiast wracać tam, gdzie użytkownik był.
  const [currentPage, setCurrentPage] = useState<PageState>(() =>
    isLoggedIn && showUserPage ? 'user' : 'landing'
  );

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
