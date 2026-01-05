import {ChainType} from "@atomiqlabs/base";
import {EVMPreFetchVerification} from "../../evm/swaps/modules/EVMSwapInit";
import {EVMTx, SignedEVMTx} from "../../evm/chain/modules/EVMTransactions";
import {EVMSigner} from "../../evm/wallet/EVMSigner";
import {EVMSwapData} from "../../evm/swaps/EVMSwapData";
import {EVMChainInterface} from "../../evm/chain/EVMChainInterface";
import {EVMChainEventsBrowser} from "../../evm/events/EVMChainEventsBrowser";
import { EVMSpvVaultData } from "../../evm/spv_swap/EVMSpvVaultData";
import { EVMSpvWithdrawalData } from "../../evm/spv_swap/EVMSpvWithdrawalData";
import {EVMSwapContract} from "../../evm/swaps/EVMSwapContract";
import {EVMBtcRelay} from "../../evm/btcrelay/EVMBtcRelay";
import {EVMSpvVaultContract} from "../../evm/spv_swap/EVMSpvVaultContract";
import {Signer} from "ethers";

export type BotanixChainType = ChainType<
    "BOTANIX",
    never,
    EVMPreFetchVerification,
    EVMTx,
    SignedEVMTx,
    EVMSigner,
    Signer,
    EVMSwapData,
    EVMSwapContract<"BOTANIX">,
    EVMChainInterface<"BOTANIX">,
    EVMChainEventsBrowser,
    EVMBtcRelay<any>,
    EVMSpvWithdrawalData,
    EVMSpvVaultData,
    EVMSpvVaultContract<"BOTANIX">
>;
