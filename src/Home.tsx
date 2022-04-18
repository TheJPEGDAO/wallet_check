import 'antd/dist/antd.css';
import React, {useEffect, useState} from "react";
import {Asset} from "stellar-sdk";
import useAccounts, {AccountRecord} from "./useAccounts";
import {Table} from "antd";
import BigNumber from "bignumber.js";
import AssetSearch from "./AssetSearch";
import {assetToString, getStellarAsset} from "./common";

const code = 'JPEG';
const issuer = 'GDZQGQFWKQQWJ7ACKK4DJKFQ7QQ5FXD3PEQBDUBISTNJYW5LWW3FSCKK';
const threshold = 10000;

const Home = () => {
    const [checkAsset, setCheckAsset] = useState<Asset>(new Asset(code, issuer));
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
        getAccounts.abort();
        // eslint-disable-next-line
    }, [checkAsset]);

    return <>
        <p>Accounts holding at least {threshold} {assetToString(checkAsset)}: {getAccounts.count}</p>
        <AssetSearch style={{width: 400}} onSelect={(value: string) => setCheckAsset(getStellarAsset(value))} />
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
                title={code}
                defaultSortOrder={getAccounts.loading?null:"descend"}
                sorter={(a, b) => new BigNumber(a.balance).minus(b.balance).toNumber()}
            />

        </Table>
    </>
}

export default Home;
