import { useListResources, useGetResource, useListHealthScores, useGenerateHealthScore } from "../api/resources.queries";


export const useResourcesDomain = (config: {
    resource_id?: string;
    filters?: { resource_type?: string; tag?: string }
} = {}) => {
    const { resource_id, filters = {} } = config;


    const {
        data: resourcesData,
        isPending: resourcesPending,
        isError: isResourcesError,
        error: resourcesError
    } = useListResources(filters);

    const {
        data: resourceDetailData,
        isPending: detailPending,
        isError: isDetailError,
        error: detailError
    } = useGetResource(resource_id || "");


    const {
        data: healthScoresData,
        isPending: scoresPending,
        isError: isScoresError,
        error: scoresError
    } = useListHealthScores();

    const {
        mutate: generateScoreMutation,
        isPending: generatePending,
        variables: generatingDocId,
        isError: isGenerateError,
        error: generateError
    } = useGenerateHealthScore();



    const isPending =
        resourcesPending ||
        scoresPending ||
        (!!resource_id && detailPending);


    const hasError = isResourcesError || isScoresError || isGenerateError || isDetailError;


    const errorMessage =
        resourcesError?.message ||
        detailError?.message ||
        scoresError?.message ||
        generateError?.message ||
        "An unexpected error occurred while compiling medical insights.";


    const isResourceListEmpty =
        !resourcesPending &&
        !isResourcesError &&
        (!resourcesData || resourcesData.length === 0);

    const isHealthScoresEmpty =
        !scoresPending &&
        !isScoresError &&
        (!healthScoresData || healthScoresData.length === 0);



    const viewConfigs = {
        resourceHub: {
            title: "Clinical Reference Library",
            description: "Explore curated educational content, medical toolkits, and guided resources tailored to your health records.",
            icon: "📚",
        },
        emptyResources: {
            title: "No Matching Resources",
            description: "We couldn't find any reference materials matching your active filters or tags.",
            icon: "🔍",
        },
        healthInsights: {
            title: "Automated Health Metrics",
            description: "Track longitudinal biometric scores, diagnostic indices, and evaluation metrics extracted from your uploaded clinical files.",
            icon: "📊",
        },
        emptyInsights: {
            title: "No Insights Generated Yet",
            description: "Your health metric panel is clean. Upload medical records and trigger a clinical analysis to compile your initial scores.",
            icon: "🧬",
        }
    };


    return {
        data: {
            resourcesList: resourcesData || [],
            activeResource: resourceDetailData,
            healthScoresList: healthScoresData || [],
        },


        flags: {
            isPending,
            hasError,
            errorMessage,
            isResourceListEmpty,
            isHealthScoresEmpty,
            isGeneratingScore: generatePending ? generatingDocId : null,
            isActionInFlight: generatePending
        },


        actions: {
            calculateHealthScore: (document_id: string) => generateScoreMutation(document_id),
        },
        viewConfigs,
    };
};