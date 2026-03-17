"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMModule = void 0;
const Utils_1 = require("../../utils/Utils");
/**
 * Base module class shared by EVM chain submodules.
 *
 * @category Internal/Chain
 */
class EVMModule {
    constructor(root) {
        this.logger = (0, Utils_1.getLogger)(this.constructor.name + ": ");
        this.provider = root.provider;
        this.retryPolicy = root._retryPolicy;
        this.root = root;
    }
}
exports.EVMModule = EVMModule;
