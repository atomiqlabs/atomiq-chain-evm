import { ChainSwapType } from "@atomiqlabs/base";
import { IHandler } from "../IHandler";
export interface IClaimHandler<C, W> extends IHandler<C, W> {
    getType(): ChainSwapType;
}
export type ClaimHandlerType = {
    gas: number;
    type: ChainSwapType;
} & (new (address: string) => IClaimHandler<any, any>);
export declare const claimHandlersList: ClaimHandlerType[];
