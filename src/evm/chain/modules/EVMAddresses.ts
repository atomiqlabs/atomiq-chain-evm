import {EVMModule} from "../EVMModule";
import {Wallet, isAddress} from "ethers";


export class EVMAddresses extends EVMModule<any> {

    ///////////////////
    //// Address utils
    /**
     * Checks whether an address is a valid EVM address
     *
     * @param value
     */
    static isValidAddress(value: string): boolean {
        if(value.length!==42) return false;
        try {
            isAddress(value);
            return true;
        } catch (e) {
            return false;
        }
    }

    static randomAddress(): string {
        const wallet = Wallet.createRandom();
        return wallet.address;
    }

}