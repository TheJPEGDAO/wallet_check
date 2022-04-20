import 'antd/dist/antd.css';
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Asset} from "stellar-sdk";
import useAccounts, {AccountRecord} from "./useAccounts";
import {Button, Col, Descriptions, Input, PageHeader, Row, Table} from "antd";
import BigNumber from "bignumber.js";
import AssetSearch from "./AssetSearch";
import {assetToString, getStellarAsset} from "./common";
import {FileTextOutlined, TableOutlined} from '@ant-design/icons';
import SnapshotData from "./SnapshotData";


const Home = () => {
    const [checkAsset, setCheckAsset] = useState<Asset>();
    const [threshold, setThreshold] = useState<number>();
    const getAccounts = useAccounts(checkAsset, threshold);
    /**/
    useEffect(() => {
        return () => {
            getAccounts.abort();
        }
        // eslint-disable-next-line
    }, []);
    /**/

    useEffect(() => {
        if (undefined === checkAsset && undefined !== threshold) {
            setThreshold(undefined);
        }
        // eslint-disable-next-line
    }, [checkAsset, threshold]);

    const downloadsDisabled = useMemo(() => {
        return getAccounts.loading || getAccounts.count === 0;
    }, [getAccounts.loading, getAccounts.count]);

    const downloadSnapshotLink = useRef<HTMLAnchorElement>(null);

    const compileSnapshot = useCallback((): SnapshotData => {
        return {threshold: threshold??0, accounts: getAccounts.accounts, asset: checkAsset?{code: checkAsset.code, issuer: checkAsset.issuer}:{}, updated: new Date()};
    }, [threshold, checkAsset, getAccounts.accounts]);

    const downloadJson = () => {
        const url = window.URL.createObjectURL(
            new Blob([Buffer.from(JSON.stringify(compileSnapshot()))], {type: "application/json"})
        );
        if (downloadSnapshotLink.current) {
            downloadSnapshotLink.current.href = url;
            downloadSnapshotLink.current.setAttribute("download", "snapshot_"+(new Date().valueOf()/1000).toFixed()+".json")
            //downloadSnapshotLink.current.click();
        }

        //window.open(url)
    }

    return <>
        <PageHeader
            title="Dynamic Snapshot"
            subTitle="Calculate a list of accounts that currently hold a certain amount of a given asset"
            extra={<>
                <Button icon={<FileTextOutlined />} disabled={downloadsDisabled} onClick={() => downloadJson()}>Download .json</Button>
                {/*<Button icon={<FileExcelOutlined />} disabled={downloadsDisabled}>Download .csv</Button>*/}
                <a style={{display: "none"}} href={"."} ref={downloadSnapshotLink}>Download snapshot</a>
            </>}
        />

        <Descriptions>
            <Descriptions.Item label={"Selected Asset"}>{assetToString(checkAsset)}</Descriptions.Item>
            <Descriptions.Item label={"Desired threshold"}>{threshold}</Descriptions.Item>
        </Descriptions>
        <Row gutter={[10, 0]}>
            <Col flex={"20px"}/>
            <Col><label htmlFor={"assetSearch"}>Asset: </label></Col>
            <Col flex={"auto"}>
                <AssetSearch
                    id={"assetSearch"}
                    style={{width: "100%"}}
                    allowClear={true}
                    onClear={() => setCheckAsset(undefined)}
                    placeholder={"search by asset code for snapshot (e.g. JPEG)"}
                    onSelect={(value: string) => setCheckAsset(getStellarAsset(value))}
                />
            </Col>
            <Col flex={"20px"}/>
            <Col><label>Minimum amount:</label></Col>
            <Col><Input
                placeholder={"Threshold amount"}
                type={"number"}
                onChange={(e) => {if(!!checkAsset) {setThreshold(Math.max(0, parseInt(e.target.value))); }}}
                disabled={!checkAsset}
                value={!!checkAsset?threshold:undefined}
            /></Col>
            <Col flex={"20px"}/>
            <Col><Button
                icon={<TableOutlined />}
                loading={getAccounts.loading}
                onClick={() => getAccounts.search()}
                disabled={!checkAsset || undefined === threshold}
            >Get accounts</Button></Col>
            <Col flex={"20px"}/>
        </Row>


        <Table<AccountRecord>
            rowKey={r => r.id}
            dataSource={getAccounts.accounts}
            loading={getAccounts.loading}
        >
            <Table.Column
                dataIndex={"id"}
                title={"Account"}
            />
            <Table.Column<AccountRecord>
                dataIndex={"balance"}
                title={checkAsset?.getCode()??""}
                defaultSortOrder={getAccounts.loading?null:"descend"}
                sorter={(a, b) => new BigNumber(a.balance).minus(b.balance).toNumber()}
            />

        </Table>
    </>
}

export default Home;