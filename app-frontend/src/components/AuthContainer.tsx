import { FormFactory } from "./FormFactory";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useLogout } from "../api/auth.queries";

type AuthOption = "login" | "registration";

export const AuthContainer = (): JSX.Element => {
  const [authOption, setAuthOption] = useState<AuthOption>("login");
  const { token, logout } = useAuth();

  if (token !== null) {
    return (
      <div className="auth-success">
        <h1 className="auth-success-title">Login Successful</h1>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Toggle Track */}
      <div className="toggle-track">
        <div
          className={`sliding-pill ${authOption === "login" ? "pill-left" : "pill-right"}`}
        />

        <button
          className={`toggle-btn ${authOption === "login" ? "active" : ""}`}
          onClick={() => setAuthOption("login")}
        >
          Sign-In
        </button>

        <button
          className={`toggle-btn ${authOption === "registration" ? "active" : ""}`}
          onClick={() => setAuthOption("registration")}
        >
          Create Account
        </button>
      </div>

      <div className="auth-form-wrapper">
        <FormFactory config={authOption} />
      </div>
    </div>
  );
};
