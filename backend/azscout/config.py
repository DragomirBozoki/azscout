from __future__ import annotations

from dataclasses import dataclass
from functools import cached_property

from pydantic_settings import BaseSettings, SettingsConfigDict


@dataclass
class SubscriptionConfig:
    subscription_id: str
    display_name: str


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_prefix="AZSCOUT_",
        extra="ignore",
    )

    database_url: str = "sqlite:///./azscout.db"
    subscriptions: str = ""
    scan_interval_hours: int = 6
    cost_window_days: int = 30
    metric_window_days: int = 14
    cpu_threshold: float = 5.0
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"

    @cached_property
    def parsed_subscriptions(self) -> list[SubscriptionConfig]:
        values = [v.strip() for v in self.subscriptions.split(",") if v.strip()]
        parsed: list[SubscriptionConfig] = []
        for value in values:
            if ":" in value:
                sub_id, display = value.split(":", 1)
                parsed.append(SubscriptionConfig(subscription_id=sub_id.strip(), display_name=display.strip()))
            else:
                parsed.append(SubscriptionConfig(subscription_id=value, display_name=value))
        return parsed

    @cached_property
    def cors_origin_list(self) -> list[str]:
        return [v.strip() for v in self.cors_origins.split(",") if v.strip()]


settings = Settings()
