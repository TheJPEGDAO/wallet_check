import {SnapshotIndexData} from "../Snapshots";
import {
    CheckMembershipState,
    checkMembershipStepFn,
    RejectPromiseMembershipStep
} from "./index";
import SnapshotData from "../SnapshotData";


export type stepFnCheckSnapshot = checkMembershipStepFn<{
    base: string;
    snapshotsIndexData: SnapshotIndexData;
    accountId: string;
}, [SnapshotData?]>;


const checkSnapshot: stepFnCheckSnapshot = ({base, snapshotsIndexData, accountId}, onStep) => {
    onStep(0, "process");
    return fetch(`${base}${snapshotsIndexData.filename}`)
        .then(response => response.json())
        .then(json => {
            onStep(50, "process");
            if ((json as SnapshotData).accounts.some(account => account.id === accountId)) {
                setTimeout(() => onStep(100, "finish", json), 500);
                return {} as CheckMembershipState;
            }
            return Promise.reject({status: "error", reason: "account not found in snapshot"} as RejectPromiseMembershipStep);
        });
};

export default checkSnapshot;
