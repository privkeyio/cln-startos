import { IMPOSSIBLE, T, VersionInfo } from '@start9labs/start-sdk'
import { access, readFile, rm } from 'fs/promises'
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

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  )

//Arriving from the recovery package (github.com/chrisguida/cln-startos, flavor `recovery`), which
//moves a node that followed the SHA256d chain past the split over to BLAKE2b. Its last action,
//Recovery: Finish, leaves the volume in this package's layout: the BLAKE2b node's data in place,
//this same lightningd version, and the SHA256d data archived under recovery/sha256d, which
//nothing here reads. So the only work is to refuse a recovery that is not finished. Until Finish,
//the node's own data belongs to the SHA256d chain and starting this build on it would rescan the
//wrong chain's channels. StartOS keeps the recovery package installed when this throws.
const arriveFromRecovery = async ({ effects }: { effects: T.Effects }) => {
  const main = (path: string) => sdk.volumes.main.subpath(path)
  //The recovery package's fields are not in this package's store model: read the file as it is.
  const store: Record<string, unknown> = await readFile(
    main('./store.json'),
    'utf-8',
  ).then(
    (s) => JSON.parse(s),
    () => ({}),
  )
  const config = await readFile(main('./config'), 'utf-8').catch(() => '')

  if (
    store.recovery ||
    store.blake2b ||
    store.finish ||
    (await exists(main('./recovery/blake2b')))
  ) {
    throw new Error(
      'This node is in the middle of a chain recovery. Go back to the recovery package, run Recovery: Status, and install this package only after Recovery: Finish.',
    )
  }
  if (store.bitcoinBackend === 'knots-prerdts') {
    throw new Error(
      'This node follows the SHA256d chain (Bitcoin Backend is Knots pre-RDTS). This package runs on the BLAKE2b chain only.',
    )
  }
  if (/^network\s*=\s*(?!bitcoin\s*$)/m.test(config)) {
    throw new Error(
      'This node runs on a test network. This package runs on mainnet only.',
    )
  }

  //Finish asks the recovery package to drop the gossip gathered on the SHA256d chain at its next
  //start. If that start never happened, drop it here.
  if (store.wipeGossip) {
    await rm(main('./bitcoin/gossip_store'), { force: true })
  }

  await removePluginsAndOldSocket({ effects })
}

export const current = VersionInfo.of({
  version: '#blake:26.6.10:1',
  releaseNotes: {
    en_US: `Requires StartOS 0.4.1 or later. The node is still Core Lightning v26.06.10-blake2b.1.

- Fixes memory use growing while the service runs.
- Services that depend on Core Lightning now connect through a separate volume, either with a rune limited to invoices and payments or with full control of the node through its RPC socket, gRPC or admin rune. Services that use the RPC socket need their own update to keep connecting.
- Peers can now connect to your node over its IPv6 addresses.
- Can be installed over the recovery package (the \`#recovery\` flavor) once its Recovery: Finish action has run.

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
    up: removePluginsAndOldSocket,
    //Refuse every downgrade. Channels opened here negotiate unified signing, and a build without it
    //computes a different signature hash, so it cannot close them. lightning-downgrade refuses for
    //the same reason.
    down: IMPOSSIBLE,
    other: {
      ['>=#recovery:26.6.10:0']: {
        up: arriveFromRecovery,
      },
    },
  },
})
