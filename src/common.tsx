import {Asset, Server} from "stellar-sdk";
import BigNumber from "bignumber.js";

export const server = new Server('https://horizon.stellar.org/');

// https://stackoverflow.com/a/68633667/834309
type _enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : _enumerate<N, [...Acc, Acc['length']]>

export type NumberRange<From extends number, To extends number> = Exclude<_enumerate<To>, _enumerate<From>>

export const rolloverRange = (n: number): NumberRange<0, 101> => {
    if (n > 100) return rolloverRange(n - 100);
    if (n < 0) return rolloverRange(n + 100);
    return parseInt(new BigNumber(n).toFixed()) as NumberRange<0, 101>;
};

export const getStellarAsset = (code: string): Asset => {
    const [assetCode, assetIssuer] = code.split(':')
    return (assetCode === 'native' || assetCode === 'native:XLM')
        ? Asset.native()
        : new Asset(assetCode, assetIssuer);
};

export const assetToString = (asset?: Asset): string => {
    if (!asset) return "";
    return asset.isNative()
        ? 'native'
        : asset.getCode()+':'+asset.getIssuer();
}

export const getSnapshotFilename = (date: Date, extension?: string): string => {
    const m = String(date.getUTCMonth()+1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `snapshot-${date.getUTCFullYear()}-${m}-${d}.${extension??'json'}`;
}
