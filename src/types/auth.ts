import { WalletConnect } from 'services/terraWalletConnectService'
import { ethers } from 'ethers'
import { WalletEnum } from './wallet'
import { SigningCosmWasmClient } from 'secretjs'

export type User = {
  address: string
  walletConnect?: WalletConnect
  provider?: ethers.providers.Web3Provider
  signingCosmWasmClient?: SigningCosmWasmClient
  walletType: WalletEnum
}
