import {AccountState, checkMembershipStepFn, RejectPromiseMembershipStep} from "./index";
import {rolloverRange, server} from "../common";


export type stepFnCheckAccount = checkMembershipStepFn<{id: string}, [AccountState?]>;

const checkAccount: stepFnCheckAccount = ({id}, onStep) => {
    if (id.length === 0) {
        onStep(0, "wait");
        return Promise.resolve({account: id, accountStatus: AccountState.notSet});
    }
    onStep(10, "process");
    if ((!id.startsWith("G"))) return Promise.resolve({account: "G", accountStatus: AccountState.error, reason: "Not a public key"});
    if (id.length < 56) {
        onStep(rolloverRange(id.length / 56 * 50), "process");
        return Promise.resolve({account: id, accountStatus: AccountState.incomplete});
    }

    onStep(80, "process", AccountState.checking);
    return server.loadAccount(id)
        .then(account => {
            onStep(100, "finish");
            return {account: account.id, accountStatus: AccountState.ok};
        })
        .catch(() => {
            onStep(100, "error", AccountState.error);
            return Promise.reject({status: "error", reason: "Account could not be verified on stellar network"} as RejectPromiseMembershipStep);
        });
}

export default checkAccount;
