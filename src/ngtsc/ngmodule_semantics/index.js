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
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics", ["require", "exports", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/graph", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/metadata"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SemanticDepGraphAdapter = exports.SemanticDepGraphUpdater = exports.SemanticDepGraph = void 0;
    var graph_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/graph");
    Object.defineProperty(exports, "SemanticDepGraph", { enumerable: true, get: function () { return graph_1.SemanticDepGraph; } });
    Object.defineProperty(exports, "SemanticDepGraphUpdater", { enumerable: true, get: function () { return graph_1.SemanticDepGraphUpdater; } });
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/metadata");
    Object.defineProperty(exports, "SemanticDepGraphAdapter", { enumerable: true, get: function () { return metadata_1.SemanticDepGraphAdapter; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL25nbW9kdWxlX3NlbWFudGljcy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxzRkFBc0U7SUFBOUQseUdBQUEsZ0JBQWdCLE9BQUE7SUFBRSxnSEFBQSx1QkFBdUIsT0FBQTtJQUNqRCw0RkFBdUQ7SUFBL0MsbUhBQUEsdUJBQXVCLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IHtTZW1hbnRpY0RlcEdyYXBoLCBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcn0gZnJvbSAnLi9zcmMvZ3JhcGgnO1xuZXhwb3J0IHtTZW1hbnRpY0RlcEdyYXBoQWRhcHRlcn0gZnJvbSAnLi9zcmMvbWV0YWRhdGEnO1xuIl19