import React from "react";
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
import SocketAndInternetManager from "./components/SocketAndInternetManager";
import InternetOrSocketDisconnectUI from "./components/InternetOrSocketDisconnectUI";
import CallManager from "./pages/callsSection/CallManager";
import { getSocket } from "./services/chat.service";

function App() {
  const { user } = useUserStore();
  return (
    <SocketAndInternetManager user={user}>
      {({
        isDisconnected,
        isInternetDisconnected,
        isReconnecting,
        handleReconnect,
      }) => (
        <div className="App">
          <InternetOrSocketDisconnectUI
            isDisconnected={isDisconnected && !isInternetDisconnected}
            isInternetDisconnected={isInternetDisconnected}
            onReconnect={handleReconnect}
            isReconnecting={isReconnecting}
          />
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
                    <>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/user-profile" element={<UserDetails />} />
                        <Route path="/status" element={<Status />} />
                        <Route path="/settings" element={<Setting />} />
                      </Routes>
                      {/* Global Call Manager - visible everywhere in the app */}
                      {user?._id && !isInternetDisconnected && (
                        <CallManager socket={getSocket()} />
                      )}
                    </>
                  </ProtectedRoutes>
                }
              />
            </Routes>
          </Router>
        </div>
      )}
    </SocketAndInternetManager>
  );
}

export default App;
