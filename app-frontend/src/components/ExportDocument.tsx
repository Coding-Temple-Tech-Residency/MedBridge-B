import { useExportDocument } from "../hooks/useExportDocument";
import "./ExportDocument.css";

export interface ExportDocumentProps {
    id: string;
    document_name: string;
    ai_summary: string;
    document_file_url?: string;
    onClose: () => void;
    onSubmit: (payload: {
        id: string;
        ai_summary: string;
        method: "email" | "text";
        destination: string;
    }) => void;


}


export const ExportDocument = ({ id, document_name, ai_summary, onClose, onSubmit, document_file_url }: ExportDocumentProps) => {

    const {
        method,
        setMethod,
        input,
        setInput,
        isValid,
        handleSend,
        handleCancel,
        isExporting
    } = useExportDocument({ id, ai_summary, onSubmit, onClose, document_file_url });



    return (

        <div className="export-container">

            <div className="header">

                <h2>Export {document_name}</h2>

                <button
                    className={`email ${method === "email" ? "active" : ""}`}
                    onClick={() => setMethod("email")}
                    disabled={isExporting}>
                    Email
                </button>

                <button
                    className={`text-number ${method === "text" ? "active" : ""}`}
                    onClick={() => setMethod("text")}
                    disabled={isExporting}>
                    Text
                </button>

            </div>

            <div className="text-container">

                <label>{method === "email" ? "E-mail Address" : "Text-Number"}</label>

                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={method === "email" ? "you@example.com" : "123-456-7890"}
                />

            </div>

            <div className="actions">

                <button
                    className="cancel-button"
                    disabled={isExporting}
                    onClick={handleCancel}
                >
                    Cancel
                </button>

                <button
                    className="send-button"
                    disabled={!isValid || isExporting}
                    onClick={handleSend}
                >
                    {isExporting ? "Preparing..." : "Send"}
                </button>

            </div>

        </div>
    )
}