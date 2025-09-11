import {ChainType} from "@atomiqlabs/base";
import {EVMPreFetchVerification} from "../../evm/swaps/modules/EVMSwapInit";
import {EVMTx} from "../../evm/chain/modules/EVMTransactions";
import {EVMSigner} from "../../evm/wallet/EVMSigner";
import {EVMSwapData} from "../../evm/swaps/EVMSwapData";
import {EVMChainInterface} from "../../evm/chain/EVMChainInterface";
import {EVMChainEventsBrowser} from "../../evm/events/EVMChainEventsBrowser";
import { EVMSpvVaultData } from "../../evm/spv_swap/EVMSpvVaultData";
import { EVMSpvWithdrawalData } from "../../evm/spv_swap/EVMSpvWithdrawalData";
import {CitreaSwapContract} from "./CitreaSwapContract";
import {CitreaBtcRelay} from "./CitreaBtcRelay";
import {CitreaSpvVaultContract} from "./CitreaSpvVaultContract";

export type CitreaChainType = ChainType<
    "CITREA",
    never,
    EVMPreFetchVerification,
    EVMTx,
    EVMSigner,
    EVMSwapData,
    CitreaSwapContract,
    EVMChainInterface<"CITREA">,
    EVMChainEventsBrowser,
    CitreaBtcRelay<any>,
    EVMSpvVaultData,
    EVMSpvWithdrawalData,
    CitreaSpvVaultContract
>;
