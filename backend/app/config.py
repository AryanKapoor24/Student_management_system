"""Application settings, read only from environment variables.

Nothing secret is hardcoded here: DATABASE_URL must be provided by the
environment (a .env file locally, docker-compose in containers, or
GitHub Actions in CI).
"""

import os


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Environment variable {name} is required but not set")
    return value


DATABASE_URL: str = _required("DATABASE_URL")

# Comma-separated list, e.g. "http://localhost:5173,http://localhost"
CORS_ORIGINS: list[str] = [
    origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()
]
