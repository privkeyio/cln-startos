import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { removeDroppedPlugins } from '../fileModels/config'

//CLBOSS and the watchtower client are no longer shipped, so a config that loaded either
//names a binary that is not there and lightningd exits at startup. Every edge into this
//version runs this.
const removePlugins = ({ effects }: { effects: T.Effects }) =>
  removeDroppedPlugins(effects)

export const current = VersionInfo.of({
  version: '#blake:26.6.9:4',
  releaseNotes: {
    en_US: `Core Lightning v26.06.9-blake2b.10, based on upstream v26.06.9. We strongly recommend updating.

- The wallet holds a mainnet coinbase output mined at block 979919 or later for 25920 blocks before spending it, matching Bitcoin Knots 29.4.3. Earlier coinbase outputs keep 6480 blocks.
- Our own transactions pay at least the Bitcoin service's minimum fee when it is above 1 sat/vB, and HTLC penalty and fulfill spends count the witness stack element when sizing their fee.
- A shutdown requested during a signed splice waits until the splice locks, unless the peer has already sent its shutdown. If a splice candidate confirms after a mutual close, the node publishes its commitment for it and resolves the channel on chain.
- Blocks from the Bitcoin service are parsed more strictly, and a dual-funded open or splice rejects outputs above the maximum money supply, alone or in total.

The watchtower stays removed for now. The Eye of Satoshi's tower cannot read BLAKE2b block headers, so it cannot watch these channels. Updating from a version that had it turns the watchtower server and client off. It returns once it supports BLAKE2b.

## Notes for operators

- Updating from \`#blake:26.6.9:1\`, \`#blake:26.6.9:2\` or \`#blake:26.6.9:3\` does not change the database.
- Updating from a version before \`#blake:26.6.9:1\` upgrades the node's database once, at its first start. That version cannot use the upgraded database, so back up before updating if you may need to go back.
- If the node stops with "80-byte header", its Bitcoin service is not following BLAKE2b. Point it at one that is.
- Channels opened with \`v26.06.7-blake2b.1\` to \`.3\` do not use unified signatures. Close them and open new ones.`,
  },
  migrations: {
    up: removePlugins,
    //Refuse every downgrade. Channels opened here negotiate unified signing, and a build without it
    //computes a different signature hash, so it cannot close them. lightning-downgrade refuses for
    //the same reason.
    down: IMPOSSIBLE,
    other: {
      //Arriving from the unflavored build, or from the header-only flavor. Both are Core Lightning
      //v26.06.7; lightningd upgrades the wallet database on its first start.
      ['^26']: {
        up: removePlugins,
      },
      //Arriving from the first blake flavor, whose web interface used commando.
      ['#blake:26.6.7:1']: {
        up: removePlugins,
      },
      //Arriving from the flavor that shipped CLBOSS and linked to an explorer that has not adopted BLAKE2b.
      ['#blake:26.6.7:2']: {
        up: removePlugins,
      },
      //Arriving from Core Lightning v26.06.7-blake2b.4.
      ['#blake:26.6.7:3']: {
        up: removePlugins,
      },
      //Arriving from Core Lightning v26.06.8-blake2b.5.
      ['#blake:26.6.8:0']: {
        up: removePlugins,
      },
      //Arriving from Core Lightning v26.06.8-blake2b.6.
      ['#blake:26.6.8:1']: {
        up: removePlugins,
      },
      //Arriving from Core Lightning v26.06.9-blake2b.7.
      ['#blake:26.6.9:0']: {
        up: removePlugins,
      },
      //Arriving from the flavor that shipped The Eye of Satoshi.
      ['#blake:26.6.9:1']: {
        up: removePlugins,
      },
      //Arriving from Core Lightning v26.06.9-blake2b.8 without the watchtower.
      ['#blake:26.6.9:2']: {
        up: removePlugins,
      },
      //Arriving from Core Lightning v26.06.9-blake2b.9.
      ['#blake:26.6.9:3']: {
        up: removePlugins,
      },
    },
  },
})
