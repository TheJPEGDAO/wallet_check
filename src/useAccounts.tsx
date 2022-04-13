import {Asset, Horizon, ServerApi} from "stellar-sdk";
import {useEffect, useState} from "react";
import loopcall from "@cosmic-plus/loopcall";
import BigNumber from "bignumber.js";
import {server} from "./common";

type BalanceLineLiquidityPool = Horizon.BalanceLineLiquidityPool;
type BalanceLine = Horizon.BalanceLine;

export const getBalanceLineForAssetFromAccount = (asset: Asset, account: ServerApi.AccountRecord): Exclude<BalanceLine, BalanceLineLiquidityPool>|undefined => {
    return account.balances
        .filter((b: BalanceLine): b is (Exclude<BalanceLine, BalanceLineLiquidityPool>) => b.asset_type === asset.getAssetType())
        .find((b: Exclude<BalanceLine, BalanceLineLiquidityPool>) => b.asset_type === 'native' ||
            (b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer())
        );
}

export const isAssetBalanceAboveThreshold = (balanceLine: Exclude<BalanceLine, BalanceLineLiquidityPool>|undefined, threshold: BigNumber): boolean => {
    if (!balanceLine) return false;
    return threshold.lte(balanceLine.balance);
}

interface UseAccountsState {
    accounts: ServerApi.AccountRecord[],
    count: number
    loading: boolean,
    abort: () => void,
}

const useAccounts = (asset: Asset, threshold: number, limit?: number): UseAccountsState => {
    const [state, setState] = useState<UseAccountsState>({
        accounts: [],
        count: 0,
        loading: false,
        abort: () => {},
    });

    useEffect(() => {
        const thresholdBigNumber = new BigNumber(threshold);
        const fetchAccountsAbortController = new AbortController();
        const processFilterAccountByBalanceThreshold = (account: ServerApi.AccountRecord) => {
            const balanceLine = getBalanceLineForAssetFromAccount(asset, account);
            if (balanceLine) {
                account.balances = [balanceLine];
            }
            if (isAssetBalanceAboveThreshold(balanceLine, thresholdBigNumber)) {
                setState(p => ({...p, count: p.count + 1}));
                return true;
            }
            return false;
        }

        setState({loading: true, accounts: [], abort: () => {fetchAccountsAbortController.abort();}, count: 0});
        loopcall(
            server.accounts().forAsset(asset),
            {
                limit: limit,
                filter: processFilterAccountByBalanceThreshold,
                breaker: () => fetchAccountsAbortController.signal.aborted
            })
            .then((accounts: ServerApi.AccountRecord[]) => {
                setState(p => ({...p, accounts: accounts, count: accounts.length}));
            })
            .catch((e: any) => console.warn(e))
            .finally(() => {
                setState(p => ({...p, loading: false}));
            });

        return () => {
            fetchAccountsAbortController.abort();
        }
    }, [asset, limit, threshold]);

    return state;
}

export default useAccounts;
