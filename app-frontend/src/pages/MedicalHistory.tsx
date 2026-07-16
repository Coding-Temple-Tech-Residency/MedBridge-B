import { useState } from "react";
import "../main.css";
import "./MedicalHistory.css";

import { useTrustedContactsDomain } from "../hooks/useTrustedContactsDomain";
import { useProvidersDomain } from "../hooks/useProviderDomain";
import { useDocumentsDomain } from "../hooks/useDocumentsDomain";
import { useUserSettingsDomain } from "../hooks/useUserSettingsDomain";
import { useUserProfileDomain } from "../hooks/useUserProfileDomain";
import { useMedicationDomain } from "../hooks/useMedicationDomain";

import ProfileSidebar from "../components/ProfileSidebar";
import DocumentsTab from "../components/MedicalHistoryTabs/DocumentsTab";
import MedicationsTab from "../components/MedicalHistoryTabs/MedicationsTab";
import ChartsTab from "../components/MedicalHistoryTabs/ChartsTab";

import UserProfileModal from "../components/MedicalHistoryModals/EditProfileModal";
import TrustedContactModal from "../components/MedicalHistoryModals/EditContactModal";
import ProviderModal from "../components/MedicalHistoryModals/EditProviderModal";
import UserSettingsModal from "../components/MedicalHistoryModals/EditSettingsModal";
import { DeleteDocumentModal } from "../components/MedicalHistoryModals/DeleteDocumentModal";
import MedicationModal from "../components/MedicalHistoryModals/EditMedicationModal";
import AddMedicationModal from "../components/MedicalHistoryModals/AddMedicationModal";

import type {
  ProviderResponse,
  TrustedContactResponse,
} from "../types/features";
import type { DocumentResponse } from "../types/documents";
import type { MedicationResponse } from "../types/medication";

export const MedicalHistory = () => {

  // DOMAIN HOOKS
  const { data: profileDomain } = useUserProfileDomain();
  const { data: documentsDomain, actions: documentActions } =
    useDocumentsDomain();
  const { data: medicationsDomain } = useMedicationDomain();
  const { data: contactsDomain } = useTrustedContactsDomain();
  const { data: providersDomain } = useProvidersDomain();
  const { data: settingsDomain } = useUserSettingsDomain();

  // DATA
  const profile = profileDomain?.profile;
  const documents = documentsDomain?.documentList ?? [];
  const contacts = contactsDomain?.contactsList ?? [];
  const providers = providersDomain?.providersList ?? [];
  const settings = settingsDomain?.settings;

  const currentMedications = medicationsDomain?.current ?? [];
  const pastMedications = medicationsDomain?.past ?? [];

  // MODAL STATE
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] =
    useState<TrustedContactResponse | null>(null);

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] =
    useState<ProviderResponse | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<DocumentResponse | null>(null);

const [showAddModal, setShowAddModal] = useState(false);
const [showEditModal, setShowEditModal] = useState(false);
  const [editingMedication, setEditingMedication] =
    useState<MedicationResponse | null>(null);

const handleAddMedication = () => {
  setShowAddModal(true);
};

const handleEditMedication = (med: MedicationResponse | null) => {
  if (!med) return; // safety
  setEditingMedication(med);
  setShowEditModal(true);
};


  const [activeTab, setActiveTab] = useState<
    "documents" | "charts" | "medications"
  >("documents");

  return (
    <div className="medical-history-page">
      <ProfileSidebar
        profile={profile}
        contacts={contacts}
        providers={providers}
        settings={settings}
        onEditProfile={() => setShowProfileModal(true)}
        onEditContact={(c) => {
          setEditingContact(c);
          setShowContactModal(true);
        }}
        onEditProvider={() => {
          setEditingProvider(null);
          setShowProviderModal(true);
        }}
        onEditSettings={() => setShowSettingsModal(true)}
      />

      <main className="main-content">
        <h1 className="main-title">Medical History</h1>
        <p className="main-description">
          View your medical documents, charts, and medication history.
        </p>

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

        <div className="tab-content">
          {activeTab === "documents" && (
            <DocumentsTab
              documents={documents}
              onEditDocument={(doc) => {
                setEditingDocument(doc);
                setShowDocumentModal(true);
              }}
              onDeleteDocument={(id) => documentActions.deleteFile(id)}
            />
          )}

          {activeTab === "charts" && <ChartsTab />}

          {activeTab === "medications" && (
            <MedicationsTab
              current={currentMedications}
              past={pastMedications}
              onEditMedication={handleEditMedication}
              onAddMedication={handleAddMedication}
            />
          )}
        </div>
      </main>

      {/* MODALS */}
      {showProfileModal && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profile={profile}
        />
      )}

      {showContactModal && (
        <TrustedContactModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          mode={editingContact ? "edit" : "add"}
          contact={
            editingContact
              ? {
                  contact_id: editingContact.id,
                  contact_name: editingContact.contact_name,
                  contact_email: editingContact.contact_email,
                  access_level: Number(editingContact.access_level),
                }
              : undefined
          }
        />
      )}

      {showProviderModal && (
        <ProviderModal
          isOpen={showProviderModal}
          onClose={() => setShowProviderModal(false)}
          mode={editingProvider ? "edit" : "add"}
          provider={
            editingProvider
              ? {
                  provider_id: editingProvider.id,
                  name: editingProvider.name,
                  specialty: editingProvider.specialty ?? "",
                  phone: editingProvider.phone ?? "",
                  email: "", // FIXED: ProviderResponse has no email field
                }
              : undefined
          }
        />
      )}

      {showSettingsModal && (
        <UserSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={settings}
        />
      )}

      {showDocumentModal && editingDocument && (
        <DeleteDocumentModal
          documentName={editingDocument.file_name}
          onConfirm={() => {
            documentActions.deleteFile(editingDocument.document_id);
            setShowDocumentModal(false);
          }}
          onCancel={() => setShowDocumentModal(false)}
          isDeleting={false}
        />
      )}

      {showAddModal && (
        <AddMedicationModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && editingMedication && (
        <MedicationModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          mode="edit"
          medication={{
            med_id: editingMedication.id,
            name: editingMedication.name,
            dosage: editingMedication.dosage ?? "",
            frequency: editingMedication.frequency ?? "",
            start_date: editingMedication.start_date ?? "",
            is_active: editingMedication.is_active,
          }}
        />
      )}
    </div>
  );
};
