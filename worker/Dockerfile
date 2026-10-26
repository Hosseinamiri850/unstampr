# Unstampr Python worker image - Python + FFmpeg + pinned requirements.
# Build: docker build -f worker/Dockerfile -t unstampr-worker .

FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg libgl1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY worker/requirements.txt /app/worker/requirements.txt
RUN pip install --no-cache-dir -r worker/requirements.txt

COPY worker /app/worker

RUN useradd --system --create-home unstampr \
 && chown -R unstampr:unstampr /app
USER unstampr

CMD ["python", "-m", "worker"]
