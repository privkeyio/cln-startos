import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '#blake:26.6.7:1',
  releaseNotes: {
    en_US: `Core Lightning with support for the 164-byte BLAKE2b block header, now with unified signatures.

The BLAKE2b hard fork activated on mainnet at block 961,640. From that block on, a header is 164 bytes rather than 80 and its block id is BLAKE2b rather than SHA256d. Core Lightning computes block ids itself while following the chain, so an unmodified node cannot parse the activation block and stops there.

This build adds SIGHASH_UNIFIED signing for the wallet and for new channels. A channel funded after the fork, from coins that are themselves post-fork, cannot be replayed onto a chain that did not adopt the rule change.

## Read this before opening channels

The node signals a required feature bit, so it will not connect to a Lightning node that has not adopted the fork. That is deliberate: it stops you opening a channel with a peer who cannot follow the chain. It also means you cannot cooperatively close a channel opened before the fork with a counterparty still on the old rules.

The feature numbers are provisional and are expected to change. Channels opened now may have to be closed and reopened once they are settled. Fund channels only from coins received after the fork.

Your node's configuration does not change.`,
  },
  migrations: {
    up: async () => {},
    //Refuse every downgrade. Channels opened here negotiate unified signing, and a build without it
    //computes a different signature hash, so it cannot close them. lightning-downgrade refuses for
    //the same reason.
    down: IMPOSSIBLE,
    other: {
      //Arriving from the unflavored build, or from the header-only flavor. Both are Core Lightning
      //v26.06.7, so the wallet database is already at the schema this build expects.
      ['^26']: {
        up: async () => {},
      },
    },
  },
})
