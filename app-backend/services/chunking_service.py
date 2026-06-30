"""
Chunking service.

Splits extracted document text into overlapping token-sized chunks
for Q&A context retrieval.

Strategy:
  - Documents under MAX_CONTEXT_TOKENS → no chunking, return as-is
  - Documents over MAX_CONTEXT_TOKENS → chunk with overlap
  - Chunks stored in document_chunks table with index

Token counting uses tiktoken (cl100k_base encoding, compatible with
most modern LLMs including Llama variants via Groq).
"""

import logging
from dataclasses import dataclass

import tiktoken
from app.config import get_settings

logger = logging.getLogger(__name__)

# Use cl100k_base — compatible with Llama/Groq token counting
_ENCODER = tiktoken.get_encoding("cl100k_base")


@dataclass
class Chunk:
    index: int
    text: str
    token_count: int


def count_tokens(text: str) -> int:
    return len(_ENCODER.encode(text))


def needs_chunking(text: str) -> bool:
    settings = get_settings()
    return count_tokens(text) > settings.max_context_tokens


def chunk_document(text: str) -> list[Chunk]:
    """
    Split document text into overlapping chunks.

    Returns a list of Chunk objects.
    If the document fits within MAX_CONTEXT_TOKENS, returns a single chunk.
    """
    settings = get_settings()
    tokens = _ENCODER.encode(text)
    total_tokens = len(tokens)

    # Small document — single chunk, no storage overhead
    if total_tokens <= settings.max_context_tokens:
        return [Chunk(index=0, text=text, token_count=total_tokens)]

    chunk_size = settings.chunk_size_tokens
    overlap = settings.chunk_overlap_tokens
    step = chunk_size - overlap

    chunks = []
    start = 0
    idx = 0

    while start < total_tokens:
        end = min(start + chunk_size, total_tokens)
        chunk_tokens = tokens[start:end]
        chunk_text = _ENCODER.decode(chunk_tokens)
        chunks.append(Chunk(
            index=idx,
            text=chunk_text,
            token_count=len(chunk_tokens),
        ))
        if end == total_tokens:
            break
        start += step
        idx += 1

    logger.debug(
        f"Chunked document into {len(chunks)} chunks "
        f"({total_tokens} total tokens, chunk_size={chunk_size}, overlap={overlap})"
    )
    return chunks


def assemble_context(chunks: list[str], max_tokens: int | None = None) -> str:
    """
    Given a list of chunk texts (already ranked by relevance),
    concatenate them up to the token limit.

    Used by Q&A service to build the context string for the LLM.
    """
    settings = get_settings()
    limit = max_tokens or settings.max_context_tokens
    assembled = []
    running_tokens = 0

    for chunk in chunks:
        chunk_tokens = count_tokens(chunk)
        if running_tokens + chunk_tokens > limit:
            break
        assembled.append(chunk)
        running_tokens += chunk_tokens

    return "\n\n---\n\n".join(assembled)


def simple_keyword_retrieval(
    chunks: list[str],
    question: str,
    top_k: int = 5,
) -> list[str]:
    """
    MVP fallback retrieval: score chunks by keyword overlap with the question.
    Returns top_k chunks sorted by score descending.

    This is intentionally simple — replace with pgvector embeddings post-MVP.
    """
    question_words = set(question.lower().split())
    # Remove common stop words
    stop_words = {
        "what", "when", "where", "why", "how", "is", "are", "was", "were",
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to",
        "for", "of", "with", "my", "your", "this", "that", "does", "do",
    }
    question_words -= stop_words

    if not question_words:
        # No meaningful keywords — return first top_k chunks
        return chunks[:top_k]

    scored = []
    for chunk in chunks:
        chunk_words = set(chunk.lower().split())
        score = len(question_words & chunk_words)
        scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]
