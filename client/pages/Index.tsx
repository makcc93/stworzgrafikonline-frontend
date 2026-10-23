import {
  useState,
  useEffect,
} from "react";

import { toast } from "sonner";

import { useAppContext } from "@/context/AppContext";
import {
  storageUtils,
  STORAGE_KEYS,
} from "@/utils/storage";

import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import UserPage from "./UserPage";

type PageState =
  | "landing"
  | "login"
  | "user";

export default function Index() {
  const {
    showUserPage,
    setShowUserPage,
    setIsLoggedIn,
    isLoggedIn,
  } = useAppContext();

  const [
    currentPage,
    setCurrentPage,
  ] = useState<PageState>(() =>
    isLoggedIn && showUserPage
      ? "user"
      : "landing"
  );

  useEffect(() => {
    const notice =
      storageUtils.get<string>(
        STORAGE_KEYS.SESSION_NOTICE,
        "session"
      );

    if (!notice) {
      return;
    }

    storageUtils.remove(
      STORAGE_KEYS.SESSION_NOTICE,
      "session"
    );

    if (notice === "demo-expired") {
      toast.info(
        "Wersja demonstracyjna wygasła. Możesz uruchomić nowe demo.",
        {
          id: "demo-expired",
        }
      );

      return;
    }

    if (
      notice === "session-expired"
    ) {
      toast.error(
        "Sesja wygasła. Zaloguj się ponownie.",
        {
          id: "session-expired",
        }
      );
    }
  }, []);

  useEffect(() => {
    if (
      !isLoggedIn &&
      currentPage === "user"
    ) {
      setCurrentPage("landing");
    }
  }, [
    isLoggedIn,
    currentPage,
  ]);

  const handleCreateSchedule = () => {
    setCurrentPage("login");
  };

  const handleLoginSuccess = (
    userData: any
  ) => {
    setIsLoggedIn(true);
    setShowUserPage(true);
    setCurrentPage("user");
  };

  const handleLoginCancel = () => {
    setCurrentPage("landing");
  };

  if (
    currentPage === "user" &&
    isLoggedIn
  ) {
    return <UserPage />;
  }

  if (currentPage === "login") {
    return (
      <LoginPage
        onLoginSuccess={
          handleLoginSuccess
        }
        onCancel={
          handleLoginCancel
        }
      />
    );
  }

  return (
    <LandingPage
      onCreateSchedule={
        handleCreateSchedule
      }
    />
  );
}
