import {Asset, Horizon, ServerApi} from "stellar-sdk";
import {useEffect, useState} from "react";
import loopcall from "@cosmic-plus/loopcall";
import BigNumber from "bignumber.js";
import {server} from "./common";
import assert from "assert";

type BalanceLine = Horizon.BalanceLine;
type BalanceLineAsset = Horizon.BalanceLineAsset;
type BalanceLineLiquidityPool = Horizon.BalanceLineLiquidityPool;
type BalanceLineNative = Horizon.BalanceLineNative;

export const getBalanceLineForAssetFromAccount = (asset: Asset, account: ServerApi.AccountRecord): BalanceLineAsset|undefined => {
    return account.balances
        .filter((b: BalanceLine): b is (Exclude<BalanceLine, BalanceLineLiquidityPool|BalanceLineNative>) => b.asset_type === asset.getAssetType() && !asset.isNative())
        .find((b: BalanceLineAsset) => (b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer()));
}

export const isAssetBalanceAboveThreshold = (balanceLine: Exclude<BalanceLine, BalanceLineLiquidityPool>|undefined, threshold: BigNumber): boolean => {
    if (!balanceLine) return false;
    return threshold.lte(balanceLine.balance);
}

export interface AccountRecord {
    id: string;
    balance: string;
}

interface UseAccountsState {
    accounts: AccountRecord[];
    count: number;
    loading: boolean;
    abort: () => void;
    search: () => void;
}

interface GetAssetsProps {
    asset: Asset;
    threshold: number;
    limit?: number;
    abortSignal?: AbortSignal;
    onStep?: (account: AccountRecord) => void;
}

export const getAccountsWithAssetBalanceOverThreshold = ({
                                                             asset,
                                                             threshold,
                                                             limit,
                                                             abortSignal,
                                                             onStep
                                                         }: GetAssetsProps): Promise<boolean> => {
    assert(!asset.isNative(), "asset can not be native")
    const thresholdBigNumber = new BigNumber(threshold);
    let count = 0;

    const processFilterAccountByBalanceThreshold = (account: ServerApi.AccountRecord) => {
        const balanceLine = getBalanceLineForAssetFromAccount(asset, account);

        const rAccount = {id: account.id, balance: balanceLine?.balance??''};
        Object.keys(account).forEach(key => delete (account as {[name: string]: any})[key]);
        if (isAssetBalanceAboveThreshold(balanceLine, thresholdBigNumber)) {
            onStep?.(rAccount);
            count++;
        }
        return false;
    }

    return loopcall(
        server.accounts().forAsset(asset).limit(50),
        {
            filter: processFilterAccountByBalanceThreshold,
            breaker: () => {
                if (abortSignal?.aborted) {
                    console.warn("abort by signal");
                    return true;
                }
                if (limit !== undefined && limit >= count) {
                    console.log("account limit reached: ", limit);
                    return true;
                }
                return false;
            }
        })
        .then(() => true);
};

const useAccounts = (asset: Asset|undefined, threshold: number|undefined, limit?: number): UseAccountsState => {
    const [shouldSearch, setShouldSearch] = useState(false);
    const fetchAccountsAbortController = new AbortController();
    const [state, setState] = useState<UseAccountsState>({
        accounts: [],
        count: 0,
        loading: false,
        abort: () => { fetchAccountsAbortController.abort(); },
        search: () => { setShouldSearch(true); }
    });

    useEffect(() => {
        console.log('change...')
        if (!shouldSearch) return;
        if (state.loading) return;
        if (!asset) {
            state.abort();
            return;
        }
        setState(p => ({...p, loading: true, accounts: [], count: 0}));
        setShouldSearch(false);
        getAccountsWithAssetBalanceOverThreshold({
            asset: asset,
            threshold: threshold??0,
            limit: limit,
            abortSignal: fetchAccountsAbortController.signal,
            onStep: a => {
                setState(p => {
                    const newAccounts = !!(p.accounts.find(pa => pa.id === a.id))
                        ? p.accounts
                        : p.accounts.concat(a);
                    return {...p,
                        count: newAccounts.length,
                        accounts: newAccounts,
                    };
                });
            }
        })
            .then(done => {
                //state.abort();
            })
            .catch((e: any) => console.warn(e))
            .finally(() => {
                setState(p => ({...p, loading: false}));
            });

        return () => {
            console.log('unloading useAccounts hook')
            state.abort();
        }
        // eslint-disable-next-line
    }, [asset, threshold, shouldSearch]);

    return state;
}

export default useAccounts;
