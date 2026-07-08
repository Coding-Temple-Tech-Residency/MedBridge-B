import { FormFactory } from "./FormFactory";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect,type JSX } from "react";
import { useNavigate } from "react-router-dom"; 

type AuthOption = "login" | "registration";

export const AuthContainer = (): JSX.Element => {
  const [authOption, setAuthOption] = useState<AuthOption>("login");
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token !== null) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  // If user is already logged in and manually visits /login,
  // show the logout option instead of redirecting again.
  if (token) {
    return (
      <div className="auth-success">
        <h1 className="auth-success-title">You’re signed in</h1>
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
};;
