import {AutoComplete, AutoCompleteProps} from "antd";
import { DefaultOptionType } from "antd/lib/select";
import {useMemo, useState} from "react";
import {getStellarAsset, server} from "./common";
import {ServerApi, StellarTomlResolver} from "stellar-sdk";
import Highlighter from "react-highlight-words";
import loopcall from "@cosmic-plus/loopcall";
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

const AssetSearch = (props: AutoCompleteProps & {hasDomain?: (domain: string) => void}) => {
    const [assets, setAssets] = useState<DefaultOptionType[]>([]);
    const [search, setSearch] = useState<string>("");

    const searchAssets = (searchString: string) =>  {
        setSearch(searchString);
        const assetCode = searchString.includes(":")
            ? searchString.substring(0, searchString.indexOf(":"))
            : searchString;
        if (!!assetCode) {
            loopcall(server.assets().forCode(assetCode))
                .then((records: ServerApi.AssetRecord[]) => records.map(r => ({
                    label: r.asset_code + " * " + getDomainFromAssetRecord(r) + " (" + r.asset_issuer.substring(0, 5) + "..." + r.asset_issuer.substring(51) + ")",
                    value: r.asset_code + ":" + r.asset_issuer,
                    domain: getDomainFromAssetRecord(r)
                } as DefaultOptionType)))
                .then((assets: DefaultOptionType[]) => {
                    setAssets(p => uniqueOptionTypes(p.concat(assets)));
                });
        }
    };

    const options = useMemo(() => assets
            .filter(a => a.value!.toString().includes(search))
            .map(option => ({...option,
                label: <Highlighter
                    searchWords={[search]}
                    autoEscape={true}
                    textToHighlight={option.label}
                />}))
    , [search, assets]);

    const onSelect = (value: string, option: DefaultOptionType) => {
        StellarTomlResolver.resolve(option.domain)
            .then((toml) => !!toml.CURRENCIES.find((c: any): c is {code: string, issuer: string} => getStellarAsset(c.code+':'+c.issuer).equals(getStellarAsset(value))))
            .then(isAssetInToml => { if (isAssetInToml) { props.hasDomain?.(option.domain); }})
            .catch(() => {});
        props.onSelect?.(value, option);
    };

    return <AutoComplete
        {...props}
        showArrow={true}
        options={options}
        onSearch={searchAssets}
        onSelect={onSelect}
    />
}

export default AssetSearch
