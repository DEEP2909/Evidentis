"""
EvidentIS India AI Service Configuration
"""

from functools import lru_cache
from typing import List

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI service settings for India multilingual legal intelligence."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        protected_namespaces=("settings_",),
        extra="ignore",
    )

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=5000)
    debug: bool = Field(default=False)
    environment: str = Field(default="development")

    cors_origins: str = Field(default="")

    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model_extract: str = Field(default="qwen2.5:3b-instruct-q3_K_M")
    ollama_model_research: str = Field(default="qwen2.5:3b-instruct-q3_K_M")
    ollama_model_fallback: str = Field(default="qwen2.5:3b-instruct-q3_K_M")
    ollama_timeout: int = Field(default=120)

    azure_openai_endpoint: str = Field(default="")
    azure_openai_api_key: str = Field(default="")
    azure_openai_api_version: str = Field(default="2024-02-01")
    azure_openai_deployment: str = Field(default="gpt-4o-mini")
    azure_openai_timeout: int = Field(default=60)
    groq_api_key: str = Field(default="")
    groq_research_model: str = Field(
        default="llama-3.1-8b-instant",
        validation_alias=AliasChoices("GROQ_RESEARCH_MODEL", "GROQ_MODEL"),
    )
    groq_timeout: int = Field(default=30)

    embedding_model: str = Field(default="BAAI/bge-m3")
    embedding_dim: int = Field(default=1024)
    extract_model: str = Field(default="ai4bharat/indic-bert")
    translation_model: str = Field(default="ai4bharat/indictrans2-en-indic-1B")

    ocr_engines: str = Field(default="tesseract")
    ocr_languages: str = Field(default="eng+hin+ben+tam+tel+kan+mal+mar+guj+pan+ori+asm+urd+san+snd+kas+nep+mai+kok+doi+sat+mni+bod")
    tesseract_path: str = Field(default="")
    google_vision_enabled: bool = Field(default=False)

    model_cache_dir: str = Field(default="./models")
    gpu_enabled: bool = Field(default=False)

    clause_extraction_threshold: float = Field(default=0.82)
    research_cache_ttl_seconds: int = Field(default=3600)
    rate_limit_requests_per_minute: int = Field(default=120)
    ai_service_internal_key: str = Field(default="")

    spacy_model: str = Field(default="en_core_web_sm")
    redis_url: str = Field(default="redis://localhost:6379")
    default_language: str = Field(default="hi")

    @property
    def ocr_engine_list(self) -> List[str]:
        return [engine.strip() for engine in self.ocr_engines.split(",") if engine.strip()]

    @property
    def ocr_language_list(self) -> List[str]:
        return [language.strip() for language in self.ocr_languages.split("+") if language.strip()]

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

@lru_cache()
def get_settings() -> Settings:
    return Settings()
