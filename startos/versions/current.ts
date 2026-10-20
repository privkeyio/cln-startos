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
  version: '#blake:26.6.9:1',
  releaseNotes: {
    en_US: `Core Lightning v26.06.9-blake2b.8, based on upstream v26.06.9. We strongly recommend updating.

## Notes for operators

- Updating from the previous version upgrades the node's database once, at its first start. The previous version cannot use the upgraded database, so back up before updating if you may need to go back. The two versions peer normally, including splices.
- If the node stops with "80-byte header", its Bitcoin service is not following BLAKE2b. Point it at one that is.
- Channels opened with \`v26.06.7-blake2b.1\` to \`.3\` do not use unified signatures. Close them and open new ones.

This release brings splice and dual-funding fixes, and on channels with unified signatures it signs our half of HTLC transactions as BOLT 3 requires.

Your node's configuration does not change.`,
  },
  migrations: {
    up: removeClboss,
    //Refuse every downgrade. Channels opened here negotiate unified signing, and a build without it
    //computes a different signature hash, so it cannot close them. lightning-downgrade refuses for
    //the same reason.
    down: IMPOSSIBLE,
    other: {
      //Arriving from the unflavored build, or from the header-only flavor. Both are Core Lightning
      //v26.06.7; lightningd upgrades the wallet database on its first start.
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
      //Arriving from Core Lightning v26.06.7-blake2b.4.
      ['#blake:26.6.7:3']: {
        up: removeClboss,
      },
      //Arriving from Core Lightning v26.06.8-blake2b.5.
      ['#blake:26.6.8:0']: {
        up: removeClboss,
      },
      //Arriving from Core Lightning v26.06.8-blake2b.6.
      ['#blake:26.6.8:1']: {
        up: removeClboss,
      },
      //Arriving from Core Lightning v26.06.9-blake2b.7.
      ['#blake:26.6.9:0']: {
        up: removeClboss,
      },
    },
  },
})
