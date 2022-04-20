import {AccountRecord} from "./useAccounts";

interface Asset {
    issuer?: string;
    code?: string;
}

interface SnapshotData {
    updated: Date;
    asset: Asset;
    threshold: number;
    count: number,
    accounts: AccountRecord[];
}

export default SnapshotData;
