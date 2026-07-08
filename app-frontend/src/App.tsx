import { type ReactNode } from "react";
import { AuthContainer } from "./components/AuthContainer";
import { useModal } from "./context/ModalContext";
import "./main.css";
import { ApiSandbox } from "./components/ApiSandbox";
import { UploadDocuments } from "./components/UploadDocument";
import { UploadDocs } from "./pages/UploadDocs";

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

      <div className="app-content">
        <h2 className="app-subtitle">Your Health, Your Data</h2>
        <p className="app-description">
          Your medical information should be easy to understand. MedBridge turns
          complex healthcare documents into clear, everyday language so you can
          make confident decisions about your care. Upload records, view your
          medical history, and stay organized — all in one secure, intuitive
          dashboard designed to help you feel informed, supported, and in
          control.
        </p>
      </div>

      <main className="action-row">
        <button type="button" className="login-btn" onClick={handleOpenAuth}>
          🔑 Sign In
        </button>

        <UploadDocs />
        


      </main>
    </div>
  );
}
