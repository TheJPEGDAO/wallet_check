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
}

interface GetAssetsProps {
    asset: Asset;
    threshold: number;
    limit?: number;
    getAccountsAbortController?: AbortController;
    onStep?: (account: AccountRecord) => void;
}

export const getAccountsWithAssetBalanceOverThreshold = ({
                                                             asset,
                                                             threshold,
                                                             limit,
                                                             getAccountsAbortController,
                                                             onStep
                                                         }: GetAssetsProps): Promise<boolean> => {
    assert(!asset.isNative(), "asset can not be native")
    const thresholdBigNumber = new BigNumber(threshold);
    let count = 0;

    const processFilterAccountByBalanceThreshold = (account: ServerApi.AccountRecord) => {
        const balanceLine = getBalanceLineForAssetFromAccount(asset, account);

        const rAccount = {id: account.id, balance: balanceLine?.balance??''};
        // @ts-ignore
        Object.keys(account).forEach(key => delete account[key]);
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
                return getAccountsAbortController?.signal.aborted || (limit !== undefined && limit <= count)
            }
        })
        .then(() => true);
};

const useAccounts = (asset: Asset, threshold: number, limit?: number): UseAccountsState => {
    const [state, setState] = useState<UseAccountsState>({
        accounts: [],
        count: 0,
        loading: false,
        abort: () => {},
    });

    useEffect(() => {
        const fetchAccountsAbortController = new AbortController();
        setState({loading: true, accounts: [], abort: () => {
            console.warn("Abort loading accounts");
            fetchAccountsAbortController.abort();
            }, count: 0});

        getAccountsWithAssetBalanceOverThreshold({
            asset: asset,
            threshold: threshold,
            limit: limit,
            getAccountsAbortController: fetchAccountsAbortController,
            onStep: a => {
                setState(p => ({...p, count: p.count + 1, accounts: p.accounts.concat(a)}));
            }
        })
            .then(done => {
                console.log(`done loading ${state.count} accounts`)
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
