import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'
import { removeDroppedPlugins } from '../fileModels/config'
import { sdk } from '../sdk'

//CLBOSS and the watchtower client are no longer shipped, so a config that loaded either
//names a binary that is not there and lightningd exits at startup. Every edge into this
//version runs this. Versions before #blake:26.6.10:0 reach this one through it, so they also
//run its invoice rune removal.
//The RPC socket now lives on the public volume, so the one an earlier version left in main is
//removed.
const removePluginsAndOldSocket = async ({
  effects,
}: {
  effects: T.Effects
}) => {
  await removeDroppedPlugins(effects)
  await rm(sdk.volumes.main.subpath('./bitcoin/lightning-rpc'), { force: true })
}

export const current = VersionInfo.of({
  version: '#blake:26.6.10:2',
  releaseNotes: {
    en_US: `Requires StartOS 0.4.1 or later. Core Lightning v26.06.10-blake2b.2, which we recommend especially if you splice.

- After a splice changes the channel reserves, the node keeps the earlier reserves for its own payments until the peer has had a chance to switch, and accepts the peer's payments under the earlier reserves on that connection. This avoids channel failures with peers that switch at a different point, including Lightning Fork.
- A splice is treated as locked when the peer's later messages show it locked, even if its lock message was lost.
- Splice negotiation now checks the channel reserve.
- renepay accounts correctly for payment parts it did not send itself, and gossip processing is limited per peer.
- Fixes memory use growing while the service runs.
- Services that depend on Core Lightning now connect through a separate volume, either with a rune limited to invoices and payments or with full control of the node through its RPC socket, gRPC or admin rune. Services that use the RPC socket need their own update to keep connecting.
- Peers can now connect to your node over its IPv6 addresses.

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

- This update upgrades the node's database once, at its first start. Earlier versions cannot use the upgraded database, so back up before updating if you may need to go back.
- If the node stops with "80-byte header", its Bitcoin service is not following BLAKE2b. Point it at one that is.
- Channels opened with \`v26.06.7-blake2b.1\` to \`.3\` do not use unified signatures. Close them and open new ones.`,
  },
  migrations: {
    up: removePluginsAndOldSocket,
    //Refuse every downgrade. Channels opened here negotiate unified signing, and a build without it
    //computes a different signature hash, so it cannot close them. lightning-downgrade refuses for
    //the same reason.
    down: IMPOSSIBLE,
  },
})
