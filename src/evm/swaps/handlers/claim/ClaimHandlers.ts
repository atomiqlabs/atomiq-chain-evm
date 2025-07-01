import {HashlockClaimHandler} from "./HashlockClaimHandler";
import {ChainSwapType} from "@atomiqlabs/base";
import {IHandler} from "../IHandler";
import {BitcoinTxIdClaimHandler} from "./btc/BitcoinTxIdClaimHandler";
import {BitcoinOutputClaimHandler} from "./btc/BitcoinOutputClaimHandler";
import {BitcoinNoncedOutputClaimHandler} from "./btc/BitcoinNoncedOutputClaimHandler";

export interface IClaimHandler<C, W> extends IHandler<C, W> {
    getType(): ChainSwapType;
}

export type ClaimHandlerType = {gas: number, type: ChainSwapType} & (new (address: string) => IClaimHandler<any, any>);

export const claimHandlersList: ClaimHandlerType[] = [
    HashlockClaimHandler,
    BitcoinTxIdClaimHandler,
    BitcoinOutputClaimHandler,
    BitcoinNoncedOutputClaimHandler
];

