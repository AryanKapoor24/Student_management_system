# ---------- Stage 1: builder ----------
# Install Python dependencies into a virtual environment.
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements first so this layer is cached until requirements change.
COPY requirements.txt .
RUN pip install -r requirements.txt


# ---------- Stage 2: runtime ----------
# Start again from a clean slim image and copy in only the finished venv
# and the app code: no pip cache, no build leftovers, no tests.
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Run as an unprivileged user instead of root.
RUN useradd --system --uid 1000 --no-create-home appuser

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY app ./app

USER appuser
EXPOSE 8000

# Docker marks the container "healthy" only when /health returns 200
# (which also means the database is reachable).
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
