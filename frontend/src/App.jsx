import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Login from "./pages/userLogin/Login";
import { ProtectedRoutes } from "./protectedRoutes/protectedRoutes";

function App() {
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
          <Route path="/user-login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoutes>
                <Routes>
                  <Route path="/" element={<h1>Welcome to the App</h1>} />
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
