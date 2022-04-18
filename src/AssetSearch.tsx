import {AutoComplete, AutoCompleteProps} from "antd";
import { DefaultOptionType } from "antd/lib/select";
import {useMemo, useState} from "react";
import {server} from "./common";
import {ServerApi} from "stellar-sdk";
type AssetRecord = ServerApi.AssetRecord;

const getDomainFromAssetRecord = (asset: AssetRecord): string => {
    return (asset._links as unknown as {toml?: { href: string }}).toml?.href
        .replaceAll("/.well-known/stellar.toml", "")
        .replaceAll(/^http[s?]:\/\//g, "")??"";
}

const uniqueOptionTypes = (options: DefaultOptionType[]): DefaultOptionType[] => {
    return options.filter((currentValue, currentIndex, allValues) =>
        currentIndex === allValues.findIndex(findValue => findValue.value === currentValue.value));
}

const AssetSearch = (props: AutoCompleteProps) => {
    const [assets, setAssets] = useState<DefaultOptionType[]>([]);
    const [search, setSearch] = useState<string>("");

    const searchAssets = (search: string) =>  {
        setSearch(search);
        server.assets().forCode(search).call()
            .then(({records}) => records.map(r => ({
                label: r.asset_code + " * "+getDomainFromAssetRecord(r)+" ("+r.asset_issuer.substring(0, 5)+"..."+r.asset_issuer.substring(52)+")",
                value: r.asset_code + ":" + r.asset_issuer
            })))
            .then(assets => {
                setAssets(p => uniqueOptionTypes(p.concat(assets)));
            });
    };

    const options = useMemo(() => assets
            .filter(a => a.value!.toString().includes(search))
            .map(option => ({label: option.label, value: option.value}))
    , [search, assets]);

    return <AutoComplete
        {...props}
        options={options}
        showArrow={true}
        onSearch={searchAssets}
    />
}

export default AssetSearch
