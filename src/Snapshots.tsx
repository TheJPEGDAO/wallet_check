import snapshotsIndex from "./snapshots_index.json";
import {PageHeader, Table} from "antd";

export interface SnapshotIndexData {
    filename: string;
    date: string;
    asset: {
        code?: string;
        issuer: string;
    };
}

const Snapshots = () => {
    return <>
        <PageHeader
            title="Recent Snapshots"
            subTitle="Find the previous months' snapshots here"
            extra={<>
            </>}
        />


    <Table<SnapshotIndexData>
        dataSource={snapshotsIndex}
        pagination={{hideOnSinglePage: true, position:["bottomCenter"]}}
        rowKey={(s) => s.date}
    >
        <Table.Column
            title={"File"}
            dataIndex={"filename"}
            render={filename => <a href={filename}>{filename}</a>}
        />
        <Table.Column
            title={"Snapshot date"}
            dataIndex={"date"}
            render={(date) => new Date(date).toLocaleString()}
            />
    </Table>
        </>
};
export default Snapshots;
