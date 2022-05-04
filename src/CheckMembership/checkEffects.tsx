import BigNumber from "bignumber.js";
import {AccountCredited, DepositLiquidityEffect, WithdrawLiquidityEffect} from "stellar-sdk/lib/types/effects";
import {checkMembershipStepFn, isAssetRecordJPEG, JPEGAsset} from "./index";
import SnapshotData from "../SnapshotData";
import {ServerApi} from "stellar-sdk";
import {OfferAsset} from "stellar-sdk/lib/types/offer";
import loopcall from "@cosmic-plus/loopcall";
import {getStellarAsset, server} from "../common";

type stepFnCheckEffects = checkMembershipStepFn<{
    account: string;
    snapshot: SnapshotData;
}, [{balanceLow: BigNumber}?]>;

export const checkEffects = (account: string, from: Date, to: Date, onStep: () => void): Promise<BigNumber[]> => {
    const filter = (record: ServerApi.EffectRecord) => {
        if (to < new Date(record.created_at)) return false;
        if (['account_credited', 'account_debited'].some(e => e === record.type)) {
            onStep();
            if (isAssetRecordJPEG(record as OfferAsset)) return true;
        }
        if (['liquidity_pool_withdrew', "liquidity_pool_deposited"].some(e => e === record.type)) {

            if ((record as unknown as WithdrawLiquidityEffect).liquidity_pool!.reserves
                .some(lpr => getStellarAsset(lpr.asset).equals(JPEGAsset))) {
                return true;
            }
        }
        return false;
    };

    const breaker = (record: ServerApi.EffectRecord) => from > new Date(record.created_at);

    return loopcall(server.effects().forAccount(account).order("desc"), {filter, breaker})
        .then((effects: ServerApi.EffectRecord[]) => effects.map(e => {
            if (e.type === 'liquidity_pool_deposited') {
                const amount = (e as unknown as DepositLiquidityEffect).reserves_deposited
                    .find(lpr => getStellarAsset(lpr.asset).equals(JPEGAsset))!.amount;
                return new BigNumber(amount);
            }
            if (e.type === 'liquidity_pool_withdrew') {
                const amount = (e as unknown as WithdrawLiquidityEffect).reserves_received
                    .find(lpr => getStellarAsset(lpr.asset).equals(JPEGAsset))!.amount;
                return new BigNumber(amount).multipliedBy(-1);
            }
            const amount = new BigNumber((e as AccountCredited).amount);
            return (e.type === 'account_credited'
                ? amount.multipliedBy(-1)
                : amount);
        }))
}


export const checkAEffects: stepFnCheckEffects = ({account, snapshot}, onStep) => {
    onStep(0, "process");
    const toDate = new Date(snapshot.updated);
    const fromDate = new Date(snapshot.updated);
    fromDate.setUTCMonth(fromDate.getUTCMonth()-1);
    const balances = [
        snapshot.accounts.find(a => a.id === account)!.balance
    ].map(b => new BigNumber(b));

    return checkEffects(
        account,
        fromDate,
        toDate,
        () => {}
    )
        //.then(effects => effects.reverse())

        .then(amounts => {
            const initial = {low: balances[0], balance: balances[0]};
            const reduced = amounts
                //.map(a => ({balance: new BigNumber(a), low: new BigNumber(0)}))
                .reduce((prev: { balance: BigNumber, low: BigNumber }, current: BigNumber) => {
                    const balance = prev.balance.minus(current);
                    return {
                        balance,
                        low: prev.low.lt(balance) ? prev.low : balance,
                    };
                }, initial);

            return ({
                account: account,
                activities: amounts.length,
                low: reduced.low,
                calculated: reduced.balance.toString(),
                start: balances[0].toString(),
                //end: balances[1].toString()
            })
        })
        //.then(e => console.log(e))
        .then(({low}) => {
            onStep(100, "finish", {balanceLow: low});
            return true;
        })
        .catch((e) => Promise.reject({status: "error", reason: e.message}));
};

