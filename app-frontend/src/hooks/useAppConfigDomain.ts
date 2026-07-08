import { useGetApplicationConfig } from "../api/config.queries"



export const useAppConfigDomain = () => {

    const {
        data: configData,
        isPending,
        isError,
        error
    } = useGetApplicationConfig();


    const hasError = isError;
    const errorMessage = error?.message || "Failed to load application configuration settings.";
    const isConfigEmpty = !isPending && !isError && !configData;


    const features = configData?.features || {
        document_upload: false,
        ocr_extraction: false,
        ai_summarization: false,
        document_chat: false,
        summary_feedback: false,
        analytics_dashboard: false,
        appointment_prep: false,
        reminders: false,
        multilanguage: false,
    };


    const viewConfigs = {
        appLoader: {
            title: "Initializing System",
            description: "Securing connection and loading application configurations...",
            icon: "⚙️",
        },
        loadError: {
            title: "Configuration Failure",
            description: "We encountered a critical problem initializing the app setup. Please reload.",
            icon: "⚠️",
        }
    };

    return {
        data: {
            appInfo: configData?.app || { name: "Application", version: "0.0.0", environment: "production" },
            limits: configData?.limits || { max_upload_mb: 0, allowed_file_types: [], max_pages_per_document: 0 },
            aiConfig: configData?.ai || { model: "unknown", max_summary_tokens: 0, max_chat_tokens: 0 },
            rawConfig: configData,
        },

        flags: {
            isPending,
            hasError,
            errorMessage,
            isConfigEmpty,
            features,
        },

        actions: {},

        viewConfigs,
    };

};