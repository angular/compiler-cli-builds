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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/error", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isFatalDiagnosticError = exports.makeRelatedInformation = exports.makeDiagnostic = exports.FatalDiagnosticError = void 0;
    var ts = require("typescript");
    var error_code_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code");
    var FatalDiagnosticError = /** @class */ (function () {
        function FatalDiagnosticError(code, node, message, relatedInformation) {
            this.code = code;
            this.node = node;
            this.message = message;
            this.relatedInformation = relatedInformation;
            /**
             * @internal
             */
            this._isFatalDiagnosticError = true;
        }
        FatalDiagnosticError.prototype.toDiagnostic = function () {
            return makeDiagnostic(this.code, this.node, this.message, this.relatedInformation);
        };
        return FatalDiagnosticError;
    }());
    exports.FatalDiagnosticError = FatalDiagnosticError;
    function makeDiagnostic(code, node, messageText, relatedInformation) {
        node = ts.getOriginalNode(node);
        return {
            category: ts.DiagnosticCategory.Error,
            code: (0, error_code_1.ngErrorCode)(code),
            file: ts.getOriginalNode(node).getSourceFile(),
            start: node.getStart(undefined, false),
            length: node.getWidth(),
            messageText: messageText,
            relatedInformation: relatedInformation,
        };
    }
    exports.makeDiagnostic = makeDiagnostic;
    function makeRelatedInformation(node, messageText) {
        node = ts.getOriginalNode(node);
        return {
            category: ts.DiagnosticCategory.Message,
            code: 0,
            file: node.getSourceFile(),
            start: node.getStart(),
            length: node.getWidth(),
            messageText: messageText,
        };
    }
    exports.makeRelatedInformation = makeRelatedInformation;
    function isFatalDiagnosticError(err) {
        return err._isFatalDiagnosticError === true;
    }
    exports.isFatalDiagnosticError = isFatalDiagnosticError;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzL3NyYy9lcnJvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMseUZBQW9EO0lBRXBEO1FBQ0UsOEJBQ2EsSUFBZSxFQUFXLElBQWEsRUFDdkMsT0FBeUMsRUFDekMsa0JBQXNEO1lBRnRELFNBQUksR0FBSixJQUFJLENBQVc7WUFBVyxTQUFJLEdBQUosSUFBSSxDQUFTO1lBQ3ZDLFlBQU8sR0FBUCxPQUFPLENBQWtDO1lBQ3pDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0M7WUFFbkU7O2VBRUc7WUFDSCw0QkFBdUIsR0FBRyxJQUFJLENBQUM7UUFMdUMsQ0FBQztRQU92RSwyQ0FBWSxHQUFaO1lBQ0UsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDckYsQ0FBQztRQUNILDJCQUFDO0lBQUQsQ0FBQyxBQWRELElBY0M7SUFkWSxvREFBb0I7SUFnQmpDLFNBQWdCLGNBQWMsQ0FDMUIsSUFBZSxFQUFFLElBQWEsRUFBRSxXQUE2QyxFQUM3RSxrQkFBc0Q7UUFDeEQsSUFBSSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsT0FBTztZQUNMLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztZQUNyQyxJQUFJLEVBQUUsSUFBQSx3QkFBVyxFQUFDLElBQUksQ0FBQztZQUN2QixJQUFJLEVBQUUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUU7WUFDOUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQztZQUN0QyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUN2QixXQUFXLGFBQUE7WUFDWCxrQkFBa0Isb0JBQUE7U0FDbkIsQ0FBQztJQUNKLENBQUM7SUFiRCx3Q0FhQztJQUVELFNBQWdCLHNCQUFzQixDQUNsQyxJQUFhLEVBQUUsV0FBbUI7UUFDcEMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsT0FBTztZQUNMLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTztZQUN2QyxJQUFJLEVBQUUsQ0FBQztZQUNQLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQzFCLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ3RCLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ3ZCLFdBQVcsYUFBQTtTQUNaLENBQUM7SUFDSixDQUFDO0lBWEQsd0RBV0M7SUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxHQUFRO1FBQzdDLE9BQU8sR0FBRyxDQUFDLHVCQUF1QixLQUFLLElBQUksQ0FBQztJQUM5QyxDQUFDO0lBRkQsd0RBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi9lcnJvcl9jb2RlJztcblxuZXhwb3J0IGNsYXNzIEZhdGFsRGlhZ25vc3RpY0Vycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBjb2RlOiBFcnJvckNvZGUsIHJlYWRvbmx5IG5vZGU6IHRzLk5vZGUsXG4gICAgICByZWFkb25seSBtZXNzYWdlOiBzdHJpbmd8dHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbixcbiAgICAgIHJlYWRvbmx5IHJlbGF0ZWRJbmZvcm1hdGlvbj86IHRzLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb25bXSkge31cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfaXNGYXRhbERpYWdub3N0aWNFcnJvciA9IHRydWU7XG5cbiAgdG9EaWFnbm9zdGljKCk6IHRzLkRpYWdub3N0aWNXaXRoTG9jYXRpb24ge1xuICAgIHJldHVybiBtYWtlRGlhZ25vc3RpYyh0aGlzLmNvZGUsIHRoaXMubm9kZSwgdGhpcy5tZXNzYWdlLCB0aGlzLnJlbGF0ZWRJbmZvcm1hdGlvbik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VEaWFnbm9zdGljKFxuICAgIGNvZGU6IEVycm9yQ29kZSwgbm9kZTogdHMuTm9kZSwgbWVzc2FnZVRleHQ6IHN0cmluZ3x0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluLFxuICAgIHJlbGF0ZWRJbmZvcm1hdGlvbj86IHRzLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb25bXSk6IHRzLkRpYWdub3N0aWNXaXRoTG9jYXRpb24ge1xuICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpO1xuICByZXR1cm4ge1xuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogbmdFcnJvckNvZGUoY29kZSksXG4gICAgZmlsZTogdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpLmdldFNvdXJjZUZpbGUoKSxcbiAgICBzdGFydDogbm9kZS5nZXRTdGFydCh1bmRlZmluZWQsIGZhbHNlKSxcbiAgICBsZW5ndGg6IG5vZGUuZ2V0V2lkdGgoKSxcbiAgICBtZXNzYWdlVGV4dCxcbiAgICByZWxhdGVkSW5mb3JtYXRpb24sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKFxuICAgIG5vZGU6IHRzLk5vZGUsIG1lc3NhZ2VUZXh0OiBzdHJpbmcpOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uIHtcbiAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKTtcbiAgcmV0dXJuIHtcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgY29kZTogMCxcbiAgICBmaWxlOiBub2RlLmdldFNvdXJjZUZpbGUoKSxcbiAgICBzdGFydDogbm9kZS5nZXRTdGFydCgpLFxuICAgIGxlbmd0aDogbm9kZS5nZXRXaWR0aCgpLFxuICAgIG1lc3NhZ2VUZXh0LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNGYXRhbERpYWdub3N0aWNFcnJvcihlcnI6IGFueSk6IGVyciBpcyBGYXRhbERpYWdub3N0aWNFcnJvciB7XG4gIHJldHVybiBlcnIuX2lzRmF0YWxEaWFnbm9zdGljRXJyb3IgPT09IHRydWU7XG59XG4iXX0=