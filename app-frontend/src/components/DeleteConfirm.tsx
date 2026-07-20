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

            <p>Are you sure you want to delete {type} {name} ?</p>
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