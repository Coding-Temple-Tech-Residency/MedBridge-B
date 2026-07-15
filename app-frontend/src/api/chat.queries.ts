import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import type { FeedbackRequest, ChatResponse, ChatRequest, UnderstandingResponse, UnderstandingRequest } from "../types/documents";
import { apiHelper } from "./apiHelper";

export const useStreamChat = () => {
    const { token } = useAuth();

    const [aiText, setAiText] = useState('');
    const [aiActive, setAiActive] = useState(false);
    const [errors, setErrors] = useState<string | null>(null);

    const eventSourceRef = useRef<EventSource | null>(null)


    const streamTrigger = (document_id: string, message: string, onComplete?: () => void) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setAiText('')
        setAiActive(true);
        setErrors(null);
        const safeMessage = encodeURIComponent(message)
        const url = `http://localhost:8000/documents/${document_id}/chat/stream?message=${safeMessage}&token=${token}`;

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            if (event.data === "[DONE]") {
                stopStream();
                if(onComplete) onComplete();
                return;
            }
            try {
                const parsed = JSON.parse(event.data);
                const textChunk = parsed.token || parsed.text || parsed.chunk || "";

                setAiText((prev) => prev + textChunk)
            } catch (error) {
                setAiText((prev) => prev + event.data);
            }
        }

        eventSource.onerror = (error) => {
            if (eventSource.readyState === EventSource.CLOSED) {
                console.log("Stream closed safely")

            } else {
                console.error("Stream encountered a network disconnection or error", error)
                setErrors("Failed to stream AI response. Please try again.");
            }
            eventSource.close();
            eventSourceRef.current = null;
            setAiActive(false);
            if(onComplete) onComplete();


        }

    }

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        }
    }, [])


    const stopStream = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null
            setAiActive(false);
        }
    };

    return {
        aiText,
        aiActive,
        errors,
        streamTrigger,
        stopStream
    };

};


export const useRateMessage = () => {
    const queryClient = useQueryClient();

    return useMutation<string, Error, { message_id: string, body: FeedbackRequest }>({
        mutationFn: ({ message_id, body }) => {
            return apiHelper({
                url: `http://localhost:8000/chat/${message_id}/rating`,
                method: "PATCH",
                body: body,
            })
        },
        onSuccess: (data) => {
            console.log("Rating successfully submitted.", data)
            queryClient.invalidateQueries({ queryKey: ["chat"] })
        },

        onError: (error) => {
            console.error("Problem submitting rating.", error)
        }

    })
}


export const useGetChatHistory = (document_id?: string) => {
    return useQuery<ChatResponse>({
        queryKey: ["chat", document_id],
        queryFn: () => {
            if(!document_id) throw new Error("Document ID is required.");
            return apiHelper({
                url: `http://localhost:8000/documents/${document_id}/chat`,
                method: "GET",
            })
        },
        enabled: !!document_id
    });
};



export const useAskQuestion = () => {
    const queryClient = useQueryClient();
    return useMutation<ChatResponse, Error, { document_id: string, body: ChatRequest }>({
        mutationFn: ({ document_id, body }) => {
            return apiHelper({
                url: `http://localhost:8000/documents/${document_id}/chat`,
                method: "POST",
                body: body,
            })
        },
        onSuccess: (data, {document_id}) => {
            console.log("Chat Questions successfully submitted", data.message_id);
            queryClient.invalidateQueries({ queryKey: ["chat", document_id] })
        },
        onError: (error) => {
            console.error("Error with submitting chat question", error)
        }

    })
}


export const useRateUnderstanding = () => {
    const queryClient = useQueryClient();
    return useMutation<UnderstandingResponse, Error, { summary_id: string, body: UnderstandingRequest }>({
        mutationFn: ({ summary_id, body }) => {
            return apiHelper({
                url: `http://localhost:8000/summaries/${summary_id}/understanding`,
                method: "POST",
                body: body,
            })
        },
        onSuccess: (data) => {
            console.log("Document summary successfully submitted", data.id);
            queryClient.invalidateQueries({ queryKey: ["documents"] })
        },
        onError: (error) => {
            console.error("error with submitting summary:", error)
        }

    })
}