import {Col, Input, PageHeader, Row, Steps} from "antd";
import React, {ChangeEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Keypair} from "stellar-sdk";
import snapshotsIndex from "./snapshots_index.json";
import {getSortedSnapshotIndex} from "./Snapshots";

import {useHref} from "react-router-dom";
import SnapshotData from "./SnapshotData";
import {AccountState, ResolveCheckMembershipStep, StepStatus} from "./CheckMembership";
import checkAccount from "./CheckMembership/checkAccount";
import {ClearOutlined} from "@ant-design/icons";
import checkSnapshot from "./CheckMembership/checkSnapshot";
import {checkAEffects} from "./CheckMembership/checkEffects";


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


const isJPEG = (code: string, issuer: string): boolean => {
    return code === 'JPEG'
        && issuer === 'GDZQGQFWKQQWJ7ACKK4DJKFQ7QQ5FXD3PEQBDUBISTNJYW5LWW3FSCKK';
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
    const [snapshot, setSnapshot] = useState<SnapshotData>();

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

    const step2 = () => {
        const snapshots = snapshotsIndex
            .filter(item => isJPEG(item.asset.code, item.asset.issuer));
        return checkSnapshot(
            {
                base: snapshotsBase,
                snapshotsIndexData: getSortedSnapshotIndex(snapshots)[0],
                accountId: state.account!
            },
            (progress, status, snapshotData) => {
                setStepsState(p => ({...p, status, progress}));
                if (!!snapshotData) {
                    setSnapshot(snapshotData);
                }
            }
        );
    };
    const [balanceLow, setBalanceLow] = useState<string>();
    const step3 = useCallback(() => {
            return checkAEffects(
                {account: state.account!, snapshot: snapshot!},
                (progress, status, balanceInfo) => {
                    setStepsState(p => ({...p, status, progress}));
                    if (balanceInfo) {
                        setBalanceLow(balanceInfo.balanceLow);
                    }
                })
                .catch(() => setStepsState(p => ({...p, status: "finish"})))
                .then(()=> true)
        }, [snapshot, state.account]);

    const steps = useMemo<(() => ResolveCheckMembershipStep)[]>(() => [
        step1,
        step2,
        step3,
        // eslint-disable-next-line
    ], [state.account, snapshot]);

    const previousStep = useRef<number>();
    useEffect(() => {
        //console.log(stepsState)
        if (previousStep.current === stepsState.current && stepsState.current !== 0) {
            return;
        }
        if (stepsState.status !== "wait" && stepsState.current !== 0) {
            return;
        }
        previousStep.current = stepsState.current;
        if (stepsState.current >= steps.length) return;
        steps[stepsState.current]()
            .catch(error => {
                if (error.hasOwnProperty("status") && error.hasOwnProperty("reason")) {
                    console.warn(error)
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
                    return ({...p, current: p.current+1, progress: 0, status: "wait", message: undefined})
                });
            } else {
                setStepsState(p => ({...p, message: undefined}));
            }
        }
    }, [stepsState.status]);

    const startTime = new Date(getSortedSnapshotIndex(snapshotsIndex)[0].date);
    startTime.setUTCMonth(startTime.getUTCMonth()-1);
    return <>
        <PageHeader
    title="Check JPEG membership"
    subTitle="Check your membership level here"
    extra={<>
    </>}/>


        <Row gutter={[0, 16]}>
            <Col flex={1}/>
            <Col flex={"auto"}>
                <Input
                    value={state?.account}
                    size={"large"}
                    maxLength={56}
                    onChange={handleAccountInput}
                    status={state.accountStatus === AccountState.checking ? "warning" : state.accountStatus === AccountState.error ? "error" : ""}
                    placeholder={placeholderAddress}
                    type={"search"}
                    disabled={stepsState.current!==0}
                    suffix={stepsState.current!==0?<ClearOutlined  onClick={() => setState(p => ({...p, account: ""}))}/>:<></>}
                />
            </Col>
            <Col flex={1}/>
        </Row>
        <Row style={{rowGap: 60}}><p>&nbsp;</p></Row>
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
                        description={(stepsState.current===1?stepsState.message:undefined)
                            ??"Check if the account is included in the snapshot taken on " + new Date(getSortedSnapshotIndex(snapshotsIndex)[0].date).toLocaleDateString()} />
                    <Steps.Step
                        title="Holding threshold"
                        description={(stepsState.current===2?stepsState.message:undefined)
                            ??"Check if account went below threshold since " + startTime.toLocaleDateString()} />

                </Steps>
            </Col>
            <Col flex={"auto"}/>
        </Row>
        <Row align={"middle"} justify={"center"}>
            <Col flex={"auto"}>{
                balanceLow && `The account ${state.account} held a minimum of ${balanceLow} JPEG in the period.`
            }</Col>
        </Row>
    </>
};

export default Eligibility;
