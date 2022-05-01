import {AccountRecord} from "./useAccounts";

type Asset = {
    issuer?: string;
    code?: string;
}

type SnapshotData = {
    updated: Date;
    asset: Asset;
    threshold: number;
    count: number,
    accounts: AccountRecord[];
}

export default SnapshotData;
