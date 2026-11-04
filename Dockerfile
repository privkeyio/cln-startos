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
# The hashes come from SHA256SUMS-v26.06.9-blake2b.10 (amd64) and SHA256SUMS-v26.06.9-blake2b.10-arm64, GPG-verified against A47D99B6DB0D715D40C59A2023AE8A8EA7E24E38.
FROM base AS lightningd-dist
ARG TARGETARCH
ARG CLN_REPO=privkeyio/lightning
ARG CLN_VERSION=v26.06.9-blake2b.10
ARG CLN_SHA256_AMD64=e8cbffee52e7f4ea8404c3ae3b83c07a4099ffcf7ad698110bbd84a331959b7b
ARG CLN_SHA256_ARM64=161bff9f776ec8db0019211ede6dcb6684ad2387787ce06133b50fae32aac31a
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
# both exec; without it lightningd dies at startup with "The Bitcoin backend
# died". Checksums are from bitcoincore.org's SHA256SUMS.
FROM base AS bitcoin-cli
ARG TARGETARCH
ARG BITCOIN_VERSION=31.1
ARG BITCOIN_SHA256_AMD64=b80d9c3e04da78fb6f0569685673418cf686fadba9042d926d13fb87ff503f9e
ARG BITCOIN_SHA256_ARM64=dcf1873f2208ba4f962f3398d47e154c39c0084be8f4553e05c940d0ace3d004
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
    libpq5 libsodium23 wireguard-tools iptables iproute2 procps && \
    rm -rf /var/lib/apt/lists/*

# Mozilla's root store no longer includes emSign Root CA - C1 or emSign ECC Root
# CA - C3, which it retired at eMudhra's request, but bookworm's ca-certificates
# still ships them. emSign ECC Root CA - G3, which Mozilla removed after a key
# compromise, is already absent.
RUN set -eu; \
    for c in emSign_Root_CA_-_C1 emSign_ECC_Root_CA_-_C3; do \
      f=/usr/share/ca-certificates/mozilla/$c.crt; \
      [ -f "$f" ] || { echo "$c not found: has ca-certificates changed?" >&2; exit 1; }; \
      sed -i "s|^mozilla/$c\.crt$|!mozilla/$c.crt|" /etc/ca-certificates.conf; \
      cp "$f" /tmp/$c.crt; \
    done; \
    update-ca-certificates --fresh >/dev/null; \
    for c in emSign_Root_CA_-_C1 emSign_ECC_Root_CA_-_C3; do \
      ! tr -d '\n' < /etc/ssl/certs/ca-certificates.crt \
        | grep -qF "$(grep -v -- ----- /tmp/$c.crt | tr -d '\n')" \
        || { echo "$c is still trusted" >&2; exit 1; }; \
      rm /tmp/$c.crt; \
    done

COPY --from=bitcoin-cli /usr/bin/bitcoin-cli /usr/bin/bitcoin-cli
COPY --from=lightningd-dist /dist/usr/local /usr/local
COPY --from=sling /usr/local/bin/sling /usr/local/libexec/c-lightning/plugins/
