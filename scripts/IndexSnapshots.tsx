import {readdirSync, readFileSync, writeFileSync} from "fs";
import {SnapshotIndexData} from "../src/Snapshots";

const indexSnapshotFile = (filename: string, path: string): SnapshotIndexData|void => {
    try {
        const snapshotData = JSON.parse(readFileSync([path, filename].join("/"), "utf8"));
        return {
            filename: filename,
            date: snapshotData.updated,
            asset: snapshotData.asset,
        };
    } catch {}
}

const getSnapshotsIndex = (): SnapshotIndexData[] => {
    const snapshotFolder = "public/snapshots";
    return readdirSync(snapshotFolder, "utf8")
        .map(f => indexSnapshotFile(f, snapshotFolder))
        .filter((snapshotIndex): snapshotIndex is SnapshotIndexData => !!snapshotIndex);
}

const indexSnapshots = () => {
    const f = getSnapshotsIndex()
    console.log(f)
    writeFileSync("src/snapshots_index.json", JSON.stringify(f));
};
indexSnapshots();
export {getSnapshotsIndex};
