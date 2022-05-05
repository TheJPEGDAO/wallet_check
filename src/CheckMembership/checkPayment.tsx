import {CheckMembershipState, checkMembershipStepFn} from "./index";
import loopcall from "@cosmic-plus/loopcall";
import {getStellarAsset, server} from "../common";
import {Asset, ServerApi} from "stellar-sdk";
import {TransactionCallBuilder} from "stellar-sdk/lib/transaction_call_builder";
type TransactionRecord = ServerApi.TransactionRecord;

export type CheckPayment = {
    txId: string;
    opId: string;
    txPage: string;
    memo?: string;
    date: Date;
}

type stepFnCheckPayments = checkMembershipStepFn<{
    account?: string;
    afterDate: Date;
    beforeDate: Date;
}, [], CheckPayment & CheckMembershipState>;

const dropper = "GC2ILNJKC2OYCURIS3LK2IPNKLYZQBYXDO7MPGJO3Q5UHS3EBKSMJPEG";
export const MountainTokenAsset = new Asset("0x1F3D4", dropper);
type Payment = ServerApi.PaymentOperationRecord | ServerApi.ClaimableBalanceRecord;



export const checkPayment: stepFnCheckPayments = async ({account, afterDate, beforeDate}, onStep) => {
    onStep(0, "process");
    if (!account?.length) return Promise.reject("No account given");

    let found = false;
    let shouldBreak = false;

    const loopcallBreaker = (r: Payment) => {
        const createdAtBreaks = r.hasOwnProperty("created_at")
            ? afterDate >= new Date((r as ServerApi.PaymentOperationRecord).created_at)
            : shouldBreak
        return found || createdAtBreaks;
    }

    const filterPayments = (r: ServerApi.PaymentOperationRecord|ServerApi.CreateAccountOperationRecord) => {
        if (r.type === "create_account") return false;
        if (beforeDate <= new Date(r.created_at)) return false;
        found = r.from === dropper && MountainTokenAsset.equals(getStellarAsset(r.asset_code+":"+r.asset_issuer));
        return found;
    }
    type ClaimOrCreateCB = ServerApi.CreateClaimableBalanceOperationRecord|ServerApi.ClaimClaimableBalanceOperationRecord;

    const filterClaimableBalances = async (r: ServerApi.ClaimableBalanceRecord) => {
        const cbCreated: undefined|ServerApi.CreateClaimableBalanceOperationRecord = await (r as unknown as {transactions: () => TransactionCallBuilder, operations: () => Promise<ServerApi.CollectionPage<ClaimOrCreateCB>>})
            .operations()
            .then(({records}) => {
                return records.find((r: ClaimOrCreateCB): r is ServerApi.CreateClaimableBalanceOperationRecord  => r.type === "create_claimable_balance");
            })
            //.catch((e) => {
            //    console.warn(e);
            //    return undefined;
            //});
        if (undefined === cbCreated) return false;

        const cbCreatedAtDate = new Date(cbCreated.created_at)
        shouldBreak = afterDate >= cbCreatedAtDate;
        if (beforeDate <= cbCreatedAtDate || shouldBreak) {
            console.log("record out of date range")
            return false;
        }
        console.log(beforeDate, cbCreated);
        found = r.sponsor === dropper && MountainTokenAsset.equals(getStellarAsset(cbCreated.asset));
        if (found) {
            (r as unknown as {transaction: () => Promise<TransactionRecord>}).transaction = cbCreated.transaction
            r.id = cbCreated.id;
        }
        return found;
    }

    type OpAndTx = {op: Payment, tx: ServerApi.TransactionRecord};
    const paymentInfo: OpAndTx[] = [];

    if (paymentInfo.length === 0) {
        await loopcall(
            await server.payments().forAccount(account).order("desc"),
            {
                filter: filterPayments,
                breaker: loopcallBreaker,
            })
            .then((payments: Exclude<Payment, ServerApi.ClaimableBalanceRecord>[]) => {
                return Promise.all(payments.map(payment => payment.transaction()))
                    .then(txs => txs.map((tx, i) => ({
                        op: payments[i],
                        tx: tx,
                    })));
            })
            .then((i: OpAndTx[]) => paymentInfo.push(...i));
    }

    onStep(50, "process");

    if (paymentInfo.length === 0) {
        console.log("checking CBs")
        const cbS = await loopcall(
            server.claimableBalances().claimant(account).asset(MountainTokenAsset).order("desc"),
            {
                filter: filterClaimableBalances,
                breaker: loopcallBreaker,
            })
            .then((claimableBalances: (Exclude<Payment, ServerApi.PaymentOperationRecord> & {transaction: () => Promise<TransactionRecord>})[]) => {
                return Promise.all(claimableBalances.map(cb => cb.transaction()))
                    .then(txs => txs.map((tx, i) => ({
                    op: claimableBalances[i],
                    tx: tx,
                })))
            })
            .then((i: OpAndTx[]) => paymentInfo.push(...i))
            .catch((e: any) => {
                return Promise.reject({status: "error", reason: e})
            });
        // there was an error here
        if (typeof cbS === "object") return cbS;
    }

    if (paymentInfo.length > 0) {
        return Promise.resolve(paymentInfo[0])
            .then((record: OpAndTx) => {
                return {
                    opId: record.op.id,
                    txId: record.tx.id,
                    txPage: record.tx.paging_token,
                    memo: record.tx.memo,
                    date: new Date(record.tx.created_at),
                }
            })
            .catch(e => Promise.reject({status: "error", reason: e}));
    }

    return Promise.reject({status: "error", reason: "No payment found"});
};
