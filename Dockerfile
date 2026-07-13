# ---- Etap 1: budowanie ----
FROM node:20-alpine AS builder
WORKDIR /app

# Włączamy corepack, żeby mieć dokładnie tę wersję pnpm co lokalnie (z package.json -> packageManager)
RUN corepack enable

# Najpierw same pliki opisujące zależności - lepszy cache warstw Dockera
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Reszta kodu źródłowego
COPY . .

# VITE_API_URL jest "wypiekane" do builda w czasie kompilacji (Vite czyta zmienne env przy build,
# nie przy starcie kontenera) - dlatego przekazujemy je jako build-arg z GitHub Actions
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm run build:frontend

# ---- Etap 2: serwowanie statycznych plikow przez nginx ----
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/spa /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
