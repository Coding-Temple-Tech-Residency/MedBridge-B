import { useChatbot } from "../hooks/useChatbot";
import { useDocumentChatDomain } from "../hooks/useDocumentChatDomain";
import { ChatboxUI, FloatingTrigger } from "./ChatbotUI";

interface ChatbotWidgetProp {
    document_id?: string
}


export const ChatbotWidget = ({document_id}: ChatbotWidgetProp) => {
    const {
        isOpen,
        inputText,
        toggleOpen,
        clearInput,
        handleInputChange
    } = useChatbot();

    const {
        data,
        flags,
        actions
    } = useDocumentChatDomain(document_id);


    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || flags.isAiStreaming || flags.isSendingQuestion) {
            return;
        }

        const questionText = inputText;

        actions.startAiStream(questionText);
        clearInput();

    }

    if (!isOpen) {
        return <FloatingTrigger onClick={toggleOpen} />;
    }

    return (
        <ChatboxUI
            history={Array.isArray(data.history) ? data.history : []}
            inputText={inputText}
            isStreaming={flags.isAiStreaming}
            streamingText={data.streamingAiText}
            ratingMessageId={flags.isRatingMessage}
            response_rating={actions.submitMessageRating}
            onInputChange={handleInputChange}
            onSubmit={handleChatSubmit}
            onClose={toggleOpen}
        />


    )
}