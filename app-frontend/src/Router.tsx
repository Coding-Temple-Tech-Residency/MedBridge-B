// src/Router.tsx
import { Routes, Route } from "react-router-dom";
import App from "./App";
import { AppLayout } from "./layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { Dashboard } from "./pages/Dashboard";
import { MedicalHistory } from "./pages/MedicalHistory";
import { UploadDocs } from "./pages/UploadDocs";
import { AuthContainer } from "./components/AuthContainer";

export const Router = () => {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<App />} />
      <Route path="/signin" element={<AuthContainer />} />

      {/* Protected app pages */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/medical-history" element={<MedicalHistory />} />
        <Route path="/upload-docs" element={<UploadDocs />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<App />} />
    </Routes>
  );
};
