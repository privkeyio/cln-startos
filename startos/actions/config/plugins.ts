import { clnConfig, dropClboss, fullConfigSpec } from '../../fileModels/config'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { Value } = sdk

const slingPlugin = '/usr/local/libexec/c-lightning/plugins/sling'

const pluginsSpec = fullConfigSpec.filter({ clnrest: true }).add({
  sling: Value.toggle({
    name: i18n('Sling'),
    default: false,
    description: i18n(
      'Automatically rebalance multiple channels. This is a CLI-only tool.  <b>Default: Disabled</b><br><b>Source:  https://github.com/daywalker90/sling</b>',
    ),
  }),
})

export const plugins = sdk.Action.withInput(
  // id
  'plugins',

  // metadata
  async ({ effects }) => ({
    name: i18n('Plugins'),
    description: i18n(
      'Plugins are subprocesses that provide extra functionality and run alongside the lightningd process inside the main Core Lightning container in order to communicate directly with it. Their source is maintained separately from that of Core Lightning itself.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  // form input specification
  pluginsSpec,

  // optionally pre-fill the input form
  async ({ effects }) => {
    const form = await clnConfig.read().once()
    const plugins = form?.raw?.plugin || []

    return {
      ...form,
      sling: plugins.includes(slingPlugin),
    }
  },

  // the execution function
  async ({ effects, input }) => {
    const { sling, ...rest } = input
    const form = await clnConfig.read().once()
    const rawPlugins = [...(form?.raw?.plugin || [])].filter(
      (p): p is string => typeof p === 'string',
    )

    // Manage sling plugin path
    if (sling) {
      if (!rawPlugins.includes(slingPlugin)) rawPlugins.push(slingPlugin)
    } else {
      const idx = rawPlugins.indexOf(slingPlugin)
      if (idx !== -1) rawPlugins.splice(idx, 1)
    }

    await clnConfig.merge(effects, {
      ...rest,
      raw: { ...(form?.raw ?? {}), ...dropClboss(rawPlugins) },
    })
  },
)
