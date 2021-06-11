import { useRecoilValue, useSetRecoilState } from 'recoil'
import _ from 'lodash'
import BigNumber from 'bignumber.js'

import { ASSET } from 'consts'
import AuthStore from 'store/AuthStore'
import SendStore from 'store/SendStore'

import { AssetType, WhiteListType, BalanceListType } from 'types/asset'
import { BlockChainType } from 'types/network'

import useTerraBalance from './useTerraBalance'
import useEtherBaseBalance from './useEtherBaseBalance'
import useSecretBalance from './useSecretBalance'
import ContractStore from 'store/ContractStore'

const useAsset = (): {
  getAssetList: () => Promise<void>
  formatBalance: (balance: string | BigNumber) => string
} => {
  const isLoggedIn = useRecoilValue(AuthStore.isLoggedIn)
  const fromBlockChain = useRecoilValue(SendStore.fromBlockChain)
  const toBlockChain = useRecoilValue(SendStore.toBlockChain)

  const assetList = useRecoilValue(ContractStore.assetList)
  const terraWhiteList = useRecoilValue(ContractStore.terraWhiteList)
  const ethWhiteList = useRecoilValue(ContractStore.ethWhiteList)
  const bscWhiteList = useRecoilValue(ContractStore.bscWhiteList)
  const secretWhiteList = useRecoilValue(ContractStore.secretWhiteList)

  const setAssetList = useSetRecoilState(SendStore.loginUserAssetList)

  const { getTerraBalances } = useTerraBalance()
  const { getEtherBalances } = useEtherBaseBalance()
  const { getSecretBalances } = useSecretBalance()

  const getTerraWhiteList = async (): Promise<WhiteListType> => {
    return {
      ...ASSET.nativeDenoms,
      ...terraWhiteList,
    }
  }

  const setBalanceToAssetList = ({
    assetList,
    whiteList,
    balanceList,
  }: {
    assetList: AssetType[]
    whiteList: WhiteListType
    balanceList: BalanceListType
  }): AssetType[] => {
    if (_.some(balanceList)) {
      return _.map(assetList, (asset) => {
        const tokenAddress = whiteList[asset.symbol]

        return {
          ...asset,
          tokenAddress,
          balance: balanceList[tokenAddress],
        }
      }).filter((x) => x.tokenAddress)
    }

    return assetList
  }

  const getAssetList = async (): Promise<void> => {
    let whiteList: WhiteListType = {}
    let balanceList: BalanceListType = {}
    if (isLoggedIn) {
      if (fromBlockChain === BlockChainType.terra) {
        whiteList = await getTerraWhiteList()
        balanceList = await getTerraBalances({
          terraWhiteList: _.map(whiteList, (token) => ({ token })),
        })
      } else if (fromBlockChain === BlockChainType.ethereum) {
        whiteList = ethWhiteList
        balanceList = await getEtherBalances({ whiteList })
      } else if (fromBlockChain === BlockChainType.bsc) {
        whiteList = bscWhiteList
        balanceList = await getEtherBalances({ whiteList })
      } else if (fromBlockChain === BlockChainType.secret) {
        whiteList = secretWhiteList
        balanceList = await getSecretBalances({ whiteList })
      }
    }

    const fromList = setBalanceToAssetList({
      assetList,
      whiteList,
      balanceList,
    })

    if (
      fromBlockChain !== toBlockChain &&
      [
        BlockChainType.ethereum,
        BlockChainType.bsc,
        BlockChainType.secret,
      ].includes(toBlockChain)
    ) {
      let toWhiteList = ethWhiteList
      switch (toBlockChain) {
        case BlockChainType.ethereum:
          toWhiteList = ethWhiteList
          break
        case BlockChainType.bsc:
          toWhiteList = bscWhiteList
          break
        case BlockChainType.secret:
          toWhiteList = secretWhiteList
          break
      }

      const pairList = _.map(fromList, (item) => {
        const disabled = _.isEmpty(toWhiteList[item.symbol])
        return {
          ...item,
          disabled,
        }
      })

      setAssetList(pairList)
    } else {
      setAssetList(fromList)
    }
  }

  const formatBalance = (balance: string | BigNumber): string => {
    if (balance) {
      const bnBalance =
        typeof balance === 'string' ? new BigNumber(balance) : balance

      return fromBlockChain === BlockChainType.terra
        ? bnBalance.div(ASSET.TERRA_DECIMAL).toString(10)
        : fromBlockChain === BlockChainType.secret
        ? bnBalance.div(ASSET.SECRET_DECIMAL).toString(10)
        : bnBalance
            .div(ASSET.ETHER_BASE_DECIMAL / ASSET.TERRA_DECIMAL)
            .integerValue(BigNumber.ROUND_DOWN)
            .div(ASSET.TERRA_DECIMAL)
            .toString(10)
    }

    return ''
  }

  return {
    getAssetList,
    formatBalance,
  }
}

export default useAsset
