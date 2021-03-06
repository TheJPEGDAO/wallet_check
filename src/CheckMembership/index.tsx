import {NumberRange} from "../common";
import {OfferAsset} from "stellar-sdk/lib/types/offer";
import {Asset, Keypair} from "stellar-sdk";
import React, {ChangeEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useHref} from "react-router-dom";
import snapshotsIndex from "../snapshots_index.json";
import SnapshotData from "../SnapshotData";
import checkAccount from "./checkAccount";
import checkSnapshot from "./checkSnapshot";
import {getSortedSnapshotIndex} from "../Snapshots";
import BigNumber from "bignumber.js";
import {checkAEffects} from "./checkEffects";
import {checkPayment, CheckPayment} from "./checkPayment";
import {Col, Collapse, Input, PageHeader, Row, Select, Steps} from "antd";
import logoJPEG from "../JPEG.png";
import {ClearOutlined, LoadingOutlined} from "@ant-design/icons";
import MembershipIcon from "./MembershipIcon";

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

export type ResolveCheckMembershipStep<R extends CheckMembershipState> = Promise<Partial<R>|boolean>;
export type RejectPromiseMembershipStep = {
    reason: string;
    status: StepStatus & "error";
};

export type checkMembershipStepFn<ParamsType, AdditionalStepArgs extends any[] = [], ResolveAs extends CheckMembershipState = CheckMembershipState> = (
    params: ParamsType,
    onStep: (progress: NumberRange<0, 101>, status: StepStatus, ...args: AdditionalStepArgs) => void
) => ResolveCheckMembershipStep<ResolveAs>;
export type checkMembershipStepPromiseRejected = {
    status: StepStatus;
    message: string;
}
export enum AccountState { "ok", "checking", "error", "incomplete","notSet"}

type State = {
    account?: string;
    accountStatus: AccountState;
}

type StepsState = {
    current: number;
    progress: number;
    status?: StepStatus;
    message?: string;
}

