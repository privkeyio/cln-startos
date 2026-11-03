import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { readFile, writeFile } from 'fs/promises'
import { removeDroppedPlugins } from '../fileModels/config'
import { commandoEnv } from '../utils'

//CLBOSS and the watchtower client are no longer shipped, so a config that loaded either
//names a binary that is not there and lightningd exits at startup. Every edge into this
//version runs this.
const removePlugins = ({ effects }: { effects: T.Effects }) =>
  removeDroppedPlugins(effects)

//An invoice rune made by a web interface before 26.09 does not work with wallets. Only edges from
//such a version run this, so a rune made by 26.09 is kept.
const removePluginsAndOldInvoiceRune = async ({
  effects,
}: {
  effects: T.Effects
}) => {
  await removeDroppedPlugins(effects)
  const env = await readFile(commandoEnv, 'utf-8').catch(() => null)
  if (env === null) return
  await writeFile(commandoEnv, env.replace(/^INVOICE_RUNE=.*\n?/m, ''))
}

export const current = VersionInfo.of({
  version: '#blake:26.6.9:5',
  releaseNotes: {
    en_US: `Brings in Start9's latest updates to the package. The node is still Core Lightning v26.06.9-blake2b.10.

- The web interface moves to CLN Application 26.09, a security release from its developers, and runs on Node.js with the October 2026 security fixes. Its transaction links still go to an explorer that follows BLAKE2b.
- Invoice runes created from the Connect Wallet screen now work with wallets. An invoice rune created there by an earlier version is removed during this update, so create a new one from the same screen.
- New Pay Invoice and Receive Payment actions.
- Create Rune asks what the rune may do: read-only, limited to restrictions you enter, or unrestricted.
- Certificates from the compromised eMudhra certificate authority are no longer trusted.
- The bundled bitcoin-cli is updated to 31.1.

The watchtower and CLBOSS stay removed, since neither can follow BLAKE2b yet.

## Notes for operators

- Updating from \`#blake:26.6.9:1\` through \`#blake:26.6.9:4\` does not change the database.
- Updating from a version before \`#blake:26.6.9:1\` upgrades the node's database once, at its first start. That version cannot use the upgraded database, so back up before updating if you may need to go back.
- If the node stops with "80-byte header", its Bitcoin service is not following BLAKE2b. Point it at one that is.
- Channels opened with \`v26.06.7-blake2b.1\` to \`.3\` do not use unified signatures. Close them and open new ones.`,
  },
  migrations: {
    up: removePluginsAndOldInvoiceRune,
    //Refuse every downgrade. Channels opened here negotiate unified signing, and a build without it
    //computes a different signature hash, so it cannot close them. lightning-downgrade refuses for
    //the same reason.
    down: IMPOSSIBLE,
    other: {
      //Arriving from the unflavored build, or from the header-only flavor. Both are Core Lightning
      //v26.06.7; lightningd upgrades the wallet database on its first start.
      ['^26 && <26.6.8:3']: {
        up: removePluginsAndOldInvoiceRune,
      },
      ['^26 && >=26.6.8:3']: {
        up: removePlugins,
      },
      //Arriving from the first blake flavor, whose web interface used commando.
      ['#blake:26.6.7:1']: {
        up: removePluginsAndOldInvoiceRune,
      },
      //Arriving from the flavor that shipped CLBOSS and linked to an explorer that has not adopted BLAKE2b.
      ['#blake:26.6.7:2']: {
        up: removePluginsAndOldInvoiceRune,
      },
      //Arriving from Core Lightning v26.06.7-blake2b.4.
      ['#blake:26.6.7:3']: {
        up: removePluginsAndOldInvoiceRune,
      },
      //Arriving from Core Lightning v26.06.8-blake2b.5.
      ['#blake:26.6.8:0']: {
        up: removePluginsAndOldInvoiceRune,
      },
      //Arriving from Core Lightning v26.06.8-blake2b.6.
      ['#blake:26.6.8:1']: {
        up: removePluginsAndOldInvoiceRune,
      },
      //Arriving from Core Lightning v26.06.9-blake2b.7.
      ['#blake:26.6.9:0']: {
        up: removePluginsAndOldInvoiceRune,
      },
      //Arriving from the flavor that shipped The Eye of Satoshi.
      ['#blake:26.6.9:1']: {
        up: removePluginsAndOldInvoiceRune,
      },
      //Arriving from Core Lightning v26.06.9-blake2b.8 without the watchtower.
      ['#blake:26.6.9:2']: {
        up: removePluginsAndOldInvoiceRune,
      },
      //Arriving from Core Lightning v26.06.9-blake2b.9.
      ['#blake:26.6.9:3']: {
        up: removePluginsAndOldInvoiceRune,
      },
    },
  },
})
