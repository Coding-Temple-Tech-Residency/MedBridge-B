// src/pages/MedicalHistory.tsx
import { useState } from "react";
import "../main.css";
import "./MedicalHistory.css";

import { useTrustedContactsDomain } from "../hooks/useTrustedContactsDomain";
import { useProvidersDomain } from "../hooks/useProviderDomain";
import { useDocumentsDomain } from "../hooks/useDocumentsDomain";
import { useUserSettingsDomain } from "../hooks/useUserSettingsDomain";
import { useUserProfileDomain } from "../hooks/useUserProfileDomain";
import { useMedicationDomain } from "../hooks/useMedicationDomain";
//import { useChartsDomain } from "../hooks/useChartsDomain";

import type { UserProfile } from "../types/auth";
import type { DocumentResponse } from "../types/documents";
import type {
  TrustedContactResponse,
  ProviderResponse,
} from "../types/features";
import type { MedicationResponse } from "../types/medication";

export const MedicalHistory = () => {
  const user_id = "demo-user-id"; // TODO: replace with real auth user_id

  // DOMAIN HOOKS
  const { data: profileDomain } = useUserProfileDomain(user_id);
  const { data: documentsDomain } = useDocumentsDomain();
  const { data: medicationsDomain } = useMedicationDomain(user_id);
  //const { data: chartsDomain } = useChartsDomain(user_id);
  const { data: contactsDomain } = useTrustedContactsDomain();
  const { data: providersDomain } = useProvidersDomain();
  const { data: settingsDomain } = useUserSettingsDomain(user_id);

  // TYPED DATA EXTRACTION
  const profile = profileDomain?.profile as UserProfile | undefined;

  const documents =
    (documentsDomain?.documentList as DocumentResponse[] | undefined) ?? [];

  const contacts =
    (contactsDomain?.contactsList as TrustedContactResponse[] | undefined) ??
    [];

  const providers =
    (providersDomain?.providersList as ProviderResponse[] | undefined) ?? [];

  const settings = settingsDomain?.data?.settings;
  
  // Medications domain sorts data into current/past arrays
  const currentMedications =
    (medicationsDomain?.current as MedicationResponse[] | undefined) ?? [];
  const pastMedications =
    (medicationsDomain?.past as MedicationResponse[] | undefined) ?? [];

  // Charts endpoint still in development – keep placeholder
  //const charts =
    //(chartsDomain?.charts as unknown as MedicationResponse[] | undefined) ?? [];

  const [activeTab, setActiveTab] = useState<
    "documents" | "charts" | "medications"
  >("documents");

  return (
    <div className="medical-history-page">
      {/* PROFILE SIDEBAR */}
      <aside className="sidebar">
        <h1 className="sidebar-title">Profile</h1>

        <div className="sidebar-section">
          <h2>User Information</h2>
          <p>
            Name: {profile?.full_name ?? "Unknown"} <br />
            Email: {profile?.email ?? "Unknown"} <br />
            Preferred Language: {profile?.preferred_language ?? "Unknown"}{" "}
            <br />
            Explanation Level: {profile?.explanation_level ?? "Unknown"}
          </p>
        </div>

        <div className="sidebar-section">
          <h2>Trusted Contacts</h2>
          {contacts.length ? (
            contacts.map((c) => (
              <p key={c.id}>
                {c.contact_name} ({c.contact_email}) — {c.access_level}
              </p>
            ))
          ) : (
            <p>No trusted contacts added yet.</p>
          )}
        </div>

        <div className="sidebar-section">
          <h2>Medical Contacts</h2>
          {providers.length ? (
            providers.map((p) => (
              <p key={p.id}>
                {p.specialty ?? "General"}: {p.name}
              </p>
            ))
          ) : (
            <p>No providers on file.</p>
          )}
        </div>

        <div className="sidebar-section">
          <h2>Data Sharing</h2>
          <p>
            Trusted Contacts Sharing:{" "}
            {settings?.allow_trusted_contacts ? "Yes" : "No"}
            <br />
            MyChart Integration:{" "}
            {settings?.allow_mychart_integration ? "Enabled" : "Disabled"}
            <br />
            Reminders: {settings?.enable_reminders ? "On" : "Off"}
          </p>
        </div>

        <div className="sidebar-section">
          <h2>General Settings</h2>
          <p>
            Notifications: {settings?.enable_reminders ? "Yes" : "No"} <br />
            Preferred Language: {profile?.preferred_language ?? "English"}{" "}
            <br />
            Delete Account: No
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <h1 className="main-title">Medical History</h1>
        <p className="main-description">
          View your medical documents, charts, and medication history.
        </p>

        {/* TAB BUTTONS */}
        <div className="tab-buttons">
          <button
            className={activeTab === "documents" ? "active" : ""}
            onClick={() => setActiveTab("documents")}
          >
            Documents
          </button>

          <button
            className={activeTab === "charts" ? "active" : ""}
            onClick={() => setActiveTab("charts")}
          >
            Charts
          </button>

          <button
            className={activeTab === "medications" ? "active" : ""}
            onClick={() => setActiveTab("medications")}
          >
            Medications
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="tab-content">
          {/* DOCUMENTS TAB */}
          {activeTab === "documents" && (
            <div>
              <h2>Uploaded Documents</h2>
              {documents.length ? (
                documents.map((doc) => (
                  <p key={doc.document_id}>
                    {doc.file_name} — {doc.status} (
                    {new Date(doc.uploaded_at).toLocaleDateString()})
                  </p>
                ))
              ) : (
                <p>No documents uploaded yet.</p>
              )}
            </div>
          )}

          {/* CHARTS TAB */}
          {activeTab === "charts" && (
            <div>
              <h2>Medical Charts</h2>
              <p>
                Charts are not yet available. This feature will be enabled once
                the chart endpoints are ready.
              </p>
            </div>
          )}

          {/* MEDICATIONS TAB */}
          {activeTab === "medications" && (
            <div>
              <h2>Medication History</h2>

              <h3>Current Medications</h3>
              {currentMedications.length ? (
                currentMedications.map((med) => (
                  <p key={med.id}>
                    {med.name} — {med.dosage ?? med.dose ?? "Unknown dose"},{" "}
                    {med.frequency ?? "Unknown frequency"} (
                    {med.is_active ? "Active" : "Inactive"})
                  </p>
                ))
              ) : (
                <p>No current medications.</p>
              )}

              <h3>Past Medications</h3>
              {pastMedications.length ? (
                pastMedications.map((med) => (
                  <p key={med.id}>
                    {med.name} — {med.dosage ?? med.dose ?? "Unknown dose"}{" "}
                    {med.end_date
                      ? `(Ended: ${new Date(
                          med.end_date,
                        ).toLocaleDateString()})`
                      : "(End date unknown)"}
                  </p>
                ))
              ) : (
                <p>No past medications.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
