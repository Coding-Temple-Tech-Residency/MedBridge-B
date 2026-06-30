from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = ConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    supabase_url: str = ''
    supabase_anon_key: str = ''
    supabase_service_role_key: str = ''
    supabase_storage_bucket: str = 'medical-documents'
    groq_api_key: str = ''
    groq_model: str = 'llama3-8b-8192'
    app_env: str = 'development'
    secret_key: str = 'dev-secret-key-change-in-production'
    max_file_size_mb: int = 10
    allowed_origins: str = 'http://localhost:3000'
    ocr_confidence_threshold: int = 60
    tesseract_cmd: str = 'tesseract'
    chunk_size_tokens: int = 500
    chunk_overlap_tokens: int = 100
    max_context_tokens: int = 4000

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(',')]


@lru_cache
def get_settings() -> Settings:
    return Settings()
