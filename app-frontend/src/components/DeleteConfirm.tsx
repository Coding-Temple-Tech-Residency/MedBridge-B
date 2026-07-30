import "./DeleteConfirm.css";

export interface DeleteConfirmationProps {
    id: string;
    name?:string;
    onDeleteConfirm: (value: string) => void;
    onCancel: () => void;
    type: string
}


export const DeleteConfirm = ({ id, onDeleteConfirm, onCancel, type, name }: DeleteConfirmationProps) => {

    return (
        <div className="delete-container">

        
            <h2>Delete {type}</h2>
            <p>Are you sure you want to delete {type} {name} ? This action cannot be undone.</p>
            <button
                className="delete-button"
                onClick={() => onDeleteConfirm(id)}>
                Yes, Delete it!
            </button>

            <button
                className="cancel-button"
                onClick={onCancel}>
                Cancel
            </button>

        </div>

    )

}