import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.object({
  rescan: z.number().optional().catch(undefined),
  restore: z.boolean().optional().catch(undefined),
  customExternalHosts: z.array(z.string()).catch([]),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: '/store.json' },
  shape,
)
