import { useAskQuestion, useGetChatHistory, useRateMessage, useRateUnderstanding, useStreamChat } from "../api/chat.queries"




export const useDocumentChatDomain = (document_id: string) => {

    const {
        aiText,
        aiActive: isAiStreaming,
        errors: streamError,
        streamTrigger,
        stopStream
    } = useStreamChat()

    const {
        data: chatHistoryData,
        isPending: historyPending,
        isError: isHistoryError,
        error: historyError
    } = useGetChatHistory(document_id);


    const {
        mutate: askQuestion,
        isPending: askPending,
        isError: isAskError,
        error: askError
    } = useAskQuestion();

    const {
        mutate: rateMessage,
        variables: ratingMessageId,
        isPending: ratePending,
        isError: isRateError,
        error: rateError
    } = useRateMessage();


    const {
        mutate: rateUnderstanding,
        isPending: understandingPending,
        variables: ratingSummaryId,
        isError: isUnderstandingError,
        error: understandingError
    } = useRateUnderstanding();


    const isPending = historyPending
        


    const hasError =
        isHistoryError ||
        isAskError ||
        isRateError ||
        isUnderstandingError ||
        !!streamError;

    const errorMessage =
        historyError?.message ||
        askError?.message ||
        rateError?.message ||
        understandingError?.message ||
        streamError ||
        "An unexpected error occurred in the chat domain.";

    const isChatHistoryEmpty =
        !historyPending &&
        !isHistoryError &&
        (!chatHistoryData || !chatHistoryData.answer || chatHistoryData.answer.length === 0);

    const viewConfigs = {
        chatWindow: {
            title: "Document AI Assistant",
            description: "Ask questions, summarize key sections, or clarify complex terms inside this document.",
            icon: "🤖",
        },
        emptyHistory: {
            title: "No Conversation Yet",
            description: "Type your first question below to start analyzing this document with AI.",
            icon: "💬",
        },
        understandingCheck: {
            title: "Rate Your Understanding",
            description: "How confident do you feel about this document's summary?",
            icon: "🧠",
        }
    };


    return {
        data: {
            history: chatHistoryData?.answer || [],
            rawChatResponse: chatHistoryData,
            streamingAiText: aiText,
        },

        flags: {
            isPending,
            hasError,
            errorMessage,
            isChatHistoryEmpty,
            isAiStreaming,
            isSendingQuestion:askPending,
            isRatingMessage: ratePending ? ratingMessageId: null,
            IsRatingUnderstanding: understandingPending ? ratingSummaryId : null,

            isActionInFlight: askPending || ratePending || understandingPending,
        },

        actions: {
            askQuestion: (body: any) => askQuestion({ document_id, body }),
            startAiStream: (message: string) => streamTrigger(document_id, message),
            cancelAiStream: stopStream,
            submitMessageRating: (message_id: string, body: any) => rateMessage({ message_id, body }),
            submitUnderstandingScore: (summary_id: string, body: any) => rateUnderstanding({ summary_id, body }),

        },
        viewConfigs,

    }




}