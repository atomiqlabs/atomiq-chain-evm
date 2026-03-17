import {HashlockClaimHandler} from "./HashlockClaimHandler";
import {ChainSwapType} from "@atomiqlabs/base";
import {IHandler} from "../IHandler";
import {BitcoinTxIdClaimHandler} from "./btc/BitcoinTxIdClaimHandler";
import {BitcoinOutputClaimHandler} from "./btc/BitcoinOutputClaimHandler";
import {BitcoinNoncedOutputClaimHandler} from "./btc/BitcoinNoncedOutputClaimHandler";

/**
 * Base interface for claim handlers with explicit chain swap type.
 *
 * @category Internal/Handlers
 */
export interface IClaimHandler<C, W> extends IHandler<C, W> {
    getType(): ChainSwapType;
}

/**
 * Claim handler constructor contract with static metadata used during handler registration.
 *
 * @category Internal/Handlers
 */
export type ClaimHandlerType = {gas: number, type: ChainSwapType} & (new (address: string) => IClaimHandler<any, any>);

/**
 * Supported claim handler implementations for EVM swap contract initialization.
 *
 * @category Internal/Handlers
 */
export const claimHandlersList: ClaimHandlerType[] = [
    HashlockClaimHandler,
    BitcoinTxIdClaimHandler,
    BitcoinOutputClaimHandler,
    BitcoinNoncedOutputClaimHandler
];

