import { FormFactory } from "./FormFactory";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";


type AuthOption = "login" | "registration"
export const AuthContainer = () => {
    const [authOption, setAuthOption] = useState<AuthOption>("login");
    const { token, logout } = useAuth();
  




    return (
        <>
            {token === null &&

                <div className="auth-container" style={{ padding: "10px", display: "flex", flexDirection: "column", alignItems: "center" }}>

                    {/* 1. The Sliding Toggle Track Container */}
                    <div
                        className="toggle-track"
                        style={{
                            position: "relative",
                            display: "flex",
                            width: "260px",
                            height: "40px",
                            backgroundColor: "#e4e4e7", // Light gray background track
                            borderRadius: "20px",
                            padding: "4px",
                            marginBottom: "32px",
                            userSelect: "none"
                        }}
                    >
                        {/* 2. The Physical Sliding Pill (The Background Accent) */}
                        <div
                            className="sliding-pill"
                            style={{
                                position: "absolute",
                                top: "4px",
                                bottom: "4px",
                                // Takes up exactly half the width minus padding
                                width: "calc(50% - 4px)",
                                backgroundColor: "#3ABFBF", // White pill
                                borderRadius: "16px",
                                boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.1)",
                                // The magic line: slides left based on active state
                                left: authOption === "login" ? "4px" : "calc(50%)",
                                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)" // Butter-smooth glide
                            }}
                        />

                        {/* 3. Interactive Text Layer (Sitting safely on top of the pill via z-index) */}
                        <button
                            onClick={() => setAuthOption("login")}
                            style={{
                                flex: 1,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontFamily: "sans-serif",
                                fontWeight: "600",
                                zIndex: 1,
                                color: authOption === "login" ? "#09090b" : "#71717a", // Dark text when active
                                transition: "color 0.25s ease"
                            }}
                        >
                            Sign-In
                        </button>

                        <button
                            onClick={() => setAuthOption("registration")}
                            style={{
                                flex: 1,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontFamily: "sans-serif",
                                fontWeight: "600",
                                zIndex: 1,
                                color: authOption === "registration" ? "#09090b" : "#71717a",
                                transition: "color 0.25s ease"
                            }}
                        >
                            Create Account
                        </button>
                    </div>

                    {/* 4. Dynamic Form Conductor */}
                    <div style={{ width: "100%", maxWidth: "400px" }}>
                        <FormFactory config={authOption} />
                    </div>
                </div>
            }
            {token !== null &&
                <div>
                    <h1>Login Successful</h1>
                    <button onClick={logout}>Logout</button>

                </div>}
        </>
    );

};