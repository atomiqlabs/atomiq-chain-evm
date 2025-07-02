import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers";
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "../typechain/common";
export type EscrowDataStruct = {
    offerer: AddressLike;
    claimer: AddressLike;
    amount: BigNumberish;
    token: AddressLike;
    flags: BigNumberish;
    claimHandler: AddressLike;
    claimData: BytesLike;
    refundHandler: AddressLike;
    refundData: BytesLike;
    securityDeposit: BigNumberish;
    claimerBounty: BigNumberish;
    depositToken: AddressLike;
    successActionCommitment: BytesLike;
};
export type EscrowDataStructOutput = [
    offerer: string,
    claimer: string,
    amount: bigint,
    token: string,
    flags: bigint,
    claimHandler: string,
    claimData: string,
    refundHandler: string,
    refundData: string,
    securityDeposit: bigint,
    claimerBounty: bigint,
    depositToken: string,
    successActionCommitment: string
] & {
    offerer: string;
    claimer: string;
    amount: bigint;
    token: string;
    flags: bigint;
    claimHandler: string;
    claimData: string;
    refundHandler: string;
    refundData: string;
    securityDeposit: bigint;
    claimerBounty: bigint;
    depositToken: string;
    successActionCommitment: string;
};
export type ContractCallStruct = {
    target: AddressLike;
    value: BigNumberish;
    data: BytesLike;
};
export type ContractCallStructOutput = [
    target: string,
    value: bigint,
    data: string
] & {
    target: string;
    value: bigint;
    data: string;
};
export type ExecutionActionStruct = {
    gasLimit: BigNumberish;
    drainTokens: AddressLike[];
    calls: ContractCallStruct[];
};
export type ExecutionActionStructOutput = [
    gasLimit: bigint,
    drainTokens: string[],
    calls: ContractCallStructOutput[]
] & {
    gasLimit: bigint;
    drainTokens: string[];
    calls: ContractCallStructOutput[];
};
export type LpVaultBalanceQueryStruct = {
    owner: AddressLike;
    token: AddressLike;
};
export type LpVaultBalanceQueryStructOutput = [owner: string, token: string] & {
    owner: string;
    token: string;
};
export type EscrowStateStruct = {
    initBlockheight: BigNumberish;
    finishBlockheight: BigNumberish;
    state: BigNumberish;
};
export type EscrowStateStructOutput = [
    initBlockheight: bigint,
    finishBlockheight: bigint,
    state: bigint
] & {
    initBlockheight: bigint;
    finishBlockheight: bigint;
    state: bigint;
};
export type ReputationQueryStruct = {
    owner: AddressLike;
    token: AddressLike;
    claimHandler: AddressLike;
};
export type ReputationQueryStructOutput = [
    owner: string,
    token: string,
    claimHandler: string
] & {
    owner: string;
    token: string;
    claimHandler: string;
};
export type ReputationStateStruct = {
    amount: BigNumberish;
    count: BigNumberish;
};
export type ReputationStateStructOutput = [amount: bigint, count: bigint] & {
    amount: bigint;
    count: bigint;
};
export interface EscrowManagerInterface extends Interface {
    getFunction(nameOrSignature: "claim" | "claimWithSuccessAction" | "cooperativeRefund" | "deposit" | "eip712Domain" | "getBalance" | "getHashState" | "getHashStateMultiple" | "getReputation" | "getState" | "initialize" | "refund" | "withdraw"): FunctionFragment;
    getEvent(nameOrSignatureOrTopic: "Claim" | "EIP712DomainChanged" | "ExecutionError" | "Initialize" | "Refund"): EventFragment;
    encodeFunctionData(functionFragment: "claim", values: [EscrowDataStruct, BytesLike]): string;
    encodeFunctionData(functionFragment: "claimWithSuccessAction", values: [EscrowDataStruct, BytesLike, ExecutionActionStruct]): string;
    encodeFunctionData(functionFragment: "cooperativeRefund", values: [EscrowDataStruct, BytesLike, BigNumberish]): string;
    encodeFunctionData(functionFragment: "deposit", values: [AddressLike, BigNumberish]): string;
    encodeFunctionData(functionFragment: "eip712Domain", values?: undefined): string;
    encodeFunctionData(functionFragment: "getBalance", values: [LpVaultBalanceQueryStruct[]]): string;
    encodeFunctionData(functionFragment: "getHashState", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "getHashStateMultiple", values: [BytesLike[]]): string;
    encodeFunctionData(functionFragment: "getReputation", values: [ReputationQueryStruct[]]): string;
    encodeFunctionData(functionFragment: "getState", values: [EscrowDataStruct]): string;
    encodeFunctionData(functionFragment: "initialize", values: [EscrowDataStruct, BytesLike, BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "refund", values: [EscrowDataStruct, BytesLike]): string;
    encodeFunctionData(functionFragment: "withdraw", values: [AddressLike, BigNumberish, AddressLike]): string;
    decodeFunctionResult(functionFragment: "claim", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "claimWithSuccessAction", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "cooperativeRefund", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "deposit", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "eip712Domain", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getBalance", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getHashState", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getHashStateMultiple", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getReputation", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getState", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "refund", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "withdraw", data: BytesLike): Result;
}
export declare namespace ClaimEvent {
    type InputTuple = [
        offerer: AddressLike,
        claimer: AddressLike,
        escrowHash: BytesLike,
        claimHandler: AddressLike,
        witnessResult: BytesLike
    ];
    type OutputTuple = [
        offerer: string,
        claimer: string,
        escrowHash: string,
        claimHandler: string,
        witnessResult: string
    ];
    interface OutputObject {
        offerer: string;
        claimer: string;
        escrowHash: string;
        claimHandler: string;
        witnessResult: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace EIP712DomainChangedEvent {
    type InputTuple = [];
    type OutputTuple = [];
    interface OutputObject {
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace ExecutionErrorEvent {
    type InputTuple = [escrowHash: BytesLike, error: BytesLike];
    type OutputTuple = [escrowHash: string, error: string];
    interface OutputObject {
        escrowHash: string;
        error: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace InitializeEvent {
    type InputTuple = [
        offerer: AddressLike,
        claimer: AddressLike,
        escrowHash: BytesLike,
        claimHandler: AddressLike,
        refundHandler: AddressLike
    ];
    type OutputTuple = [
        offerer: string,
        claimer: string,
        escrowHash: string,
        claimHandler: string,
        refundHandler: string
    ];
    interface OutputObject {
        offerer: string;
        claimer: string;
        escrowHash: string;
        claimHandler: string;
        refundHandler: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RefundEvent {
    type InputTuple = [
        offerer: AddressLike,
        claimer: AddressLike,
        escrowHash: BytesLike,
        refundHandler: AddressLike,
        witnessResult: BytesLike
    ];
    type OutputTuple = [
        offerer: string,
        claimer: string,
        escrowHash: string,
        refundHandler: string,
        witnessResult: string
    ];
    interface OutputObject {
        offerer: string;
        claimer: string;
        escrowHash: string;
        refundHandler: string;
        witnessResult: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export interface EscrowManager extends BaseContract {
    connect(runner?: ContractRunner | null): EscrowManager;
    waitForDeployment(): Promise<this>;
    interface: EscrowManagerInterface;
    queryFilter<TCEvent extends TypedContractEvent>(event: TCEvent, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
    claim: TypedContractMethod<[
        escrow: EscrowDataStruct,
        witness: BytesLike
    ], [
        void
    ], "nonpayable">;
    claimWithSuccessAction: TypedContractMethod<[
        escrow: EscrowDataStruct,
        witness: BytesLike,
        successAction: ExecutionActionStruct
    ], [
        void
    ], "nonpayable">;
    cooperativeRefund: TypedContractMethod<[
        escrow: EscrowDataStruct,
        signature: BytesLike,
        timeout: BigNumberish
    ], [
        void
    ], "nonpayable">;
    deposit: TypedContractMethod<[
        token: AddressLike,
        amount: BigNumberish
    ], [
        void
    ], "payable">;
    eip712Domain: TypedContractMethod<[
    ], [
        [
            string,
            string,
            string,
            bigint,
            string,
            string,
            bigint[]
        ] & {
            fields: string;
            name: string;
            version: string;
            chainId: bigint;
            verifyingContract: string;
            salt: string;
            extensions: bigint[];
        }
    ], "view">;
    getBalance: TypedContractMethod<[
        data: LpVaultBalanceQueryStruct[]
    ], [
        bigint[]
    ], "view">;
    getHashState: TypedContractMethod<[
        escrowHash: BytesLike
    ], [
        EscrowStateStructOutput
    ], "view">;
    getHashStateMultiple: TypedContractMethod<[
        escrowHash: BytesLike[]
    ], [
        EscrowStateStructOutput[]
    ], "view">;
    getReputation: TypedContractMethod<[
        data: ReputationQueryStruct[]
    ], [
        [
            ReputationStateStructOutput,
            ReputationStateStructOutput,
            ReputationStateStructOutput
        ][]
    ], "view">;
    getState: TypedContractMethod<[
        escrowData: EscrowDataStruct
    ], [
        EscrowStateStructOutput
    ], "view">;
    initialize: TypedContractMethod<[
        escrow: EscrowDataStruct,
        signature: BytesLike,
        timeout: BigNumberish,
        _extraData: BytesLike
    ], [
        void
    ], "payable">;
    refund: TypedContractMethod<[
        escrow: EscrowDataStruct,
        witness: BytesLike
    ], [
        void
    ], "nonpayable">;
    withdraw: TypedContractMethod<[
        token: AddressLike,
        amount: BigNumberish,
        destination: AddressLike
    ], [
        void
    ], "nonpayable">;
    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
    getFunction(nameOrSignature: "claim"): TypedContractMethod<[
        escrow: EscrowDataStruct,
        witness: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "claimWithSuccessAction"): TypedContractMethod<[
        escrow: EscrowDataStruct,
        witness: BytesLike,
        successAction: ExecutionActionStruct
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "cooperativeRefund"): TypedContractMethod<[
        escrow: EscrowDataStruct,
        signature: BytesLike,
        timeout: BigNumberish
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "deposit"): TypedContractMethod<[
        token: AddressLike,
        amount: BigNumberish
    ], [
        void
    ], "payable">;
    getFunction(nameOrSignature: "eip712Domain"): TypedContractMethod<[
    ], [
        [
            string,
            string,
            string,
            bigint,
            string,
            string,
            bigint[]
        ] & {
            fields: string;
            name: string;
            version: string;
            chainId: bigint;
            verifyingContract: string;
            salt: string;
            extensions: bigint[];
        }
    ], "view">;
    getFunction(nameOrSignature: "getBalance"): TypedContractMethod<[
        data: LpVaultBalanceQueryStruct[]
    ], [
        bigint[]
    ], "view">;
    getFunction(nameOrSignature: "getHashState"): TypedContractMethod<[
        escrowHash: BytesLike
    ], [
        EscrowStateStructOutput
    ], "view">;
    getFunction(nameOrSignature: "getHashStateMultiple"): TypedContractMethod<[
        escrowHash: BytesLike[]
    ], [
        EscrowStateStructOutput[]
    ], "view">;
    getFunction(nameOrSignature: "getReputation"): TypedContractMethod<[
        data: ReputationQueryStruct[]
    ], [
        [
            ReputationStateStructOutput,
            ReputationStateStructOutput,
            ReputationStateStructOutput
        ][]
    ], "view">;
    getFunction(nameOrSignature: "getState"): TypedContractMethod<[
        escrowData: EscrowDataStruct
    ], [
        EscrowStateStructOutput
    ], "view">;
    getFunction(nameOrSignature: "initialize"): TypedContractMethod<[
        escrow: EscrowDataStruct,
        signature: BytesLike,
        timeout: BigNumberish,
        _extraData: BytesLike
    ], [
        void
    ], "payable">;
    getFunction(nameOrSignature: "refund"): TypedContractMethod<[
        escrow: EscrowDataStruct,
        witness: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "withdraw"): TypedContractMethod<[
        token: AddressLike,
        amount: BigNumberish,
        destination: AddressLike
    ], [
        void
    ], "nonpayable">;
    getEvent(key: "Claim"): TypedContractEvent<ClaimEvent.InputTuple, ClaimEvent.OutputTuple, ClaimEvent.OutputObject>;
    getEvent(key: "EIP712DomainChanged"): TypedContractEvent<EIP712DomainChangedEvent.InputTuple, EIP712DomainChangedEvent.OutputTuple, EIP712DomainChangedEvent.OutputObject>;
    getEvent(key: "ExecutionError"): TypedContractEvent<ExecutionErrorEvent.InputTuple, ExecutionErrorEvent.OutputTuple, ExecutionErrorEvent.OutputObject>;
    getEvent(key: "Initialize"): TypedContractEvent<InitializeEvent.InputTuple, InitializeEvent.OutputTuple, InitializeEvent.OutputObject>;
    getEvent(key: "Refund"): TypedContractEvent<RefundEvent.InputTuple, RefundEvent.OutputTuple, RefundEvent.OutputObject>;
    filters: {
        "Claim(address,address,bytes32,address,bytes)": TypedContractEvent<ClaimEvent.InputTuple, ClaimEvent.OutputTuple, ClaimEvent.OutputObject>;
        Claim: TypedContractEvent<ClaimEvent.InputTuple, ClaimEvent.OutputTuple, ClaimEvent.OutputObject>;
        "EIP712DomainChanged()": TypedContractEvent<EIP712DomainChangedEvent.InputTuple, EIP712DomainChangedEvent.OutputTuple, EIP712DomainChangedEvent.OutputObject>;
        EIP712DomainChanged: TypedContractEvent<EIP712DomainChangedEvent.InputTuple, EIP712DomainChangedEvent.OutputTuple, EIP712DomainChangedEvent.OutputObject>;
        "ExecutionError(bytes32,bytes)": TypedContractEvent<ExecutionErrorEvent.InputTuple, ExecutionErrorEvent.OutputTuple, ExecutionErrorEvent.OutputObject>;
        ExecutionError: TypedContractEvent<ExecutionErrorEvent.InputTuple, ExecutionErrorEvent.OutputTuple, ExecutionErrorEvent.OutputObject>;
        "Initialize(address,address,bytes32,address,address)": TypedContractEvent<InitializeEvent.InputTuple, InitializeEvent.OutputTuple, InitializeEvent.OutputObject>;
        Initialize: TypedContractEvent<InitializeEvent.InputTuple, InitializeEvent.OutputTuple, InitializeEvent.OutputObject>;
        "Refund(address,address,bytes32,address,bytes)": TypedContractEvent<RefundEvent.InputTuple, RefundEvent.OutputTuple, RefundEvent.OutputObject>;
        Refund: TypedContractEvent<RefundEvent.InputTuple, RefundEvent.OutputTuple, RefundEvent.OutputObject>;
    };
}
