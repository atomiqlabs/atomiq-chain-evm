import { ChainSwapType } from "@atomiqlabs/base";
import { IHandler } from "../IHandler";
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
export type ClaimHandlerType = {
    gas: number;
    type: ChainSwapType;
} & (new (address: string) => IClaimHandler<any, any>);
/**
 * Supported claim handler implementations for EVM swap contract initialization.
 *
 * @category Internal/Handlers
 */
export declare const claimHandlersList: ClaimHandlerType[];
