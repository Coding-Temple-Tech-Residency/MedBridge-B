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
import { DeleteConfirm } from "../components/DeleteConfirm";


// NOTE: Re-add your actual imports here (domain hooks, modal components, types, etc.)
// This block assumes the following are imported, based on usage in the file:
// useState, useUserProfileDomain, useDocumentsDomain, useMedicationDomain,
// useTrustedContactsDomain, useProvidersDomain, useUserSettingsDomain,
// ProfileSidebar, DocumentsTab, ChartsTab, MedicationsTab,
// UserProfileModal, TrustedContactModal, ProviderModal, UserSettingsModal,
// DeleteDocumentModal, AddMedicationModal, MedicationModal,
// DeleteConfirm  <-- NEW, make sure this is imported from wherever it lives
// MedicationResponse, DocumentResponse, TrustedContactResponse, ProviderResponse types

export const MedicalHistory = () => {

  // DOMAIN HOOKS
  const { data: profileDomain } = useUserProfileDomain();
  const { data: documentsDomain, actions: documentActions } =
    useDocumentsDomain();
  const { data: medicationsDomain, actions: medicationActions } =
    useMedicationDomain();
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

  // DOCUMENT DELETE STATE
  // Replaces the old (broken) showDocumentModal / editingDocument pair.
  // Truthiness of deletingDocument itself controls whether the confirm modal is shown.
  const [deletingDocument, setDeletingDocument] =
    useState<DocumentResponse | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMedication, setEditingMedication] =
    useState<MedicationResponse | null>(null);

  // MEDICATION DELETE STATE
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStopMedication = (med: MedicationResponse) => {
    medicationActions.modifyMedication(med.id, {
      is_active: false,
      end_date: new Date().toISOString().split("T")[0],
    });
  };

  const handleStartMedication = (med: MedicationResponse) => {
    medicationActions.modifyMedication(med.id, {
      is_active: true,
      end_date: null,
    });
  };

  const handleDeleteMedication = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      medicationActions.removeMedication(deletingId);
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingId(null);
  };

  // DOCUMENT DELETE HANDLERS
  const handleDeleteDocument = (id: string) => {
    const doc = documents.find((d) => d.document_id === id)
    if(doc){
      setDeletingDocument(doc);
    }
  };

  const handleConfirmDeleteDocument = () => {
    if (deletingDocument) {
      documentActions.deleteFile(deletingDocument.document_id);
      setDeletingDocument(null);
    }
  };

  const handleCancelDeleteDocument = () => {
    setDeletingDocument(null);
  };

  const mapAccessLevel = (level: string): "read" | "full" => {
    return level === "read" ? "full" : "read";
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
        onEditProvider={(provider) => {
          setEditingProvider(provider ?? null);
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
         {deletingId && (
        <DeleteConfirm
          id={deletingId}
          type="medication"
          onCancel={handleCancelDelete}
          onDeleteConfirm={handleConfirmDelete}
        />
      )}

          {activeTab === "documents" && (
            <DocumentsTab
              documents={documents}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === "charts" && <ChartsTab />}

          {activeTab === "medications" && (
            <MedicationsTab
              current={currentMedications}
              past={pastMedications}
              onEditMedication={(med) => {
                setEditingMedication(med);
                setShowEditModal(true);
              }}
              onAddMedication={() => setShowAddModal(true)}
              onStopMedication={handleStopMedication}
              onStartMedication={handleStartMedication}
              onDeleteMedication={handleDeleteMedication}
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
                access_level: mapAccessLevel(editingContact.access_level),
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

      {deletingDocument && (
        <DeleteDocumentModal
          documentName={deletingDocument.file_name}
          onConfirm={handleConfirmDeleteDocument}
          onCancel={handleCancelDeleteDocument}
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
            id: editingMedication.id,
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




// export const MedicalHistory = () => {

//   // DOMAIN HOOKS
//   const { data: profileDomain } = useUserProfileDomain();
//   const { data: documentsDomain, actions: documentActions } =
//     useDocumentsDomain();
//   const { data: medicationsDomain, actions: medicationActions } =
//     useMedicationDomain();
//   const { data: contactsDomain } = useTrustedContactsDomain();
//   const { data: providersDomain } = useProvidersDomain();
//   const { data: settingsDomain } = useUserSettingsDomain();

//   // DATA
//   const profile = profileDomain?.profile;
//   const documents = documentsDomain?.documentList ?? [];
//   const contacts = contactsDomain?.contactsList ?? [];
//   const providers = providersDomain?.providersList ?? [];
//   const settings = settingsDomain?.settings;

//   const currentMedications = medicationsDomain?.current ?? [];
//   const pastMedications = medicationsDomain?.past ?? [];

//   // MODAL STATE
//   const [showProfileModal, setShowProfileModal] = useState(false);

//   const [showContactModal, setShowContactModal] = useState(false);
//   const [editingContact, setEditingContact] =
//     useState<TrustedContactResponse | null>(null);

//   const [showProviderModal, setShowProviderModal] = useState(false);
//   const [editingProvider, setEditingProvider] =
//     useState<ProviderResponse | null>(null);

//   const [showSettingsModal, setShowSettingsModal] = useState(false);

//   const [showDocumentModal, setShowDocumentModal] = useState(false);
//   const [editingDocument] =
//     useState<DocumentResponse | null>(null);

//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [editingMedication, setEditingMedication] =
//     useState<MedicationResponse | null>(null);

//   const [deletingId, setDeletingId] = useState<string | null>(null);

//   const handleStopMedication = (med: MedicationResponse) => {
//     medicationActions.modifyMedication(med.id, {
//       is_active: false,
//       end_date: new Date().toISOString().split("T")[0],
//     });
//   };

//   const handleStartMedication = (med: MedicationResponse) => {
//     medicationActions.modifyMedication(med.id, {
//       is_active: true,
//       end_date: null,
//     });
//   };

//   const handleDeleteMedication = (id: string) => {
//     setDeletingId(id);
//   };

//   const handleConfirmDelete = () => {
//     if(deletingId) {
//       medicationActions.removeMedication(deletingId);
//       setDeletingId(null);
//     }
//   }

//   const handleCancelDelete = () => {
//     setDeletingId(null);
//   }


//   const mapAccessLevel = (level: string): "read" | "full" => {
//     return level === "read" ? "full" : "read";
//   };


//   const [activeTab, setActiveTab] = useState<
//     "documents" | "charts" | "medications"
//   >("documents");

//   return (
//     <div className="medical-history-page">
//       <ProfileSidebar
//         profile={profile}
//         contacts={contacts}
//         providers={providers}
//         settings={settings}
//         onEditProfile={() => setShowProfileModal(true)}
//         onEditContact={(c) => {
//           setEditingContact(c);
//           setShowContactModal(true);
//         }}
//         onEditProvider={(provider) => {
//           setEditingProvider(provider ?? null);
//           setShowProviderModal(true);
//         }}
//         onEditSettings={() => setShowSettingsModal(true)}
//       />

//       <main className="main-content">
//         <h1 className="main-title">Medical History</h1>
//         <p className="main-description">
//           View your medical documents, charts, and medication history.
//         </p>

//         <div className="tab-buttons">
//           <button
//             className={activeTab === "documents" ? "active" : ""}
//             onClick={() => setActiveTab("documents")}
//           >
//             Documents
//           </button>
//           <button
//             className={activeTab === "charts" ? "active" : ""}
//             onClick={() => setActiveTab("charts")}
//           >
//             Charts
//           </button>
//           <button
//             className={activeTab === "medications" ? "active" : ""}
//             onClick={() => setActiveTab("medications")}
//           >
//             Medications
//           </button>
//         </div>

//         <div className="tab-content">
//           {activeTab === "documents" && (
//             <DocumentsTab
//               documents={documents}
//               onDeleteDocument={(id) => documentActions.deleteFile(id)}
//             />
//           )}

//           {activeTab === "charts" && <ChartsTab />}

          
//  {deletingId && (
//         <DeleteConfirm 
//           id={deletingId}
//           type="medication"
//           onCancel={handleCancelDelete}
//           onDeleteConfirm={handleConfirmDelete}
//           />
//       )}
//           {activeTab === "medications" && (
//             <MedicationsTab
//               current={currentMedications}
//               past={pastMedications}
//               onEditMedication={(med) => {
//                 setEditingMedication(med);
//                 setShowEditModal(true);
//               }}
//               onAddMedication={() => setShowAddModal(true)}
//               onStopMedication={handleStopMedication}
//               onStartMedication={handleStartMedication}
//               onDeleteMedication={handleDeleteMedication}
//             />
//           )}
         
//         </div>
        
//       </main>
      

//       {/* MODALS */}
//       {showProfileModal && (
//         <UserProfileModal
//           isOpen={showProfileModal}
//           onClose={() => setShowProfileModal(false)}
//           profile={profile}
//         />
//       )}

//       {showContactModal && (
//         <TrustedContactModal
//           isOpen={showContactModal}
//           onClose={() => setShowContactModal(false)}
//           mode={editingContact ? "edit" : "add"}
//           contact={
//             editingContact
//               ? {
//                 contact_id: editingContact.id,
//                 contact_name: editingContact.contact_name,
//                 contact_email: editingContact.contact_email,
//                 access_level: mapAccessLevel(editingContact.access_level),
//               }
//               : undefined
//           }
//         />
//       )}

//       {showProviderModal && (
//         <ProviderModal
//           isOpen={showProviderModal}
//           onClose={() => setShowProviderModal(false)}
//           mode={editingProvider ? "edit" : "add"}
//           provider={
//             editingProvider
//               ? {
//                 provider_id: editingProvider.id,
//                 name: editingProvider.name,
//                 specialty: editingProvider.specialty ?? "",
//                 phone: editingProvider.phone ?? "",
//                 email: "", // FIXED: ProviderResponse has no email field
//               }
//               : undefined
//           }
//         />
//       )}

//       {showSettingsModal && (
//         <UserSettingsModal
//           isOpen={showSettingsModal}
//           onClose={() => setShowSettingsModal(false)}
//           settings={settings}
//         />
//       )}

//       {showDocumentModal && editingDocument && (
//         <DeleteDocumentModal
//           documentName={editingDocument.file_name}
//           onConfirm={() => {
//             documentActions.deleteFile(editingDocument.document_id);
//             setShowDocumentModal(false);
//           }}
//           onCancel={() => setShowDocumentModal(false)}
//           isDeleting={false}
//         />
//       )}

//       {showAddModal && (
//         <AddMedicationModal
//           isOpen={showAddModal}
//           onClose={() => setShowAddModal(false)}
//         />
//       )}

//       {showEditModal && editingMedication && (
//         <MedicationModal
//           isOpen={showEditModal}
//           onClose={() => setShowEditModal(false)}
//           mode="edit"
//           medication={{
//             id: editingMedication.id,
//             name: editingMedication.name,
//             dosage: editingMedication.dosage ?? "",
//             frequency: editingMedication.frequency ?? "",
//             start_date: editingMedication.start_date ?? "",
//             is_active: editingMedication.is_active,
//           }}
//         />
//       )}
      
//     </div>
//   );
// };
