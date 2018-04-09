"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const util_1 = require("./util");
/**
 * Cache, and potentially transform, metadata as it is being collected.
 */
class MetadataCache {
    constructor(collector, strict, transformers) {
        this.collector = collector;
        this.strict = strict;
        this.transformers = transformers;
        this.metadataCache = new Map();
        for (let transformer of transformers) {
            if (transformer.connect) {
                transformer.connect(this);
            }
        }
    }
    getMetadata(sourceFile) {
        if (this.metadataCache.has(sourceFile.fileName)) {
            return this.metadataCache.get(sourceFile.fileName);
        }
        let substitute = undefined;
        // Only process transformers on modules that are not declaration files.
        const declarationFile = sourceFile.isDeclarationFile;
        const moduleFile = ts.isExternalModule(sourceFile);
        if (!declarationFile && moduleFile) {
            for (let transform of this.transformers) {
                const transformSubstitute = transform.start(sourceFile);
                if (transformSubstitute) {
                    if (substitute) {
                        const previous = substitute;
                        substitute = (value, node) => transformSubstitute(previous(value, node), node);
                    }
                    else {
                        substitute = transformSubstitute;
                    }
                }
            }
        }
        const isTsFile = util_1.TS.test(sourceFile.fileName);
        const result = this.collector.getMetadata(sourceFile, this.strict && isTsFile, substitute);
        this.metadataCache.set(sourceFile.fileName, result);
        return result;
    }
}
exports.MetadataCache = MetadataCache;
//# sourceMappingURL=metadata_cache.js.map