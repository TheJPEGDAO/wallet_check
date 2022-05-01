import 'antd/dist/antd.css';
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Asset} from "stellar-sdk";
import useAccounts, {AccountRecord} from "./useAccounts";
import {Button, Carousel, Col, Descriptions, Input, notification, PageHeader, Row, Table, Tag} from "antd";
import BigNumber from "bignumber.js";
import AssetSearch from "./AssetSearch";
import {assetToString, getStellarAsset} from "./common";
import {CameraOutlined, ClearOutlined, CopyOutlined, FileTextOutlined, GlobalOutlined} from '@ant-design/icons';
import SnapshotData from "./SnapshotData";
import {CopyToClipboard} from "react-copy-to-clipboard";
import {CarouselRef} from "antd/lib/carousel";


const TakeSnapshot = () => {
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
    }, [checkAsset, threshold]);

    useEffect(() => {
        setAssetDomain(undefined);
    }, [checkAsset]);

    const downloadsDisabled = useMemo(() => {
        return getAccounts.loading || getAccounts.count === 0;
    }, [getAccounts.loading, getAccounts.count]);

    const downloadSnapshotLink = useRef<HTMLAnchorElement>(null);

    const compileSnapshot = useCallback((): SnapshotData => {
        return {
            threshold: threshold??0,
            accounts: getAccounts.accounts,
            count: getAccounts.count,
            asset: checkAsset?{...checkAsset}:{},
            updated: new Date()
        };
    }, [threshold, checkAsset, getAccounts.accounts, getAccounts.count]);

    const downloadJson = () => {
        const url = window.URL.createObjectURL(
            new Blob([Buffer.from(JSON.stringify(compileSnapshot()))], {type: "application/json"})
        );
        if (downloadSnapshotLink.current) {
            downloadSnapshotLink.current.href = url;
            downloadSnapshotLink.current.setAttribute("download", "snapshot_"+(new Date().valueOf()/1000).toFixed()+".json")
            downloadSnapshotLink.current.click();
        }
    }
    const accountsList = useMemo(() => {
        return getAccounts.accounts.map(account => account.id).join("\n");
    }, [getAccounts.accounts]);
    const [copied, setCopied] = useState<boolean>();
    useEffect(() => {
        if (copied) setTimeout(() => setCopied(false), 1500);
    }, [copied]);
    const carouselRef = useRef<CarouselRef>(null);

    useEffect(() => {
        if (getAccounts.loading || getAccounts.count <= 0) {
            carouselRef.current?.goTo(0);
        } else if (getAccounts.count > 0) {
            carouselRef.current?.goTo(1);
        }
    }, [getAccounts.count, getAccounts.loading]);
    const [assetDomain, setAssetDomain] = useState<string>();
    return <>
        <PageHeader
            title="Dynamic Snapshot"
            subTitle="Calculate a list of accounts that currently hold a certain amount of a given asset"
            extra={<>
                <CopyToClipboard text={accountsList} onCopy={(text, status) => {
                    setCopied(status);
                    if (status) {
                        notification.success({
                            placement: "topLeft",
                            duration: 20,
                            message: "Account IDs copied",
                            description: <>
                                {getAccounts.count} IDs copied.
                                Head over to <a href="https://balances.lumens.space/account" target="_blank"
                                                rel="noreferrer">stellar claim</a> to send assets in a batch to them.
                            </>,
                        })
                    }
                }}>
                    <Button icon={<CopyOutlined />} disabled={downloadsDisabled||copied}>{!copied?"Copy account IDs":"IDs copied"}</Button>
                </CopyToClipboard>
                <Button icon={<FileTextOutlined />} disabled={downloadsDisabled} onClick={() => downloadJson()}>Download .json</Button>

                {/*<Button icon={<FileExcelOutlined />} disabled={downloadsDisabled}>Download .csv</Button>*/}
                <a style={{display: "none"}} href={"."} ref={downloadSnapshotLink}>Download snapshot</a>
            </>}
        />


        <Row gutter={[10, 0]}>
            <Col flex={"30px"}/>
            <Col><label htmlFor={"assetSearch"}>Asset: </label></Col>
            <Col flex={"auto"}>
                <AssetSearch
                    id={"assetSearch"}
                    style={{width: "100%"}}
                    allowClear={true}
                    onClear={() => setCheckAsset(undefined)}
                    placeholder={"search by asset code for snapshot (e.g. JPEG)"}
                    onSelect={(value: string) => setCheckAsset(getStellarAsset(value))}
                    onDeselect={() => setAssetDomain(undefined)}
                    hasDomain={setAssetDomain}
                    disabled={getAccounts.loading || getAccounts.count > 0}
                />
            </Col>
            <Col flex={"20px"}/>
            <Col><label>Min. amount:</label></Col>
            <Col><Input
                placeholder={"Threshold amount"}
                type={"number"}
                onChange={(e) => {if(!!checkAsset) {setThreshold(e.target.value === ''?undefined:Math.max(0, parseInt(e.target.value))); }}}
                disabled={!checkAsset || getAccounts.loading || getAccounts.count > 0}
                value={!!checkAsset?threshold:undefined}
            /></Col>
            <Col flex={"20px"}/>
            <Col>
                <div>
                <Carousel autoplay={false} effect={"fade"} dots={false} ref={carouselRef} style={{maxWidth: 165}}>
                    <Button
                        icon={<CameraOutlined />}
                        loading={getAccounts.loading}
                        onClick={() => getAccounts.search()}
                        disabled={!checkAsset || undefined === threshold || getAccounts.count < 0}
                    >Take snapshot</Button>
                    <Button
                        icon={<ClearOutlined />}
                        onClick={() => getAccounts.clear()}
                        disabled={getAccounts.count <= 0 || getAccounts.loading}
                    >Clear results</Button>
                </Carousel>
                </div>
            </Col>
            <Col flex={"30px"}/>
        </Row>

        <Table<AccountRecord>
            rowKey={r => r.id}
            dataSource={getAccounts.accounts.sort((a: AccountRecord, b: AccountRecord) => new BigNumber(b.balance).minus(a.balance).toNumber())}
            loading={getAccounts.loading}
            pagination={{
                position: ["bottomCenter"],
                showTotal: (total, range) => <p>Showing {range[0]}-{range[1]} of <b>{total}</b> matching account{total>1?'s':''}</p>
            }}
            footer={() =>
                <Descriptions layout={"vertical"}>
                    <Descriptions.Item label={<>Selected Asset</>} contentStyle={{display: "block"}} span={2}>
                        <p>{assetToString(checkAsset)}</p>
                    </Descriptions.Item>
                    <Descriptions.Item label={"Desired threshold"}>{threshold}</Descriptions.Item>
                </Descriptions>
            }
        >
            <Table.Column
                dataIndex={"id"}
                title={"Account"}
            />
            <Table.Column<AccountRecord>
                dataIndex={"balance"}
                title={<>{checkAsset?.getCode()??""} {!!assetDomain&&<Tag icon={<GlobalOutlined />} color={"processing"}>{assetDomain}</Tag>}</>}
                defaultSortOrder={getAccounts.loading?null:"descend"}
                width={300}
                sorter={(a, b) => new BigNumber(a.balance).minus(b.balance).toNumber()}
            />
        </Table>
    </>
}

export default TakeSnapshot;
