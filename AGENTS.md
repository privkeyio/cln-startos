# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes. This file restates neither:
whoever changes the package has both, so it carries only what they don't — repo mechanics,
a change that looks right and is not, where the next thing gets added, a naming trap, a
build or test invocation particular to this repo.

**Fix a defect you spot rather than reporting it** — you have the package open and the
context to be sure. File **a GitHub issue on this repo** only when the call isn't yours to
make: you can't pin the cause down, two defensible fixes exist, or it's too large to ride on
the work in hand. An open issue is a report, not a queue — implement one when you're asked
to or when it's labelled `Approved`, then close it with `Closes #<n>`.

Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **Package id is `c-lightning`, not `cln`.** Dependents, `effects` calls, and `start-cli` all take `c-lightning`; several sibling packages import from `cln-startos/startos/utils` for its ports.
- **`startos/utils.ts`, `startos/manifest`, and the `clearnet-vpn`, `pay-invoice` and `revoke-runes` actions are a public API.** Sibling packages import ports from `utils` (`clnrestPort`, `grpcPort`), the manifest, and those three action objects. Renaming or moving one breaks their builds — grep both registries before you do.
- **Nothing loads a CLN plugin from the volume at runtime.** The `Dockerfile` installs `sling` from an upstream release binary, so changing it means rebuilding the image. The `clboss/` and `rust-teos/` submodules are kept but not built: CLBOSS buys liquidity through a swap service that has not adopted BLAKE2b, and The Eye of Satoshi's tower cannot read BLAKE2b block headers.
- **`rescan` and `restore` in `store.json` must not be cleared where they are read.** A session where `lightningd` never starts must not consume the request — that is how a rescan asked for during a crash loop used to disappear. The `consume-flags` oneshot clears them only once the node answers RPC, and `main`'s store watch treats a clear-to-`undefined` as equal so that write does not restart the service. Keep both halves if you add another one-shot flag.
- **`clnrest-protocol` is forced to `http` deliberately** — upstream defaults it to https. Tor already encrypts and its clients cannot validate a StartOS certificate; LAN and clearnet get TLS from the edge listener instead.
- **Watch a credential file that gates an interface export with a null-tolerant `eq`.** Revoke Runes deletes `.commando-env` before the replacement rune is minted; reacting to that gap de-exports CLNrest, and anything watching that interface — `nutshell` reads its `addressInfo.suffix` for the rune — sees it vanish and restarts.
- **Check the `rust-teos` and `clboss` gitlinks before every commit.** A tree-wide `git add -A`/`git commit -a` made while a submodule working directory sits on an older commit rewrites its pin as one silent line. The `26.6.6:14` branch lost the TEOS pin twice this way while its release notes still advertised the bump — `git diff --cached rust-teos clboss` is the check.
