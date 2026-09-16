import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { clnConfig, dropClboss } from '../fileModels/config'

//CLBOSS is no longer shipped, so a config that loaded it names a binary that is not
//there and lightningd exits at startup. Every edge into this version runs this.
const removeClboss = async ({ effects }: { effects: T.Effects }) => {
  const form = await clnConfig.read().once()
  const plugins = (form?.raw?.plugin ?? []).filter(
    (p): p is string => typeof p === 'string',
  )
  await clnConfig.merge(effects, {
    raw: { ...(form?.raw ?? {}), ...dropClboss(plugins) },
  })
}

export const current = VersionInfo.of({
  version: '#blake:26.6.7:3',
  releaseNotes: {
    en_US: `Core Lightning with support for the 164-byte BLAKE2b block header, now with unified signatures.

The BLAKE2b hard fork activated on mainnet at block 961,640. From that block on, a header is 164 bytes rather than 80 and its block id is BLAKE2b rather than SHA256d. Core Lightning computes block ids itself while following the chain, so an unmodified node cannot parse the activation block and stops there.

This build adds SIGHASH_UNIFIED signing for the wallet and for new channels. A channel funded past activation, from coins that are themselves post-activation, is signed with hash type \`0x21\`, which is invalid under the pre-fork rules, and so cannot be replayed on the SHA256d chain.

The web interface now links transactions to an explorer that indexes this chain. It previously linked to one that indexes the SHA256d chain, where a transaction from this node does not exist.

CLBOSS is no longer included. It buys inbound liquidity through a submarine swap service that settles on the SHA256d chain, so a swap here would pay a counterparty that never credits you. If you had it enabled, it is removed from your configuration on update and its settings are cleared.

## Read this before opening channels

The node signals a required feature bit, so it will not connect to a Lightning node still on the pre-fork rules. That is deliberate: it stops you opening a channel with a peer that cannot follow the chain past activation. It also means you cannot cooperatively close a channel opened before activation with a counterparty still on the pre-fork rules.

The feature numbers are provisional and are expected to change. Channels opened now may have to be closed and reopened once they are settled. Fund channels only from coins received past activation.

The web interface talks to the node over CLNrest. Earlier builds used commando, which rides the Lightning peer protocol, and this build refuses peers still on the pre-fork rules, so the dashboard could not connect.

Your node's configuration does not otherwise change.`,
  },
  migrations: {
    up: removeClboss,
    //Refuse every downgrade. Channels opened here negotiate unified signing, and a build without it
    //computes a different signature hash, so it cannot close them. lightning-downgrade refuses for
    //the same reason.
    down: IMPOSSIBLE,
    other: {
      //Arriving from the unflavored build, or from the header-only flavor. Both are Core Lightning
      //v26.06.7, so the wallet database is already at the schema this build expects.
      ['^26']: {
        up: removeClboss,
      },
      //Arriving from the first blake flavor, whose web interface used commando.
      ['#blake:26.6.7:1']: {
        up: removeClboss,
      },
      //Arriving from the flavor that shipped CLBOSS and linked to a SHA256d chain explorer.
      ['#blake:26.6.7:2']: {
        up: removeClboss,
      },
    },
  },
})
