import { useState } from "react";


export interface UseExportDocumentConfig {
  id: string;
  ai_summary: string;
  document_file_url: string | undefined;
  onSubmit: (payload: {
    id: string;
    ai_summary: string;
    method: "email" | "text";
    destination: string;
  }) => void;
  onClose: () => void;
}


export const useExportDocument = ({
  id,
  ai_summary,
  onSubmit,
  document_file_url,
  onClose,
}: UseExportDocumentConfig) => {
  const [method, setMethod] = useState<"email" | "text">("email");
  const [input, setInput] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);


  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanNumber = input.replace(/\D/g, "");
  const isTextNumberValid = cleanNumber.length === 10;


  const isValid = method === "email"
    ? emailRegex.test(input)
    : isTextNumberValid;
    

  const handleSend = async () => {
    if (!isValid || isExporting) return;
    setIsExporting(true);

    try {
      let fileToShare: File | null = null;

      if (document_file_url) {
        try {
          const response = await fetch(document_file_url);

          const blob = await response.blob();
          fileToShare = new File([blob], `Document_${id}.pdf`, {
            type: "application/pdf",
          });
        } catch (fetchErr) {
          console.warn("Unable to prepare document file for native share sheet:", fetchErr);
        }
      }

      const shareData: ShareData = {
        title: `Medical Document Summary (${id})`,
        text: `Document AI Summary:\n${ai_summary}`,
        ...(fileToShare ? { files: [fileToShare] } : {}),
      };

      if (
        navigator.canShare &&
        navigator.share &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);
      } else {

        const combinedContent = `Document AI Summary:\n${ai_summary}\n\nSource Document Reference:\n${document_file_url || "N/A"}`;
        const encodedBody = encodeURIComponent(combinedContent);

        if (method === "email") {
          const subject = encodeURIComponent(`Medical Document Summary Archive (${id})`);
          window.location.href = `mailto:${input}?subject=${subject}&body=${encodedBody}`;
        } else if (method === "text") {
          window.location.href = `sms:${cleanNumber}?body=${encodedBody}`;
        }
      }

      onSubmit({
        id,
        ai_summary,
        method,
        destination: input,
      });
      onClose();
    } catch (error) {
      console.log("Share action canceleed or unfulfilled:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  }

  return {
    method,
    setMethod,
    input,
    setInput,
    isValid,
    isExporting,
    handleSend,
    handleCancel
  };
};