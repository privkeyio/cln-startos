import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { removeDroppedPlugins } from '../fileModels/config'

//CLBOSS and the watchtower client are no longer shipped, so a config that loaded either
//names a binary that is not there and lightningd exits at startup. Every edge into this
//version runs this. Versions before #blake:26.6.10:0 reach this one through it, so they also
//run its invoice rune removal.
const removePlugins = ({ effects }: { effects: T.Effects }) =>
  removeDroppedPlugins(effects)

export const current = VersionInfo.of({
  version: '#blake:26.6.10:1',
  releaseNotes: {
    en_US: `Requires StartOS 0.4.1 or later. Fixes memory use growing while the service runs. The node is still Core Lightning v26.06.10-blake2b.1.

If you are updating from a version before \`#blake:26.6.10:0\`, this update also brings:

- Core Lightning v26.06.10-blake2b.1, based on upstream v26.06.10, which fixes security-relevant bugs: onchaind HTLC resolution, dual-funding and splice fixes, and gossip size limits.
- Channels funded before the BLAKE2b activation are treated as private in gossip.
- Transactions and PSBTs whose outputs exceed the maximum money supply are refused.
- xpay holds payments until its startup requests have answered, and renepay handles failed payment routes more carefully.
- The web interface moves to CLN Application 26.09, a security release from its developers. Its transaction links still go to an explorer that follows BLAKE2b.
- Invoice runes created from the Connect Wallet screen now work with wallets. An invoice rune created there by an earlier version is removed during this update, so create a new one from the same screen.
- New Pay Invoice and Receive Payment actions.
- Create Rune asks what the rune may do: read-only, limited to restrictions you enter, or unrestricted.
- Certificates from the compromised eMudhra certificate authority are no longer trusted.
- The bundled bitcoin-cli is updated to 32.1.

The watchtower and CLBOSS stay removed, since neither can follow BLAKE2b yet.

## Notes for operators

- Updating from \`#blake:26.6.9:1\` through \`#blake:26.6.10:0\` does not change the database.
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
  },
})
