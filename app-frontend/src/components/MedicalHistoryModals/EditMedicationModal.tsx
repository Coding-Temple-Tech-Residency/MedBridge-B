// src/components/MedicalHistoryModals/EditMedicationModal.tsx
import { useEffect, useState } from "react";
import { useMedicationDomain } from "../../hooks/useMedicationDomain";
import "./Modal.css";
import "../../main.css";

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  medication?: {
    med_id: string;
    name: string;
    dosage: string;
    frequency: string;
    start_date: string;
    is_active: boolean;
  };
}

export default function MedicationModal({
  isOpen,
  onClose,
  mode,
  medication,
}: MedicationModalProps) {
  const { actions, flags } = useMedicationDomain();

  const [name, setName] = useState(medication?.name || "");
  const [dosage, setDosage] = useState(medication?.dosage || "");
  const [frequency, setFrequency] = useState(medication?.frequency || "");
  const [startDate, setStartDate] = useState(medication?.start_date || "");
  const [isActive, setIsActive] = useState(medication?.is_active ?? true);

  useEffect(() => {
    if (isOpen && !flags.isUpdating && !flags.hasError) {
      onClose();
    }
  }, [flags.isUpdating, flags.hasError, isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "add") {
      actions.addMedication({
        name,
        dosage,
        frequency,
        start_date: startDate,
      });
      return;
    }

    if (mode === "edit" && medication) {
      actions.modifyMedication(medication.med_id, {
        name,
        dosage,
        frequency,
        is_active: isActive,
      });
      return;
    }
  };

  const handleStopMedication = () => {
    if (medication) {
      actions.modifyMedication(medication.med_id, {
        name,
        dosage,
        frequency,
        is_active: false,
      });
    }
  };

  const handleDeleteMedication = () => {
    if (medication) {
      actions.removeMedication(medication.med_id);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-md">
        <h2>{mode === "add" ? "Add Medication" : "Edit Medication"}</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Medication Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label>
            Dosage
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              required
            />
          </label>

          <label>
            Frequency
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
            />
          </label>

          {mode === "add" && (
            <label>
              Start Date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
          )}

          {mode === "edit" && (
            <label className="toggle-label">
              Active Medication
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </label>
          )}

          <button type="submit" disabled={!!flags.isUpdating}>
            {flags.isUpdating ? "Saving..." : "Save"}
          </button>

          {mode === "edit" && (
            <>
              <button
                type="button"
                className="danger-button"
                onClick={handleStopMedication}
              >
                Stop Medication
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteMedication}
              >
                Delete Medication
              </button>
            </>
          )}

          {flags.hasError && (
            <p className="modal-error">{flags.errorMessage}</p>
          )}
        </form>

        <button className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
