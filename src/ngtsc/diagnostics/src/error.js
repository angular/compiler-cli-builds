/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/error", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isFatalDiagnosticError = exports.makeDiagnostic = exports.FatalDiagnosticError = void 0;
    var ts = require("typescript");
    var FatalDiagnosticError = /** @class */ (function () {
        function FatalDiagnosticError(code, node, message) {
            this.code = code;
            this.node = node;
            this.message = message;
            /**
             * @internal
             */
            this._isFatalDiagnosticError = true;
        }
        FatalDiagnosticError.prototype.toDiagnostic = function () {
            return makeDiagnostic(this.code, this.node, this.message);
        };
        return FatalDiagnosticError;
    }());
    exports.FatalDiagnosticError = FatalDiagnosticError;
    function makeDiagnostic(code, node, messageText, relatedInfo) {
        node = ts.getOriginalNode(node);
        var diag = {
            category: ts.DiagnosticCategory.Error,
            code: Number('-99' + code.valueOf()),
            file: ts.getOriginalNode(node).getSourceFile(),
            start: node.getStart(undefined, false),
            length: node.getWidth(),
            messageText: messageText,
        };
        if (relatedInfo !== undefined) {
            diag.relatedInformation = relatedInfo.map(function (info) {
                var infoNode = ts.getOriginalNode(info.node);
                return {
                    category: ts.DiagnosticCategory.Message,
                    code: 0,
                    file: infoNode.getSourceFile(),
                    start: infoNode.getStart(),
                    length: infoNode.getWidth(),
                    messageText: info.messageText,
                };
            });
        }
        return diag;
    }
    exports.makeDiagnostic = makeDiagnostic;
    function isFatalDiagnosticError(err) {
        return err._isFatalDiagnosticError === true;
    }
    exports.isFatalDiagnosticError = isFatalDiagnosticError;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzL3NyYy9lcnJvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFJakM7UUFDRSw4QkFBcUIsSUFBZSxFQUFXLElBQWEsRUFBVyxPQUFlO1lBQWpFLFNBQUksR0FBSixJQUFJLENBQVc7WUFBVyxTQUFJLEdBQUosSUFBSSxDQUFTO1lBQVcsWUFBTyxHQUFQLE9BQU8sQ0FBUTtZQUV0Rjs7ZUFFRztZQUNILDRCQUF1QixHQUFHLElBQUksQ0FBQztRQUwwRCxDQUFDO1FBTzFGLDJDQUFZLEdBQVo7WUFDRSxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFYRCxJQVdDO0lBWFksb0RBQW9CO0lBYWpDLFNBQWdCLGNBQWMsQ0FBQyxJQUFlLEVBQUUsSUFBYSxFQUFFLFdBQW1CLEVBQUUsV0FHakY7UUFDRCxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxJQUFNLElBQUksR0FBOEI7WUFDdEMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO1lBQ3JDLElBQUksRUFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUU7WUFDOUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQztZQUN0QyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUN2QixXQUFXLGFBQUE7U0FDWixDQUFDO1FBQ0YsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO1lBQzdCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtnQkFDNUMsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9DLE9BQU87b0JBQ0wsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO29CQUN2QyxJQUFJLEVBQUUsQ0FBQztvQkFDUCxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRTtvQkFDOUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUU7b0JBQzFCLE1BQU0sRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFO29CQUMzQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7aUJBQzlCLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBM0JELHdDQTJCQztJQUVELFNBQWdCLHNCQUFzQixDQUFDLEdBQVE7UUFDN0MsT0FBTyxHQUFHLENBQUMsdUJBQXVCLEtBQUssSUFBSSxDQUFDO0lBQzlDLENBQUM7SUFGRCx3REFFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlfSBmcm9tICcuL2Vycm9yX2NvZGUnO1xuXG5leHBvcnQgY2xhc3MgRmF0YWxEaWFnbm9zdGljRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBjb2RlOiBFcnJvckNvZGUsIHJlYWRvbmx5IG5vZGU6IHRzLk5vZGUsIHJlYWRvbmx5IG1lc3NhZ2U6IHN0cmluZykge31cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfaXNGYXRhbERpYWdub3N0aWNFcnJvciA9IHRydWU7XG5cbiAgdG9EaWFnbm9zdGljKCk6IHRzLkRpYWdub3N0aWNXaXRoTG9jYXRpb24ge1xuICAgIHJldHVybiBtYWtlRGlhZ25vc3RpYyh0aGlzLmNvZGUsIHRoaXMubm9kZSwgdGhpcy5tZXNzYWdlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZURpYWdub3N0aWMoY29kZTogRXJyb3JDb2RlLCBub2RlOiB0cy5Ob2RlLCBtZXNzYWdlVGV4dDogc3RyaW5nLCByZWxhdGVkSW5mbz86IHtcbiAgbm9kZTogdHMuTm9kZSxcbiAgbWVzc2FnZVRleHQ6IHN0cmluZyxcbn1bXSk6IHRzLkRpYWdub3N0aWNXaXRoTG9jYXRpb24ge1xuICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpO1xuICBjb25zdCBkaWFnOiB0cy5EaWFnbm9zdGljV2l0aExvY2F0aW9uID0ge1xuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogTnVtYmVyKCctOTknICsgY29kZS52YWx1ZU9mKCkpLFxuICAgIGZpbGU6IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCksXG4gICAgc3RhcnQ6IG5vZGUuZ2V0U3RhcnQodW5kZWZpbmVkLCBmYWxzZSksXG4gICAgbGVuZ3RoOiBub2RlLmdldFdpZHRoKCksXG4gICAgbWVzc2FnZVRleHQsXG4gIH07XG4gIGlmIChyZWxhdGVkSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZGlhZy5yZWxhdGVkSW5mb3JtYXRpb24gPSByZWxhdGVkSW5mby5tYXAoaW5mbyA9PiB7XG4gICAgICBjb25zdCBpbmZvTm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShpbmZvLm5vZGUpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgICBjb2RlOiAwLFxuICAgICAgICBmaWxlOiBpbmZvTm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICAgIHN0YXJ0OiBpbmZvTm9kZS5nZXRTdGFydCgpLFxuICAgICAgICBsZW5ndGg6IGluZm9Ob2RlLmdldFdpZHRoKCksXG4gICAgICAgIG1lc3NhZ2VUZXh0OiBpbmZvLm1lc3NhZ2VUZXh0LFxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gZGlhZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRmF0YWxEaWFnbm9zdGljRXJyb3IoZXJyOiBhbnkpOiBlcnIgaXMgRmF0YWxEaWFnbm9zdGljRXJyb3Ige1xuICByZXR1cm4gZXJyLl9pc0ZhdGFsRGlhZ25vc3RpY0Vycm9yID09PSB0cnVlO1xufVxuIl19