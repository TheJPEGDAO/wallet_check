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

const indexSnapshots = () => {
    const snapshots: SnapshotIndexData[] = readdirSync("snapshots", "utf8")
        .map(f => indexSnapshotFile(f, "snapshots"))
        .filter((snapshotIndex): snapshotIndex is SnapshotIndexData  => !!snapshotIndex)
    writeFileSync("src/snapshots_index.json", JSON.stringify(snapshots))
};
indexSnapshots();
export {}
