import type { MedicationResponse } from "../../types/medication";

interface MedicationsTabProps {
  current: MedicationResponse[];
  past: MedicationResponse[];
  onEditMedication: (med: MedicationResponse | null) => void;
  onAddMedication: () => void; // ⭐ NEW
}

export default function MedicationsTab({
  current,
  past,
  onEditMedication,
  onAddMedication,
}: MedicationsTabProps) {
  return (
    <div>
      {/* MAIN HEADER WITH ADD BUTTON */}
      <div className="section-header">
        <h2>Medication History</h2>

        <button className="add-meds-button" onClick={onAddMedication}>
          <span className="pill-icon">💊</span> Add Medication
        </button>
      </div>

      {/* CURRENT MEDICATIONS */}
      <div className="section-header">
        <h3>Current Medications</h3>
        <button
          className="edit-button"
          onClick={() => onEditMedication(current[0])}
        >
          edit
        </button>
      </div>

      {current.length ? (
        current.map((med) => (
          <div key={med.id} className="list-row">
            <span>
              {med.name} — {med.dosage ?? "Unknown dose"},{" "}
              {med.frequency ?? "Unknown frequency"} (
              {med.is_active ? "Active" : "Inactive"})
            </span>
          </div>
        ))
      ) : (
        <p>No current medications.</p>
      )}

      {/* PAST MEDICATIONS */}
      <div className="section-header">
        <h3>Past Medications</h3>
        <button
          className="edit-button"
          onClick={() => onEditMedication(past[0])}
        >
          edit
        </button>
      </div>

      {past.length ? (
        past.map((med) => (
          <div key={med.id} className="list-row">
            <span>
              {med.name} — {med.dosage ?? "Unknown dose"}{" "}
              {med.end_date
                ? `(Ended: ${new Date(med.end_date).toLocaleDateString()})`
                : "(End date unknown)"}
            </span>
          </div>
        ))
      ) : (
        <p>No past medications.</p>
      )}
    </div>
  );
}
