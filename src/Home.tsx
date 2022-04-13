import logo from "./logo.svg";
import React, {useEffect} from "react";
import {Asset, ServerApi} from "stellar-sdk";
import useAccounts, {getBalanceLineForAssetFromAccount} from "./useAccounts";
import BigNumber from "bignumber.js";

const code = 'JPEG';
const issuer = 'GDZQGQFWKQQWJ7ACKK4DJKFQ7QQ5FXD3PEQBDUBISTNJYW5LWW3FSCKK';
const checkAsset = new Asset(code, issuer);

const getAssetBalance = (account: ServerApi.AccountRecord, asset: Asset): BigNumber => {
    return new BigNumber(getBalanceLineForAssetFromAccount(asset, account)?.balance??0);
}

const Home = () => {
    const getAccounts = useAccounts(checkAsset, 10000);
    useEffect(() => {
        return () => {
            getAccounts.abort();
        }
        // eslint-disable-next-line
    }, []);

    return <header className="App-header">
        {(getAccounts.loading && <img src={logo} className="App-logo" alt="logo" />)}
        <p>{getAccounts.count}</p>
        <ul>{
            getAccounts.accounts
                .sort((a,b) => getAssetBalance(a, checkAsset).minus(getAssetBalance(b, checkAsset)).toNumber())
                .reverse()
                .map(a => <li key={`i_${a.id}`}>{a.id}: {a.balances[0].balance}</li>)
        }</ul>
    </header>
}

export default Home;
