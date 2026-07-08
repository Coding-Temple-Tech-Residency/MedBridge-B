// src/components/NavBar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useLogout } from "../api/auth.queries";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import "./NavBar.css";

export const NavBar = (): ReactNode => {
  const { token } = useAuth();
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsOpen(false);
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <img src="/logo.png" alt="MedBridge logo" className="nav-logo" />
      </div>

      <div className="nav-right desktop-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/medical-history"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          Medical History
        </NavLink>

        <NavLink
          to="/upload-docs"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          Upload Docs
        </NavLink>

        {token && (
          <span className="nav-item logout-link" onClick={handleLogout}>
            Logout
          </span>
        )}
      </div>

      {/* Hamburger Icon */}
      <div className="hamburger" onClick={() => setIsOpen(!isOpen)}>
        <span className={isOpen ? "bar open" : "bar"}></span>
        <span className={isOpen ? "bar open" : "bar"}></span>
        <span className={isOpen ? "bar open" : "bar"}></span>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="mobile-menu">
          <NavLink
            to="/dashboard"
            className="mobile-item"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/medical-history"
            className="mobile-item"
            onClick={() => setIsOpen(false)}
          >
            Medical History
          </NavLink>

          <NavLink
            to="/upload-docs"
            className="mobile-item"
            onClick={() => setIsOpen(false)}
          >
            Upload Docs
          </NavLink>

          {token && (
            <span className="mobile-item logout-link" onClick={handleLogout}>
              Logout
            </span>
          )}
        </div>
      )}
    </nav>
  );
};
