import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '#blake:26.6.7:0',
  releaseNotes: {
    en_US: `Core Lightning with support for the 164-byte BLAKE2b block header.

The BLAKE2b hard fork activated on mainnet at block 961,640. From that block on, a header is 164 bytes rather than 80 and its block id is BLAKE2b rather than SHA256d. Core Lightning computes block ids itself while following the chain, so an unmodified node cannot parse the activation block and stops there.

This build is Core Lightning v26.06.7 plus that support and nothing else. It does not resolve what the fork means for Lightning itself: a hard fork does not change genesis, so nodes on either side of the rule change still advertise the same network identity, and channels funded before the fork are valid under both rule sets. Treat it as a way to keep following the chain, not as a migration.

Your node's configuration does not change.`,
  },
  migrations: {
    up: async () => {},
    down: async () => {},
    other: {
      //Arriving from the unflavored build. Both are Core Lightning v26.06.7, so the wallet database
      //is already at the schema this build expects and there is nothing to migrate.
      //`down` is offered because the reverse switch is equally safe: the unflavored build reads the
      //same database, it just stops at the activation block.
      ['^26']: {
        up: async () => {},
        down: async () => {},
      },
    },
  },
})
