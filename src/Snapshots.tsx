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

const sortIndexDataByDate = (a: SnapshotIndexData, b: SnapshotIndexData) => Date.parse(a.date) - Date.parse(b.date)

const Snapshots = () => {
    return <>
        <PageHeader
            title="Recent Snapshots"
            subTitle="Find the previous months' snapshots here"
            extra={<>
            </>}
        />


    <Table<SnapshotIndexData>
        dataSource={snapshotsIndex.sort(sortIndexDataByDate).reverse()}
        pagination={{hideOnSinglePage: true, position:["bottomCenter"]}}
        rowKey={(s) => s.date}
    >
        <Table.Column<SnapshotIndexData>
            title={"File"}
            dataIndex={"filename"}
            render={filename => <a href={filename}>{filename}</a>}
        />
        <Table.Column<SnapshotIndexData>
            title={"Snapshot date"}
            dataIndex={"date"}
            render={(date) => new Date(date).toLocaleString()}
            sortDirections={["ascend"]}
            showSorterTooltip={false}
            sorter={sortIndexDataByDate}
            />
    </Table>
        </>
};
export default Snapshots;
