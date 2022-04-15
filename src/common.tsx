import {Asset, Server} from "stellar-sdk";

export const server = new Server('https://horizon.stellar.lobstr.co/');
export const getStellarAsset = (code: string): Asset => {
    const [assetCode, assetIssuer] = code.split(':')
    return (assetCode === 'native' || assetCode === 'native:XLM')
        ? Asset.native()
        : new Asset(assetCode, assetIssuer);
};
export const assetToString = (asset: Asset): string => {
    return asset.isNative()
        ? 'native'
        : asset.getCode()+':'+asset.getIssuer();
}
