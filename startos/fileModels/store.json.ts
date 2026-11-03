import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  rescan: z.number().optional().catch(undefined),
  restore: z.boolean().optional().catch(undefined),
  customExternalHosts: z.array(z.string()).catch([]),
  // Verbatim: the companion's task compares it byte for byte.
  clearnetVpn: z
    .looseObject({
      config: z.string(),
      announce: z.string().nullable().catch(null),
    })
    .nullable()
    .catch(null),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: '/store.json' },
  shape,
)
