import type { BaseContract, BigNumberish, BytesLike, FunctionFragment, Result, Interface, EventFragment, AddressLike, ContractRunner, ContractMethod, Listener } from "ethers";
import type { TypedContractEvent, TypedDeferredTopicFilter, TypedEventLog, TypedLogDescription, TypedListener, TypedContractMethod } from "../typechain/common";
export type StoredBlockHeaderStruct = {
    data: [BytesLike, BytesLike, BytesLike, BytesLike, BytesLike];
};
export type StoredBlockHeaderStructOutput = [
    data: [string, string, string, string, string]
] & {
    data: [string, string, string, string, string];
};
export interface BtcRelayInterface extends Interface {
    getFunction(nameOrSignature: "getBlockheight" | "getChainwork" | "getCommitHash" | "getTipCommitHash" | "submitForkBlockheaders" | "submitMainBlockheaders" | "submitShortForkBlockheaders" | "verifyBlockheader" | "verifyBlockheaderHash"): FunctionFragment;
    getEvent(nameOrSignatureOrTopic: "ChainReorg" | "StoreForkHeader" | "StoreHeader"): EventFragment;
    encodeFunctionData(functionFragment: "getBlockheight", values?: undefined): string;
    encodeFunctionData(functionFragment: "getChainwork", values?: undefined): string;
    encodeFunctionData(functionFragment: "getCommitHash", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "getTipCommitHash", values?: undefined): string;
    encodeFunctionData(functionFragment: "submitForkBlockheaders", values: [BigNumberish, BytesLike]): string;
    encodeFunctionData(functionFragment: "submitMainBlockheaders", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "submitShortForkBlockheaders", values: [BytesLike]): string;
    encodeFunctionData(functionFragment: "verifyBlockheader", values: [StoredBlockHeaderStruct]): string;
    encodeFunctionData(functionFragment: "verifyBlockheaderHash", values: [BigNumberish, BytesLike]): string;
    decodeFunctionResult(functionFragment: "getBlockheight", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getChainwork", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getCommitHash", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getTipCommitHash", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "submitForkBlockheaders", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "submitMainBlockheaders", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "submitShortForkBlockheaders", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "verifyBlockheader", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "verifyBlockheaderHash", data: BytesLike): Result;
}
export declare namespace ChainReorgEvent {
    type InputTuple = [
        commitHash: BytesLike,
        blockHash: BytesLike,
        forkId: BigNumberish,
        submitter: AddressLike,
        startHeight: BigNumberish
    ];
    type OutputTuple = [
        commitHash: string,
        blockHash: string,
        forkId: bigint,
        submitter: string,
        startHeight: bigint
    ];
    interface OutputObject {
        commitHash: string;
        blockHash: string;
        forkId: bigint;
        submitter: string;
        startHeight: bigint;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace StoreForkHeaderEvent {
    type InputTuple = [
        commitHash: BytesLike,
        blockHash: BytesLike,
        forkId: BigNumberish
    ];
    type OutputTuple = [
        commitHash: string,
        blockHash: string,
        forkId: bigint
    ];
    interface OutputObject {
        commitHash: string;
        blockHash: string;
        forkId: bigint;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export declare namespace StoreHeaderEvent {
    type InputTuple = [commitHash: BytesLike, blockHash: BytesLike];
    type OutputTuple = [commitHash: string, blockHash: string];
    interface OutputObject {
        commitHash: string;
        blockHash: string;
    }
    type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    type Filter = TypedDeferredTopicFilter<Event>;
    type Log = TypedEventLog<Event>;
    type LogDescription = TypedLogDescription<Event>;
}
export interface BtcRelay extends BaseContract {
    connect(runner?: ContractRunner | null): BtcRelay;
    waitForDeployment(): Promise<this>;
    interface: BtcRelayInterface;
    queryFilter<TCEvent extends TypedContractEvent>(event: TCEvent, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TypedEventLog<TCEvent>>>;
    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(filter: TypedDeferredTopicFilter<TCEvent>, listener: TypedListener<TCEvent>): Promise<this>;
    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
    getBlockheight: TypedContractMethod<[], [bigint], "view">;
    getChainwork: TypedContractMethod<[], [bigint], "view">;
    getCommitHash: TypedContractMethod<[height: BigNumberish], [string], "view">;
    getTipCommitHash: TypedContractMethod<[], [string], "view">;
    submitForkBlockheaders: TypedContractMethod<[
        forkId: BigNumberish,
        data: BytesLike
    ], [
        void
    ], "nonpayable">;
    submitMainBlockheaders: TypedContractMethod<[
        data: BytesLike
    ], [
        void
    ], "nonpayable">;
    submitShortForkBlockheaders: TypedContractMethod<[
        data: BytesLike
    ], [
        void
    ], "nonpayable">;
    verifyBlockheader: TypedContractMethod<[
        storedHeader: StoredBlockHeaderStruct
    ], [
        bigint
    ], "view">;
    verifyBlockheaderHash: TypedContractMethod<[
        height: BigNumberish,
        commitmentHash: BytesLike
    ], [
        bigint
    ], "view">;
    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
    getFunction(nameOrSignature: "getBlockheight"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "getChainwork"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "getCommitHash"): TypedContractMethod<[height: BigNumberish], [string], "view">;
    getFunction(nameOrSignature: "getTipCommitHash"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "submitForkBlockheaders"): TypedContractMethod<[
        forkId: BigNumberish,
        data: BytesLike
    ], [
        void
    ], "nonpayable">;
    getFunction(nameOrSignature: "submitMainBlockheaders"): TypedContractMethod<[data: BytesLike], [void], "nonpayable">;
    getFunction(nameOrSignature: "submitShortForkBlockheaders"): TypedContractMethod<[data: BytesLike], [void], "nonpayable">;
    getFunction(nameOrSignature: "verifyBlockheader"): TypedContractMethod<[
        storedHeader: StoredBlockHeaderStruct
    ], [
        bigint
    ], "view">;
    getFunction(nameOrSignature: "verifyBlockheaderHash"): TypedContractMethod<[
        height: BigNumberish,
        commitmentHash: BytesLike
    ], [
        bigint
    ], "view">;
    getEvent(key: "ChainReorg"): TypedContractEvent<ChainReorgEvent.InputTuple, ChainReorgEvent.OutputTuple, ChainReorgEvent.OutputObject>;
    getEvent(key: "StoreForkHeader"): TypedContractEvent<StoreForkHeaderEvent.InputTuple, StoreForkHeaderEvent.OutputTuple, StoreForkHeaderEvent.OutputObject>;
    getEvent(key: "StoreHeader"): TypedContractEvent<StoreHeaderEvent.InputTuple, StoreHeaderEvent.OutputTuple, StoreHeaderEvent.OutputObject>;
    filters: {
        "ChainReorg(bytes32,bytes32,uint256,address,uint256)": TypedContractEvent<ChainReorgEvent.InputTuple, ChainReorgEvent.OutputTuple, ChainReorgEvent.OutputObject>;
        ChainReorg: TypedContractEvent<ChainReorgEvent.InputTuple, ChainReorgEvent.OutputTuple, ChainReorgEvent.OutputObject>;
        "StoreForkHeader(bytes32,bytes32,uint256)": TypedContractEvent<StoreForkHeaderEvent.InputTuple, StoreForkHeaderEvent.OutputTuple, StoreForkHeaderEvent.OutputObject>;
        StoreForkHeader: TypedContractEvent<StoreForkHeaderEvent.InputTuple, StoreForkHeaderEvent.OutputTuple, StoreForkHeaderEvent.OutputObject>;
        "StoreHeader(bytes32,bytes32)": TypedContractEvent<StoreHeaderEvent.InputTuple, StoreHeaderEvent.OutputTuple, StoreHeaderEvent.OutputObject>;
        StoreHeader: TypedContractEvent<StoreHeaderEvent.InputTuple, StoreHeaderEvent.OutputTuple, StoreHeaderEvent.OutputObject>;
    };
}
