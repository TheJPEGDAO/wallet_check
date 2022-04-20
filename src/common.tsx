import {Asset, Server} from "stellar-sdk";

export const server = new Server('https://horizon.stellar.lobstr.co/');
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
    return `${date.getUTCFullYear()}-${m}-${d}.${extension??'json'}`;
}
