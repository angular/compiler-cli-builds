"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
/**
 * Cache, and potentially transform, metadata as it is being collected.
 */
var MetadataCache = /** @class */ (function () {
    function MetadataCache(collector, strict, transformers) {
        this.collector = collector;
        this.strict = strict;
        this.transformers = transformers;
        this.metadataCache = new Map();
        for (var _i = 0, transformers_1 = transformers; _i < transformers_1.length; _i++) {
            var transformer = transformers_1[_i];
            if (transformer.connect) {
                transformer.connect(this);
            }
        }
    }
    MetadataCache.prototype.getMetadata = function (sourceFile) {
        if (this.metadataCache.has(sourceFile.fileName)) {
            return this.metadataCache.get(sourceFile.fileName);
        }
        var substitute = undefined;
        // Only process transformers on modules that are not declaration files.
        var declarationFile = sourceFile.isDeclarationFile;
        var moduleFile = ts.isExternalModule(sourceFile);
        if (!declarationFile && moduleFile) {
            var _loop_1 = function (transform) {
                var transformSubstitute = transform.start(sourceFile);
                if (transformSubstitute) {
                    if (substitute) {
                        var previous_1 = substitute;
                        substitute = function (value, node) {
                            return transformSubstitute(previous_1(value, node), node);
                        };
                    }
                    else {
                        substitute = transformSubstitute;
                    }
                }
            };
            for (var _i = 0, _a = this.transformers; _i < _a.length; _i++) {
                var transform = _a[_i];
                _loop_1(transform);
            }
        }
        var result = this.collector.getMetadata(sourceFile, this.strict, substitute);
        this.metadataCache.set(sourceFile.fileName, result);
        return result;
    };
    return MetadataCache;
}());
exports.MetadataCache = MetadataCache;
//# sourceMappingURL=metadata_cache.js.map