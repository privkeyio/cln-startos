import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'c-lightning',
  title: 'Core Lightning',
  license: 'mit',
  packageRepo: 'https://github.com/privkeyio/cln-startos',
  upstreamRepo: 'https://github.com/privkeyio/lightning',
  marketingUrl: 'https://github.com/privkeyio/lightning',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  virtualNetworking: true,
  images: {
    lightning: {
      source: {
        dockerBuild: {
          dockerfile: 'Dockerfile',
          workdir: '.',
        },
      },
      arch: ['x86_64', 'aarch64'],
      emulateMissing: true,
    },
    ui: {
      source: {
        dockerBuild: {
          dockerfile: 'Dockerfile.ui',
          workdir: '.',
        },
      },
      arch: ['x86_64', 'aarch64'],
      emulateMissing: true,
    },
  },
})
