/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics", ["require", "exports", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/graph", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isSymbolEqual = exports.isArrayEqual = exports.SemanticDepGraphUpdater = exports.SemanticDepGraph = exports.SemanticSymbol = void 0;
    var api_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api");
    Object.defineProperty(exports, "SemanticSymbol", { enumerable: true, get: function () { return api_1.SemanticSymbol; } });
    var graph_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/graph");
    Object.defineProperty(exports, "SemanticDepGraph", { enumerable: true, get: function () { return graph_1.SemanticDepGraph; } });
    Object.defineProperty(exports, "SemanticDepGraphUpdater", { enumerable: true, get: function () { return graph_1.SemanticDepGraphUpdater; } });
    var util_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util");
    Object.defineProperty(exports, "isArrayEqual", { enumerable: true, get: function () { return util_1.isArrayEqual; } });
    Object.defineProperty(exports, "isSymbolEqual", { enumerable: true, get: function () { return util_1.isSymbolEqual; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL25nbW9kdWxlX3NlbWFudGljcy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxrRkFBeUM7SUFBakMscUdBQUEsY0FBYyxPQUFBO0lBQ3RCLHNGQUFzRTtJQUE5RCx5R0FBQSxnQkFBZ0IsT0FBQTtJQUFFLGdIQUFBLHVCQUF1QixPQUFBO0lBQ2pELG9GQUF1RDtJQUEvQyxvR0FBQSxZQUFZLE9BQUE7SUFBRSxxR0FBQSxhQUFhLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IHtTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi9zcmMvYXBpJztcbmV4cG9ydCB7U2VtYW50aWNEZXBHcmFwaCwgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXJ9IGZyb20gJy4vc3JjL2dyYXBoJztcbmV4cG9ydCB7aXNBcnJheUVxdWFsLCBpc1N5bWJvbEVxdWFsfSBmcm9tICcuL3NyYy91dGlsJztcbiJdfQ==