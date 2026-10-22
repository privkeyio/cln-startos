# Shared base with common dependencies
FROM debian:bookworm-slim AS base
RUN apt-get update -qq && \
    apt-get install -qq -y --no-install-recommends \
    build-essential \
    git \
    pkg-config \
    curl && \
    rm -rf /var/lib/apt/lists/*

# sling - download prebuilt binary
FROM base AS sling
ARG TARGETARCH
ARG SLING_VERSION=v4.3.1
ARG SLING_SHA256_AMD64=71dd089d5c1544e7dacc17318fdc70db6802c80db9f5ae8496f19f0ab6a758d5
ARG SLING_SHA256_ARM64=eef6ee5f6fbe6960b2b999969773f39caba6a4e3818cc7020ba32c1e4f4bb1b4
RUN apt-get update -qq && apt-get install -qq -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) SHA="$SLING_SHA256_AMD64"; SLING_ARCH=x86_64 ;; \
      arm64) SHA="$SLING_SHA256_ARM64"; SLING_ARCH=aarch64 ;; \
      *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    TARBALL="sling-${SLING_VERSION}-${SLING_ARCH}-linux-gnu.tar.gz"; \
    curl -fsSLO "https://github.com/daywalker90/sling/releases/download/${SLING_VERSION}/${TARBALL}"; \
    echo "${SHA}  ${TARBALL}" | sha256sum -c -; \
    tar -xzf "$TARBALL" -C /usr/local/bin/; \
    rm "$TARBALL"

# lightningd, from the signed release tarballs.
#
# This is a fork of Core Lightning v26.06.9 that adds support for the 164-byte
# BLAKE2b block header. Without it a node cannot parse the activation block and
# dies on the first one.
#
# The hashes come from SHA256SUMS-v26.06.9-blake2b.9, GPG-verified against A47D99B6DB0D715D40C59A2023AE8A8EA7E24E38.
FROM base AS lightningd-dist
ARG TARGETARCH
ARG CLN_REPO=privkeyio/lightning
ARG CLN_VERSION=v26.06.9-blake2b.9
ARG CLN_SHA256_AMD64=050d6317de4a34197dcbacda8d7c9c0d41e5ff16a11ddb133f86d1fedd675f3d
ARG CLN_SHA256_ARM64=c73889219610214aab0506068ddb8456e2b330fb9618ba52f405cab9dafd916e
RUN apt-get update -qq && \
    apt-get install -qq -y --no-install-recommends ca-certificates xz-utils && \
    rm -rf /var/lib/apt/lists/*
# Ubuntu 22.04 build: its glibc 2.35 runs on bookworm's 2.36, so the runtime
# stays the distro every other binary here is compiled against.
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) SHA="$CLN_SHA256_AMD64" ;; \
      arm64) SHA="$CLN_SHA256_ARM64" ;; \
      *) echo "no ${CLN_VERSION} build for TARGETARCH ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    TARBALL="clightning-${CLN_VERSION}-Ubuntu-22.04-${TARGETARCH}.tar.xz"; \
    curl -fsSLO "https://github.com/${CLN_REPO}/releases/download/${CLN_VERSION}/${TARBALL}"; \
    echo "${SHA}  ${TARBALL}" | sha256sum -c -; \
    mkdir -p /dist/usr/local; \
    tar -xf "$TARBALL" -C /dist/usr/local --strip-components=2

# bitcoin-cli, which CLN's own plugin-bcli and our check-synced health check
# both exec. The upstream lightningd image bundled it (v27.1.0); a slim base
# does not, and a missing one kills lightningd at startup with
# "The Bitcoin backend died". Checksums are from bitcoincore.org's SHA256SUMS.
FROM base AS bitcoin-cli
ARG TARGETARCH
ARG BITCOIN_VERSION=27.1
ARG BITCOIN_SHA256_AMD64=c9840607d230d65f6938b81deaec0b98fe9cb14c3a41a5b13b2c05d044a48422
ARG BITCOIN_SHA256_ARM64=bb878df4f8ff8fb8acfb94207c50f959c462c39e652f507c2a2db20acc6a1eee
RUN apt-get update -qq && \
    apt-get install -qq -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) SHA="$BITCOIN_SHA256_AMD64"; ARCH=x86_64 ;; \
      arm64) SHA="$BITCOIN_SHA256_ARM64"; ARCH=aarch64 ;; \
      *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    TARBALL="bitcoin-${BITCOIN_VERSION}-${ARCH}-linux-gnu.tar.gz"; \
    curl -fsSLO "https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/${TARBALL}"; \
    echo "${SHA}  ${TARBALL}" | sha256sum -c -; \
    tar -xf "$TARBALL" "bitcoin-${BITCOIN_VERSION}/bin/bitcoin-cli"; \
    install -m 755 "bitcoin-${BITCOIN_VERSION}/bin/bitcoin-cli" /usr/bin/bitcoin-cli

# Final stage - simplified
#
# `ca-certificates` gives the slim base a CA store, which the currency-rate
# plugin needs for its TLS requests.
#
# `libpq5` and `libsodium23` are lightningd's own runtime deps, previously
# supplied by the upstream image.
FROM debian:bookworm-slim AS final
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates libev-dev libcurl4-gnutls-dev libsqlite3-dev libunwind-dev \
    libpq5 libsodium23 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=bitcoin-cli /usr/bin/bitcoin-cli /usr/bin/bitcoin-cli
COPY --from=lightningd-dist /dist/usr/local /usr/local
COPY --from=sling /usr/local/bin/sling /usr/local/libexec/c-lightning/plugins/
