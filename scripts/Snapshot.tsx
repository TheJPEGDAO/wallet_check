import {AccountRecord, getAccountsWithAssetBalanceOverThreshold} from "../src/useAccounts";
import {getStellarAsset} from "../src/common";
import {mkdirSync, writeFileSync} from "fs";
import SnapshotData from "../src/SnapshotData";

const snapshotFilename = (date: Date): string => {
    const m = String(date.getUTCMonth()+1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${date.getUTCFullYear()}-${m}-${d}.json`;
}

const saveSnapshot = (data: SnapshotData): string => {
    const dir = 'public/snapshots/';
    try {
        mkdirSync(dir);
    } catch (e) {
        if (!(e instanceof Object && e.hasOwnProperty("code") && (e as {code: string}).code === 'EEXIST'))
            throw e;
    }
    const filename = snapshotFilename(data.updated);
    writeFileSync(dir + filename, JSON.stringify(data));

    return dir + filename;
}

const getSnapshot = (): Promise<SnapshotData> => {
    const asset = getStellarAsset(process.env.SNAPSHOT_ASSET ?? 'JPEG:GDZQGQFWKQQWJ7ACKK4DJKFQ7QQ5FXD3PEQBDUBISTNJYW5LWW3FSCKK');
    const threshold = parseInt(process.env.SNAPSHOT_THRESHOLD ?? '10000');
    const accounts: AccountRecord[] = [];
    return getAccountsWithAssetBalanceOverThreshold(
        {
            asset: asset,
            threshold: threshold,
            limit: 10,
            onStep: a => {console.log(accounts, a); accounts.push(a);},
        }
    )
        .then<SnapshotData>(() => ({
            updated: new Date,
            threshold,
            asset: asset? {...asset}:{},
            count: accounts.length,
            accounts,
        }))
        .finally(() => {console.log('all processed')})
}

getSnapshot()
    .then(saveSnapshot)
    .then(file => console.log("Wrote snapshot to", file))
