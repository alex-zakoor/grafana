# Frontend-focused Cloud Agent image for Grafana.
# Uses the official Node image so we don't download Go/Node tarballs during build
# (go.dev downloads often fail in Cloud Agent build networks).
#
# Do not run apt-get here: Cloud Agent Docker builds often cannot reach deb.debian.org
# (404 on bookworm Release files). The full node:bookworm image already includes git
# and ca-certificates, which is enough for yarn install + Jest.
FROM node:24.11.0-bookworm
RUN corepack enable
WORKDIR /workspace
