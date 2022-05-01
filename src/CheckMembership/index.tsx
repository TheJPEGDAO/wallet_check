
import {NumberRange} from "../common";
import {OfferAsset} from "stellar-sdk/lib/types/offer";
import {Asset} from "stellar-sdk";

export type CheckMembershipState = {
    account?: string;
    accountStatus: AccountState;
}
const isJPEG = (code: string, issuer: string): boolean => {
    return code === 'JPEG'
        && issuer === 'GDZQGQFWKQQWJ7ACKK4DJKFQ7QQ5FXD3PEQBDUBISTNJYW5LWW3FSCKK';
}
export const isAssetRecordJPEG = (record: OfferAsset) => record.asset_type === 'credit_alphanum4'
    && isJPEG(record.asset_code!, record.asset_issuer!)
export const JPEGAsset = new Asset("JPEG", "GDZQGQFWKQQWJ7ACKK4DJKFQ7QQ5FXD3PEQBDUBISTNJYW5LWW3FSCKK");

export type StepStatus = "error"|"wait"|"finish"|"process"|undefined;

export type ResolveCheckMembershipStep = Promise<Partial<CheckMembershipState>|boolean>;
export type RejectPromiseMembershipStep = {
    reason: string;
    status: StepStatus & "error";
};

export type checkMembershipStepFn<ParamsType, AdditionalStepArgs extends any[] = [], ResolveAs extends ResolveCheckMembershipStep = ResolveCheckMembershipStep> = (
    params: ParamsType,
    onStep: (progress: NumberRange<0, 101>, status: StepStatus, ...args: AdditionalStepArgs) => void
) => ResolveAs;
export type checkMembershipStepPromiseRejected = {
    status: StepStatus;
    message: string;
}
export enum AccountState { "ok", "checking", "error", "incomplete","notSet"}

