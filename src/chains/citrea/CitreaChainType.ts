import {ChainType} from "@atomiqlabs/base";
import {EVMPreFetchVerification} from "../../evm/swaps/modules/EVMSwapInit";
import {EVMTx} from "../../evm/chain/modules/EVMTransactions";
import {EVMSigner} from "../../evm/wallet/EVMSigner";
import {EVMSwapData} from "../../evm/swaps/EVMSwapData";
import {EVMSwapContract} from "../../evm/swaps/EVMSwapContract";
import {EVMChainInterface} from "../../evm/chain/EVMChainInterface";
import {EVMChainEventsBrowser} from "../../evm/events/EVMChainEventsBrowser";
import {EVMBtcRelay} from "../../evm/btcrelay/EVMBtcRelay";
import { EVMSpvVaultData } from "../../evm/spv_swap/EVMSpvVaultData";
import { EVMSpvWithdrawalData } from "../../evm/spv_swap/EVMSpvWithdrawalData";
import {EVMSpvVaultContract} from "../../evm/spv_swap/EVMSpvVaultContract";

export type CitreaChainType = ChainType<
    "CITREA",
    never,
    EVMPreFetchVerification,
    EVMTx,
    EVMSigner,
    EVMSwapData,
    EVMSwapContract<"CITREA">,
    EVMChainInterface<"CITREA", 5115>,
    EVMChainEventsBrowser,
    EVMBtcRelay<any>,
    EVMSpvVaultData,
    EVMSpvWithdrawalData,
    EVMSpvVaultContract<"CITREA">
>;
