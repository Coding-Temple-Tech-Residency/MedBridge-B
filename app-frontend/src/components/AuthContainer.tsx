import { FormFactory } from "./FormFactory";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin, useRegister } from "../api/auth.queries";
import { useModal } from "../context/ModalContext";

type AuthOption = "login" | "registration";


export const AuthContainer = (): JSX.Element => {
  const [authOption, setAuthOption] = useState<AuthOption>("login");
  const { token } = useAuth();
  const navigate = useNavigate();
  const { closeModal } = useModal();

  // 1. Pulled mutations out of the factory into the brain layer
  const {
    mutate: login,
    isPending: isLogingIn,
    error: loginError,
  } = useLogin();

  const {
    mutate: register,
    isPending: isRegistering,
    error: registerError,
  } = useRegister();

  // 2. Keep the exact variable matching names for resolution
  const activeError = authOption === "login" ? loginError : registerError;
  const isLoading = authOption === "login" ? isLogingIn : isRegistering;

  useEffect(() => {
    if (token !== null) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  if (token) {
    return (
      <div className="auth-success">
        <h1 className="auth-success-title">You’re signed in</h1>
      </div>
    );
  }

  // 3. Unified submit handler mapping form data to the correct query pipeline
  const handleSubmit = (values: Record<string, string>) => {
    if (authOption === "login") {
      login(values as any);
    } else {
      register(values as any, {
        onSuccess: () => closeModal(),
      });
    }
  };

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
        {/* Feed the universal factory system with dynamic control bindings */}
        <FormFactory
          config={authOption}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          activeError={activeError}
          submitLabel={authOption === "login" ? "Sign In" : "Register"}
        />
      </div>
    </div>
  );
};







//!

// export const AuthContainer = (): JSX.Element => {
//   const [authOption, setAuthOption] = useState<AuthOption>("login");
//   const { token } = useAuth();
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (token !== null) {
//       navigate("/dashboard");
//     }
//   }, [token, navigate]);

//   // If user is already logged in and manually visits /login,
//   // show the logout option instead of redirecting again.
//   if (token) {
//     return (
//       <div className="auth-success">
//         <h1 className="auth-success-title">You’re signed in</h1>
//       </div>
//     );
//   }

//   return (
//     <div className="auth-container">
//       {/* Toggle Track */}
//       <div className="toggle-track">
//         <div
//           className={`sliding-pill ${authOption === "login" ? "pill-left" : "pill-right"}`}
//         />

//         <button
//           className={`toggle-btn ${authOption === "login" ? "active" : ""}`}
//           onClick={() => setAuthOption("login")}
//         >
//           Sign-In
//         </button>

//         <button
//           className={`toggle-btn ${authOption === "registration" ? "active" : ""}`}
//           onClick={() => setAuthOption("registration")}
//         >
//           Create Account
//         </button>
//       </div>

//       <div className="auth-form-wrapper">
//         <FormFactory config={authOption} />
//       </div>
//     </div>
//   );
// };;
