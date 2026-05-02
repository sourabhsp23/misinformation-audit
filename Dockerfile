# --- Stage 1: Build the React Frontend ---
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

# Copy frontend config and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Final Production Image ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for ChromaDB/Transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
# Install CPU-only torch to save space and avoid build hangs on limited memory environments
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code (respects .dockerignore to avoid copying node_modules)
COPY . .

# Copy the built frontend from Stage 1 into the backend's static folder
# Vite defaults to 'dist', and server.py looks for 'static'
COPY --from=frontend-builder /app/frontend/dist ./static

# Set Environment Variable defaults (can be overridden in Render)
ENV PORT=8000
EXPOSE 8000

# Start the FastAPI server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
