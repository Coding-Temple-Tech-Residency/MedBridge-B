import { type ReactNode } from "react";
import { AuthContainer } from "./components/AuthContainer";
import { useModal } from "./context/ModalContext";
import "./main.css";

export default function App(): ReactNode {
  const { openModal } = useModal();

  const handleOpenAuth = (): void => {
    const content: ReactNode = <AuthContainer />;
    openModal(content);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Welcome to</h1>
        <img src="/logo.png" alt="MedBridge logo" className="app-logo" />
      </header>

      <main className="action-row">
        <button type="button" className="login-btn" onClick={handleOpenAuth}>
          🔑 Sign In
        </button>
      </main>
    </div>
  );
}
