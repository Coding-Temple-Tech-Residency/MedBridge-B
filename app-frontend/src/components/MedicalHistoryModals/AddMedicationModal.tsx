// src/components/MedicalHistoryModals/AddMedicationModal.tsx
import { useState } from "react";
import { useMedicationDomain } from "../../hooks/useMedicationDomain";
import "./Modal.css";
import "../../main.css";

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddMedicationModal({
  isOpen,
  onClose,
}: AddMedicationModalProps) {
  const { actions, flags } = useMedicationDomain();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");

  //  category selector
  const [category, setCategory] = useState<"current" | "past">("current");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    actions.addMedication({
      name,
      dosage,
      frequency,
      start_date: startDate,

      //  Sorting logic:
      // Current meds → active
      // Past meds → inactive + end_date
      is_active: category === "current",
      end_date: category === "past" ? startDate : undefined,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-md">
        <h2>Add Medication</h2>

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

          <label>
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>

          {/* ⭐ NEW: Category selector */}
          <label>
            Category
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "current" | "past")
              }
            >
              <option value="current">Current Medication</option>
              <option value="past">Past Medication</option>
            </select>
          </label>

          <button type="submit" disabled={!!flags.isUpdating}>
            {flags.isUpdating ? "Saving..." : "Add Medication"}
          </button>

          {flags.hasError && (
            <p className="modal-error">{flags.errorMessage}</p>
          )}
        </form>

        <button className="modal-cancel" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
