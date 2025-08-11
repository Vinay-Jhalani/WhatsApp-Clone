import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Login from "./pages/userLogin/Login";
import {
  ProtectedRoutes,
  PublicRoutes,
} from "./protectedRoutes/protectedRoutes";
import HomePage from "./components/HomePage";
import UserDetails from "./components/UserDetails";
import Status from "./pages/statusSection/Status";
import Setting from "./pages/settingSection/Setting";
import useUserStore from "./store/useUserStore";
import { disconnectSocket, initializeSocket } from "./services/chat.service";
import { useChatStore } from "./store/useChatStore";

function App() {
  const { user } = useUserStore();
  const { setCurrentUser, initializeSocketListeners, cleanup } = useChatStore();

  useEffect(() => {
    if (user?._id) {
      const socket = initializeSocket();

      if (socket) {
        setCurrentUser(user);
        initializeSocketListeners();
      }
    }
    return () => {
      cleanup();
      disconnectSocket();
    };
  }, [user, setCurrentUser, initializeSocketListeners]);

  return (
    <div className="App">
      <Router>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              zIndex: 9999,
            },
          }}
        />
        <Routes>
          <Route
            path="/user-login"
            element={
              <PublicRoutes>
                <Login />
              </PublicRoutes>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoutes>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/user-profile" element={<UserDetails />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/settings" element={<Setting />} />
                </Routes>
              </ProtectedRoutes>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
