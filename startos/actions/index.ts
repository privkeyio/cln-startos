import { sdk } from '../sdk'
import { experimental } from './config/experimental'
import { config } from './config/config'
import { plugins } from './config/plugins'
import { createRune } from './generateRune'
import { revokeRunes } from './revokeRunes'
import { deleteGossipStore } from './deleteGossipStore'
import { resetPassword } from './resetPassword'
import { rescanBlockchain } from './rescanBlockchain'
import { nodeInfo } from './nodeInfo'
import { displaySeed } from './displaySeed'
import { clearnetVpn } from './clearnetVpn'
import { payInvoice } from './payInvoice'
import { receivePayment } from './receivePayment'

export const actions = sdk.Actions.of()
  .addAction(config)
  .addAction(displaySeed)
  .addAction(experimental)
  .addAction(plugins)
  .addAction(createRune)
  .addAction(revokeRunes)
  .addAction(deleteGossipStore)
  .addAction(resetPassword)
  .addAction(rescanBlockchain)
  .addAction(nodeInfo)
  .addAction(clearnetVpn)
  .addAction(payInvoice)
  .addAction(receivePayment)

// @TODO generate-lnlink
