import logo from "./logo.svg";
import 'antd/dist/antd.css';
import React, {useEffect} from "react";
import {Asset} from "stellar-sdk";
import useAccounts, {AccountRecord} from "./useAccounts";
import {Table} from "antd";
import BigNumber from "bignumber.js";

const code = 'JPEG';
const issuer = 'GDZQGQFWKQQWJ7ACKK4DJKFQ7QQ5FXD3PEQBDUBISTNJYW5LWW3FSCKK';
const checkAsset = new Asset(code, issuer);
const threshold = 10000;

const Home = () => {
    const getAccounts = useAccounts(checkAsset, threshold);
    useEffect(() => {
        return () => {
            getAccounts.abort();
        }
        // eslint-disable-next-line
    }, []);

    return <>
        <p>Accounts holding at least {threshold} {code}: {getAccounts.count}</p>
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
