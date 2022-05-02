import {CheckMembershipState, checkMembershipStepFn} from "./index";
import loopcall from "@cosmic-plus/loopcall";
import { server } from "src/common";
import {Horizon, ServerApi} from "stellar-sdk";

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



export const checkPayment: stepFnCheckPayments = async ({account, afterDate, beforeDate}, onStep) => {
    onStep(0, "process");
    if (!account?.length) return Promise.reject("No account given");


    const loopcallBreaker = (r: Horizon.BaseOperationResponse) => {
        return afterDate >= new Date(r.created_at)
    }

    const loopcallFilter = (r: Horizon.PaymentOperationResponse) => {
        if (beforeDate <= new Date(r.created_at)) return false;

        return (r.from === dropper &&
            r.asset_type === "credit_alphanum12" && r.asset_code === "0x1F3D4");
    }

    const paymentInfo = await loopcall(
        server.payments().forAccount(account).order("desc"),
        {
            filter: loopcallFilter,
            breaker: loopcallBreaker,
        })
        .then((ops: ServerApi.PaymentOperationRecord[]) => {
            return Promise.all(ops.map((o, i, allOps) => o.transaction()))
                .then((txs: ServerApi.TransactionRecord[]) => {
                    return txs.map((tx, txi, txsA) => ({
                        op: ops[txi],
                        tx: tx,
                    }))
                });
        })
        .then((opsAndTxs: {op: ServerApi.PaymentOperationRecord, tx: ServerApi.TransactionRecord}[]) => {
            return opsAndTxs.map(record => ({
                opId: record.op.id,
                txId: record.tx.id,
                txPage: record.tx.paging_token,
                memo: record.tx.memo,
                date: new Date(record.tx.created_at),
            }))
        });

    if (paymentInfo?.length) {
        return Promise.resolve(paymentInfo[0]);
    }

    return Promise.reject({status: "error", reason: "No payment found"});
};
