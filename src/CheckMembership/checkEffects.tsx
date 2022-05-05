import BigNumber from "bignumber.js";
import {
    AccountCredited,
    DepositLiquidityEffect,
    LiquidityPoolTradeEffect,
    WithdrawLiquidityEffect
} from "stellar-sdk/lib/types/effects";
import {checkMembershipStepFn, isAssetRecordJPEG, JPEGAsset} from "./index";
import SnapshotData from "../SnapshotData";
import {ServerApi} from "stellar-sdk";
import {OfferAsset} from "stellar-sdk/lib/types/offer";
import loopcall from "@cosmic-plus/loopcall";
import {assetToString, getStellarAsset, server} from "../common";
import {Trade} from "stellar-sdk/lib/types/trade";

type stepFnCheckEffects = checkMembershipStepFn<{
    account: string;
    snapshot: SnapshotData;
}, [{balanceLow: BigNumber}?]>;
type LiquidityInteractionEffect = WithdrawLiquidityEffect|DepositLiquidityEffect|LiquidityPoolTradeEffect;


const getTradeAmount = (tradeRecord: Trade): BigNumber => {
    if (tradeRecord.bought_asset_type === "credit_alphanum4"
        && JPEGAsset.equals(getStellarAsset(tradeRecord.bought_asset_code + ":" + tradeRecord.bought_asset_issuer))) {
        return new BigNumber(tradeRecord.bought_amount).multipliedBy(
            tradeRecord.account === tradeRecord.seller ? 1 : -1
        );
    }
    if (tradeRecord.sold_asset_type === "credit_alphanum4"
        && JPEGAsset.equals(getStellarAsset(tradeRecord.sold_asset_code + ":" + tradeRecord.sold_asset_issuer))) {
        return new BigNumber(tradeRecord.sold_amount).multipliedBy(
            tradeRecord.account === tradeRecord.seller ? 1 : -1
        ).negated();
    }
    console.warn("not a JPEG trade")
    return new BigNumber(0);
}
export const DEBUG = false;

export const checkEffects = (account: string, from: Date, to: Date, onStep: () => void): Promise<BigNumber[]> => {
    const filter = (record: ServerApi.EffectRecord|LiquidityInteractionEffect|Trade) => {
        if (to < new Date(record.created_at)) return false;
        /*if (JSON.stringify(record).includes(JPEGAsset.getIssuer())) {
            const existing = readFileSync("effects.json", "utf8")
            writeFileSync(
                "cached_effects.json",
                JSON.stringify(JSON.parse(existing).concat(record), undefined, 1));
        }*/
        if (['account_credited', 'account_debited'].some(e => e === record.type)) {
            onStep();
            if (isAssetRecordJPEG(record as OfferAsset)) return true;
        }
        if (['liquidity_pool_withdrew', "liquidity_pool_deposited"].some(e => e === record.type)) {
            return ((record as LiquidityInteractionEffect).liquidity_pool.reserves
                .some(lpr => getStellarAsset(lpr.asset).equals(JPEGAsset)));
        }
        if (record.type === "liquidity_pool_trade") {
            const tradeRecord = record as LiquidityPoolTradeEffect;
            return (tradeRecord.bought.asset === assetToString(JPEGAsset)
                || tradeRecord.sold.asset === assetToString(JPEGAsset))
        }
        if (record.type === "trade") {
            const tradeRecord = record as Trade;
            return (tradeRecord.bought_asset_type === "credit_alphanum4"
                    && JPEGAsset.equals(getStellarAsset(tradeRecord.bought_asset_code+":"+tradeRecord.bought_asset_issuer)))
            || (tradeRecord.sold_asset_type === "credit_alphanum4"
                    && JPEGAsset.equals(getStellarAsset(tradeRecord.sold_asset_code+":"+tradeRecord.sold_asset_issuer)));
        }
        if (DEBUG && JSON.stringify(record).includes(JPEGAsset.getIssuer())) {
            console.log("skipped", {id: record.id, type: record.type})
        }
        return false;
    };

    const breaker = (record: ServerApi.EffectRecord) => from > new Date(record.created_at);

    return loopcall(server.effects().forAccount(account).order("desc"), {filter, breaker})
        .then((effects: (ServerApi.EffectRecord|LiquidityInteractionEffect)[]) => effects.map(e => {
            const res = {id: e.id, created_at: new Date(e.created_at), amount: new BigNumber(0), type: e.type};
            if (e.type === "liquidity_pool_deposited") {
                const amount = (e as DepositLiquidityEffect).reserves_deposited
                    .find(lpr => getStellarAsset(lpr.asset).equals(JPEGAsset))!.amount;
                res.amount = new BigNumber(amount);
            }
            if (e.type === "liquidity_pool_withdrew") {
                const amount = (e as WithdrawLiquidityEffect).reserves_received
                    .find(lpr => getStellarAsset(lpr.asset).equals(JPEGAsset))!.amount;
                res.amount = new BigNumber(amount).negated();
            }
            if (["account_credited", "account_debited"].includes(e.type)) {
                const amount = new BigNumber((e as AccountCredited).amount);
                res.amount = (e.type === "account_credited"
                    ? amount.negated()
                    : amount);
            }
            if ("trade" === e.type) {
                res.amount = getTradeAmount(e as Trade);
            }
            if (e.type === "liquidity_pool_trade") {
                const tradeRecord = e as LiquidityPoolTradeEffect;
                if (tradeRecord.bought.asset === assetToString(JPEGAsset)) {
                    res.amount = new BigNumber(tradeRecord.bought.amount);
                }
                if (tradeRecord.sold.asset === assetToString(JPEGAsset)) {
                    res.amount = new BigNumber(tradeRecord.sold.amount).negated();
                }
            }
            return res;
        }))
        // some trades are inducing duplicating effects
        .then((effect: {created_at: Date, amount: BigNumber, id: string, type: string}[]) => effect
            .sort((a,b) => a.id.localeCompare(b.id))
            .filter((e, i, a) => {
                const effectOp = e.id.split("-")[0];
                if (DEBUG) console.log("op:", effectOp, e.type);
                const keep = a.every(other => {
                    const currentOp = other.id.split("-")[0];
                    if (effectOp === currentOp) {
                        if (other.type === e.type) return true;
                        return !["account_credited", "account_debited"].includes(e.type);
                    }
                    return true;
                });
                if (DEBUG) console.log("keep:", keep);
                return keep;
            })
        )
        .then((e: {created_at: Date, amount: BigNumber, id: string}[]) => e
            .sort((a, b) => a.created_at.valueOf() - b.created_at.valueOf())
            .reverse()
            .map(i => {
                //console.log({...i, amount: i.amount.toString()});
                return i.amount;
            })
        )
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
        .then(amounts => {
            const initial = {low: balances[0], balance: balances[0]};
            const reduced = amounts
                .reduce((prev: { balance: BigNumber, low: BigNumber }, current: BigNumber) => {
                    const balance = prev.balance.plus(current);
                    return {
                        balance,
                        low: prev.low.lt(balance) ? prev.low : balance,
                    };
                }, initial);

            return ({
                account: account,
                activities: amounts.length,
                low: reduced.low,
                start: reduced.balance.toString(),
                end: balances[0].toString(),
            })
        })
        .then(({low}) => {
            onStep(100, "finish", {balanceLow: low});
            return true;
        })
        .catch((e) => Promise.reject({status: "error", reason: e.message}));
};
