import {server} from './common';
import {Col, Input, PageHeader, Row, Space, Steps} from "antd";
import React, {ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import {Keypair, ServerApi} from "stellar-sdk";
import snapshotsIndex from "./snapshots_index.json";
import {SnapshotIndexData, sortIndexDataByDate} from "./Snapshots";

import {useHref} from "react-router-dom";
import SnapshotData from "./SnapshotData";
import BigNumber from "bignumber.js";
import loopcall from "@cosmic-plus/loopcall";
import {AccountCredited, AccountDebited} from "stellar-sdk/lib/types/effects";
import {OfferAsset} from "stellar-sdk/lib/types/offer";
import {AccountState} from "./CheckMembership";
import {checkAccount} from "./CheckMembership/checkAccount";





interface State {
    account?: string;
    accountStatus: AccountState;
    checkingMembership: false;
    currentStep: number;
}

type StepState = "error"|"wait"|undefined|"finish";
interface StepDefinition {
    fn: () => Promise<boolean>;
    name: string;
    description?: string;
}
interface StepPromiseRejected {
    status: StepState;
    message: string;
}

const getSortedSnapshotIndex = (snapshotsIndex: SnapshotIndexData[]): SnapshotIndexData[] => {
    return snapshotsIndex.sort(sortIndexDataByDate).reverse();
}

const isAfterTo = (to: Date, current: Date) => to < current;
const isBeforeFrom = (from: Date, current: Date) => from > current;
const isJPEG = (record: OfferAsset) => record.asset_type === 'credit_alphanum4'
    && record.asset_code === 'JPEG'
    && record.asset_issuer === 'GDZQGQFWKQQWJ7ACKK4DJKFQ7QQ5FXD3PEQBDUBISTNJYW5LWW3FSCKK'

const checkEffects = (account: string, from: Date, to: Date, onStep: () => void): Promise<ServerApi.EffectRecord[]> => {
    const filter = (record: ServerApi.EffectRecord) => {
        if (isAfterTo(to, new Date(record.created_at))) return false;
        if (['account_credited', 'account_debited'].some(e => e === record.type)) {
            onStep();
            if (isJPEG(record as OfferAsset)) return true;
        }
        return false;
    };

    const breaker = (record: ServerApi.EffectRecord) => isBeforeFrom(from, new Date(record.created_at));

    return loopcall(server.effects().forAccount(account).order("desc"), {filter, breaker})
}

const Eligibility = () => {
    const [state, setState] = useState<State>({accountStatus: AccountState.notSet, checkingMembership: false, currentStep: 0});
    const placeholderAddress = useMemo(() => Keypair.random().publicKey(), []);
    const handleAccountInput = (e: ChangeEvent<HTMLInputElement>) => {
        setState(p => ({...p, account: e.target.value}));
        checkAccount({id: e.target.value}, (progress, state) => {
            setStepProgress(progress);
            if (!!state) {
                setState(p => ({...p, accountStatus: state}));
            }
        })
            .then(({status, account}) => {
                setState(p => ({...p, account: account??p.account, accountStatus: status}));
            });
    };
    const [stepProgress, setStepProgress] = useState<number|undefined>();
    const [currentStepStatus, setCurrentStepStatus] = useState<StepState>("wait");
    const snapshotsBase = useHref("/snapshots/");
    const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);

    const steps = useMemo<StepDefinition[]>(() => [
        {
            fn: () => Promise.resolve(false),  /*checkAccount({id: state.account??""}, setStepProgress)
                .then(() => true),
/*
                new Promise((resolve, reject) => {
                switch (state.accountStatus) {
                    case accountStates.checking:
                        setStepProgress(50);
                        reject({status: undefined, message: "checking account"} as StepPromiseRejected);
                        break;
                    case accountStates.error:
                        reject({status: "error", message: "error with account"} as StepPromiseRejected);
                        break;
                    case accountStates.incomplete:
                    case accountStates.notSet:
                        reject({status: "wait", message: "no account to check"} as StepPromiseRejected);
                        break;
                    case accountStates.ok:
                        resolve(true);
                }
            })*/
            name: "Account",
            description: "Check if the account exists on stellar network"
        },
        {
            fn: () => {
                setStepProgress(0);
                if (snapshotsIndex.length < 2) {
                    return Promise.reject({message: "No previous snapshot exists", status: "error"} as StepPromiseRejected);
                }

                return fetch(snapshotsBase + getSortedSnapshotIndex(snapshotsIndex)[1].filename)
                    .then(response => response.json())
                    .then(json => {
                        setStepProgress(50);
                        if ((json as SnapshotData).accounts.some(account => account.id === state.account)) {
                            setSnapshots(p => p.concat(json));
                            return true;
                        }
                        return Promise.reject({status: "error", message: "account not found in snapshot"} as StepPromiseRejected);
                    })
            },
            name: "Previous snapshot",
            description: "Check if the account is included in the snapshot taken on " + new Date(getSortedSnapshotIndex(snapshotsIndex)[1]?.date).toLocaleDateString(),
        },
        {
            fn: () => {
                setStepProgress(0);
                if (snapshotsIndex.length < 1) {
                    return Promise.reject({message: "No snapshot found", status: "error"} as StepPromiseRejected);
                }
                return fetch(snapshotsBase + getSortedSnapshotIndex(snapshotsIndex)[0].filename)
                    .then(response => response.json())
                    .then(json => {
                        setStepProgress(50);
                        if ((json as SnapshotData).accounts.some(account => account.id === state.account)) {
                            setSnapshots(p => p.concat(json));
                            return true;
                        }
                        return Promise.reject({status: "error", message: "account not found in snapshot"} as StepPromiseRejected);
                    })
            },
            name: "Current snapshot",
            description: "Check if the account is included in the snapshot taken on " + new Date(getSortedSnapshotIndex(snapshotsIndex)[0]?.date).toLocaleDateString(),
        },
        {
            fn: () => {
                setStepProgress(0);
                const balances = [
                    snapshots[0].accounts.find(a => a.id === state.account)!.balance,
                    snapshots[1].accounts.find(a => a.id === state.account)!.balance
                ].map(b => new BigNumber(b));
                return checkEffects(
                    state.account!,
                    new Date(snapshots[0].updated),
                    new Date(snapshots[1].updated),
                    () => setStepProgress(p => (p??0)+1)
                    )
                    .then(effects => effects.reverse())
                    .then(effects => effects.map(e => {
                        const amount = new BigNumber((e as AccountCredited).amount);
                        return (e.type === 'account_debited'
                            ? amount.multipliedBy(-1)
                            : amount);
                    }))
                    .then(amounts => {
                        const initial = {low: balances[0], balance: balances[0]};
                        const reduced = amounts
                            .map(a => ({balance: new BigNumber(a), low: new BigNumber(0)}))
                            .reduce((prev: {balance: BigNumber, low: BigNumber}, current: {balance: BigNumber, low: BigNumber}) => {
                            const balance = prev.balance.plus(current.balance);
                            const low = prev.low.lt(balance) ? prev.low : balance;
                            return {low, balance};
                        }, initial);

                        return ({
                            account: state.account,
                            activities: amounts.length,
                            low: reduced.low.toString(),
                            calculated: reduced.balance.toString(),
                            start: balances[0].toString(),
                            end: balances[1].toString()
                        })
                    })
                    .then(e => console.log(JSON.stringify(e)))
                    .then(() => true);

            },
            name: "Holding threshold",
            description: "Check if account went below threshold between the snapshots",
        }
        // eslint-disable-next-line
    ], [state.accountStatus, snapshots]);

    const previousStep = useRef<number>();
    useEffect(() => {
        if (state.accountStatus !== AccountState.ok) {
            setState(p => ({...p, currentStep: 0}));
        }
        if (previousStep.current === state.currentStep && state.currentStep !== 0) {
            return;
        }
        previousStep.current = state.currentStep;
        if (state.currentStep >= steps.length) return;

        steps[state.currentStep].fn()
            // @ts-ignore
            .catch(({status}: StepPromiseRejected) => {
                setCurrentStepStatus(status);
            })
            .then((next) => {if (next) {
                if (state.currentStep < steps.length-1) {
                    setState(p => ({...p, currentStep: p.currentStep++}));
                } else {
                    setCurrentStepStatus("finish");
                }
            }});
    }, [state.accountStatus, state.currentStep, steps]);

    useEffect(() => {
        if (state.currentStep === 0) {
            setStepProgress(undefined);
            setCurrentStepStatus("wait");
        } else if (state.currentStep >= steps.length) {
            setStepProgress(0);
            setCurrentStepStatus("finish");

        } else {
            setStepProgress(0);
            setCurrentStepStatus(undefined);
        }
    }, [state.currentStep]);

    const timelineItems = useMemo(() => {
        // @ts-ignore
        return steps.map((step, i) =>
            <Steps.Step title={step.name} key={i} description={step.description} />
        )
    }, [steps]);

    return <>
        <PageHeader
    title="Check JPEG membership"
    subTitle="Check your membership level here"
    extra={<>
    </>}/>


        <Row gutter={[48, 16]}>
            <Col flex={1}/>
            <Col flex={"auto"}>
                <Input.Search
                    value={state?.account}
                    size={"large"}
                    maxLength={56}
                    onChange={handleAccountInput}
                    status={state.accountStatus === AccountState.checking ? "warning" : state.accountStatus === AccountState.error ? "error" : ""}
                    placeholder={placeholderAddress}
                    type={"search"}
                    enterButton
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
                    percent={stepProgress}
                    current={state.currentStep}
                    status={currentStepStatus}
                >
                    {
                        timelineItems
                        /*
                        <Steps.Step title={"Previous snapshot"}/>
                        <Steps.Step title={"Current snapshot"} subTitle={"some"} description={"more"}/>
                        <Steps.Step title={"Transactions between"} />
                        <Steps.Step title={"Check holding of level snapshot"} />
                        <Steps.Step title={"Check holding of level snapshot"} />
                        */
                    }
                </Steps>
            </Col>
            <Col flex={"auto"}/>
        </Row>
    </>
};

export default Eligibility;
