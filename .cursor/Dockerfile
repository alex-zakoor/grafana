# Frontend-focused Cloud Agent image for Grafana.
# Uses the official Node image so we don't download Go/Node tarballs during build
# (go.dev downloads often fail in Cloud Agent build networks).
FROM node:24.11.0-bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    git \
    sudo \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /workspace
