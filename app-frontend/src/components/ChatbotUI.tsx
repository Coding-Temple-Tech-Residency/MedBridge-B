import type { FeedbackRequest } from "../types/documents";
import "./ChatbotUI.css"






export interface FloatingTriggerProp {
    onClick: () => void;
}


export interface ChatResponse {
    id?: string;
    message_id?: string;
    question?: string;
    answer?: string;
    role?: "user" | "assistant";
    content?: string;
    created_at?: string;
}


export interface ChatRoundRowProps {
    chatRound: ChatResponse;
}


export interface ChatboxUIProps {
    history: ChatResponse[];
    inputText: string;
    isStreaming: boolean;
    streamingText: string;
    ratingMessageId?: string | null;
    onInputChange: (val: string) => void;
    onSubmit: (e: React.SubmitEvent) => void;
    onClose: () => void;
    response_rating: (id: string, body: FeedbackRequest) => void;
}


export const FloatingTrigger = ({ onClick }: FloatingTriggerProp) => {
    return (
        <button
            onClick={onClick}
            aria-label="Open Chat"
            className="floating-trigger-button"
        >
            💬
        </button>
    );
};




export const ChatRoundRow = ({ chatRound }: ChatRoundRowProps) => {
    return (
        <>
            <div className="chat-question">
                {chatRound.question}
            </div>
            <div className="chat-answer">
                {chatRound.answer}
            </div>
        </>
    )
}




export const ChatboxUI = ({
    history,
    inputText,
    isStreaming,
    streamingText,
    ratingMessageId,
    onInputChange,
    onSubmit,
    onClose,
    response_rating,
}: ChatboxUIProps) => {

    return (
        <div className="chatbot-container">

            <div className="chatbot-header">
                <h3 className="chat-title">Document AI Assistant</h3>
                <p className="chat-description">Ask Questions about your Medical Documents.</p>
            </div>
            <button
                onClick={onClose}
                className="close-button"
                aria-label="Close Chat"
            >
                ❌
            </button>

            <div className="chat-body">
                {history.length === 0 && !isStreaming && (
                    <div className="empty-chat">
                        <h4>No Conversation Yet.</h4>
                        <p>Ask a question about your documents to start analyzing with AI.</p>

                    </div>
                )}
                {history.map((message: any, index: number) => {
                    const isUser = message.role === "user";
                    const messageId = message.id || message.message_id;
                    const isRatingThisMessage = ratingMessageId === messageId;
                    return (
                        <div
                            key={messageId || index}
                            className={`chat-bubble-container ${isUser ? "user-bubble" : "ai-bubble"}`}>
                            <div
                                className={`chat-bubble ${isUser ? "chat-question" : "chat-answer"}`}>
                                {message.content}
                            </div>
                            {!isUser && messageId && (
                                <div className="message-rating-actions">
                                    <span className="rating-label">Rate response:</span>
                                    {[1, 2, 3, 4, 5].map((starValue) => (
                                        <button
                                            key={starValue}
                                            type="button"
                                            disabled={isRatingThisMessage}
                                            className="rating-btn star-btn"
                                            onClick={() => response_rating(messageId, { rating: starValue })}
                                            aria-label={`Rate response ${starValue} out of 5`}
                                        >
                                            {starValue}☆
                                        </button>

                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}

                {isStreaming && streamingText && (
                    <div className="streaming">
                        {streamingText}
                    </div>
                )}

            </div>

            <form onSubmit={onSubmit} className="form-input">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder="Type your question ..."
                    disabled={isStreaming}
                />
                <button
                    type="submit"
                    disabled={!inputText.trim() || isStreaming}
                >
                    Send
                </button>
            </form>

        </div>
    )
}


