import { EVMModule } from "../EVMModule";
export declare class EVMAddresses extends EVMModule<any> {
    /**
     * Checks whether an address is a valid EVM address
     *
     * @param value
     */
    static isValidAddress(value: string): boolean;
}
