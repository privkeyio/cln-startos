import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { removeDroppedPlugins } from '../fileModels/config'

//CLBOSS and the watchtower client are no longer shipped, so a config that loaded either
//names a binary that is not there and lightningd exits at startup. Every edge into this
//version runs this. Versions before #blake:26.6.10:0 reach this one through it, so they also
//run its invoice rune removal.
const removePlugins = ({ effects }: { effects: T.Effects }) =>
  removeDroppedPlugins(effects)

export const current = VersionInfo.of({
  version: '#blake:26.6.10:2',
  releaseNotes: {
    en_US: `Adds channel labels, splice controls and confirmation status, corrected channel layout, advertised peer addresses and XBT fiat prices from Neoxa. Prices are fetched without wallet amounts. Builds the UI from pinned source with tests. Updates the Start9 SDK to 4.1.0. The native Core Lightning engine is unchanged.`,
  },
  migrations: {
    up: removePlugins,
    //Refuse every downgrade. Channels opened here negotiate unified signing, and a build without it
    //computes a different signature hash, so it cannot close them. lightning-downgrade refuses for
    //the same reason.
    down: IMPOSSIBLE,
  },
})
