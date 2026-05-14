FROM node:22-bookworm AS frontend

WORKDIR /app
COPY avatar/package.json avatar/package-lock.json ./
RUN npm ci
COPY avatar/ .
RUN npm run build

FROM rust:1.85-bookworm AS backend

RUN apt-get update && apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/src-tauri
COPY avatar/src-tauri/ .
COPY --from=frontend /app/dist /app/dist

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
  libwebkit2gtk-4.1-0 \
  libappindicator3-1 \
  librsvg2-2 \
  libgtk-3-0 \
  libjavascriptcoregtk-4.1-0 \
  libsoup-3.0-0 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=backend /app/src-tauri/target/release/avatar /usr/local/bin/avatar

CMD ["avatar"]