const Eligibility = () => {
    const [state, setState] = useState<State>({accountStatus: AccountState.notSet});
    const [stepsState, setStepsState] = useState<StepsState>({current: 0, progress: 0});
    const placeholderAddress = useMemo(() => Keypair.random().publicKey(), []);
    const handleAccountInput = (e: ChangeEvent<HTMLInputElement>) => {
        if (! e.target.value.length) setStepsState(p => ({...p, current: 0}));
        setState(p => ({...p, account: e.target.value}));
    };
    const snapshotsBase = useHref("/snapshots/");
    const jpegSnapshots = useMemo(() => {
        return snapshotsIndex
            .filter(item => isJPEG(item.asset.code, item.asset.issuer));
    }, []);
    const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState<number>();

    const [snapshot, setSnapshot] = useState<SnapshotData>();

    const requiresThreshold = useMemo(() =>
            new Date(jpegSnapshots[selectedSnapshotIndex??0].date) > new Date("2022-04-01"),
        [jpegSnapshots, selectedSnapshotIndex]
    );

    const step1 = useMemo(() => {
        if (!state.account) setStepsState(p => ({...p, current: 0}));
        return () => checkAccount(
            {id: state.account??""},
            (progress, status, accountState) => {
                setStepsState(p => ({...p, progress, status}));
                if (!!accountState) {
                    setState(p => ({...p, accountState: accountState}));
                }
            }
        )
            .then(stateData => {
                if (typeof stateData === "object") {
                    setState(p => ({...p, ...stateData}));
                }
                return stateData
            });
    }, [state.account]);

    const step2 = useCallback(() => {
        return checkSnapshot(
            {
                base: snapshotsBase,
                snapshotsIndexData: getSortedSnapshotIndex(jpegSnapshots)[selectedSnapshotIndex??0],
                accountId: state.account!
            },
            (progress, status, snapshotData) => {
                setStepsState(p => ({...p, status, progress}));
                if (!!snapshotData) {
                    setSnapshot(snapshotData);
                }
            }
        );
    }, [jpegSnapshots, selectedSnapshotIndex, snapshotsBase, state.account]);

    const [balanceLow, setBalanceLow] = useState<BigNumber>();
    const step3 = useCallback(() => {
        return checkAEffects(
            {account: state.account!, snapshot: snapshot!, minThreshold: 10000},
            (progress, status, balanceInfo) => {
                let stepStatus = status;
                if (balanceInfo) {
                    setBalanceLow(balanceInfo.balanceLow);
                    if (balanceInfo.balanceLow.lt(10000)) {
                        stepStatus = "error";
                    }
                }
                setStepsState(p => ({...p, status: stepStatus, progress, message: ""+p.current}));
            })
    }, [snapshot, state.account]);

    const [payoutInfo, setPayoutInfo] = useState<Partial<CheckPayment>>();
    const step4 = useCallback(() => {
        const afterDate = new Date(jpegSnapshots[selectedSnapshotIndex??0].date);
        const beforeDate = new Date(undefined !== selectedSnapshotIndex && selectedSnapshotIndex > 0
            ? jpegSnapshots[selectedSnapshotIndex-1].date
            : Date.now()
        );
        return checkPayment(
            {
                account: state.account,
                afterDate,
                beforeDate,
            },
            (progress, status) => {
                setStepsState(p => ({...p, progress, status}));
            }
        )
            .then((resolved) => {
                if (typeof resolved === "object") {
                    setPayoutInfo(resolved);
                    return true;
                }
                return false;
            });

    }, [jpegSnapshots, selectedSnapshotIndex, state.account]);

    const steps = useMemo<(() => ResolveCheckMembershipStep<any>)[]>(() => [
        step1,
        step2,
        step3,
        step4
        // eslint-disable-next-line
    ], [state.account, selectedSnapshotIndex, snapshot]);

    const previousStep = useRef<number>();
    useEffect(() => {
        if (previousStep.current === stepsState.current && stepsState.current !== 0) {
            return;
        }
        if (stepsState.status !== "wait" && stepsState.current !== 0) {
            return;
        }
        previousStep.current = stepsState.current;
        if (stepsState.current >= steps.length) return;
        if (stepsState.current <= steps.length - 2) {
            setBalanceLow(undefined);
            setPayoutInfo(undefined);
        }
        steps[stepsState.current]()
            .catch(error => {
                console.warn(error)
                if (typeof error === "object" && error.hasOwnProperty("status") && error.hasOwnProperty("reason")) {
                    setStepsState(p => ({...p, status: error.status, message: error.reason}));
                }
                return false;
            })
            // @ts-ignore
            .then((next) => {
                if (typeof next === "boolean") {
                    if (next) {
                        setStepsState(p => ({...p, status: "finish"}));
                    }
                }
            });
        // eslint-disable-next-line
    }, [stepsState.current, steps]);

    useEffect(() => {
        if (stepsState.status !== "error") {
            if (stepsState.status === "finish") {
                setStepsState(p => {
                    const incrementStepBy = (p.current === 1 && !requiresThreshold) ? 2 : 1;
                    return ({...p, current: p.current + incrementStepBy, progress: 0, status: "wait", message: undefined})
                });
            } else {
                setStepsState(p => ({...p, message: undefined}));
            }
        }
    }, [stepsState.status, requiresThreshold]);

    const [startTime, endTime] = useMemo(() => {
        if (undefined === selectedSnapshotIndex) return [undefined, undefined];
        const end = new Date(getSortedSnapshotIndex(snapshotsIndex)[selectedSnapshotIndex].date);
        const start = new Date(getSortedSnapshotIndex(snapshotsIndex)[selectedSnapshotIndex].date);
        start.setUTCMonth(end.getUTCMonth()-1);
        return [start, end];
    }, [selectedSnapshotIndex]);

    useEffect(() => {
        setStepsState({current: 0, status: undefined, progress: 0});
    }, [selectedSnapshotIndex]);

    return <>
        <PageHeader
            title="Check JPEG membership"
            subTitle="Check your membership level here"
            extra={<>
            </>}/>

        <Row gutter={[8, 0]} wrap={false}>
            <Col flex={1}/>
            <Col flex={"200px"}>
                <Select size="large"
                        style={{width: "100%", textAlign: "left"}}
                        placeholder={"Select a snapshot"}
                        children={getSortedSnapshotIndex(jpegSnapshots).map((s, i) =>
                            <Select.Option key={i} value={i}>
                                <img alt="JPEG logo" src={logoJPEG} height={16}/>&nbsp;
                                {new Date(s.date).toLocaleDateString()}
                            </Select.Option>
                        )}
                        onSelect={(value: number) => {
                            setSelectedSnapshotIndex(value)
                        }}
                />
            </Col>
            <Col flex={"auto"}>
                <Input
                    value={state?.account}
                    size={"large"}
                    maxLength={56}
                    onChange={handleAccountInput}
                    status={state.accountStatus === AccountState.checking ? "warning" : state.accountStatus === AccountState.error ? "error" : ""}
                    placeholder={placeholderAddress}
                    type={"search"}
                    disabled={stepsState.current!==0 || selectedSnapshotIndex === undefined}
                    suffix={stepsState.current!==0?<ClearOutlined  onClick={() => setState(p => ({...p, account: ""}))}/>:<></>}
                />
            </Col>
            <Col flex={1}/>
        </Row>
        <Row style={{rowGap: 60}}><p>&nbsp;</p></Row>

        {/* @ts-ignore*/}
        <Collapse ghost={true} activeKey={state.account?.length ? "stepsPanel" : ""}>
            {/* @ts-ignore*/}
            <Collapse.Panel  showArrow={false} key={"stepsPanel"} header={<></>}>
                <Row justify={"center"} >
                    <Col flex={"auto"} >
                        {/* @ts-ignore*/}
                        <Steps
                            direction={"horizontal"}
                            percent={stepsState.progress}
                            current={stepsState.current}
                            status={stepsState.status}
                        >
                            <Steps.Step
                                title="Account"
                                description={(stepsState.current===0?stepsState.message:undefined)
                                    ??"Check if the account exists on stellar network"} />
                            <Steps.Step
                                title="Snapshot"
                                description={(stepsState.current === 1 ? stepsState.message : undefined)
                                    ??"Check if the account is included in the snapshot taken on " + endTime?.toLocaleDateString()} />
                            { requiresThreshold
                                ? <Steps.Step
                                    status={(stepsState.current === 2 && stepsState.status === "process") ? "finish" : undefined}
                                    icon={(stepsState.current === 2 && stepsState.status === "process") ? <LoadingOutlined /> : ((balanceLow && balanceLow.gte(10000))?<MembershipIcon balance={balanceLow}/>:undefined)}
                                    title="Holding threshold"
                                    description={(stepsState.current === 2 ? stepsState.message : undefined)
                                            ??"Check if account went below threshold since " + startTime?.toLocaleDateString()}
                                />
                                : <Steps.Step
                                    title={"Snapshot balance"}
                                    icon={(stepsState.current >= 2)
                                        ? <MembershipIcon balance={new BigNumber(snapshot?.accounts.find(a => a.id === state.account)?.balance??0)} />
                                        : undefined}
                                    description={"Check account balance in snapshot"}
                                />}
                            <Steps.Step
                                title={"Payout"}
                                subTitle={"Has the account received the tokens?"}
                                status={(stepsState.current === 3 && stepsState.status === "process") ? "finish" : undefined}
                                icon={(stepsState.current === 3 && stepsState.status === "process") ? <LoadingOutlined /> : undefined}
                                description={payoutInfo && <>
                                    Payment was made {payoutInfo.date!.toLocaleDateString()}.<br/>
                                    {payoutInfo.memo && <p>{payoutInfo.memo}</p>}
                                    Show on <a href={"https://stellar.expert/explorer/public/tx/"+payoutInfo.txPage+'#'+payoutInfo.opId} rel={"noreferrer"} target={"_blank"}>stellar.expert</a>.
                                </>}
                            />
                        </Steps>
                    </Col>
                    <Col flex={"auto"}/>
                </Row>
            </Collapse.Panel>
        </Collapse>
        <Row align={"middle"} justify={"center"}>
            <Col flex={"auto"}>{
                balanceLow && `The account ${state.account} held a minimum of ${balanceLow} JPEG in the period.`
            }</Col>
        </Row>
    </>
};

export default Eligibility;
