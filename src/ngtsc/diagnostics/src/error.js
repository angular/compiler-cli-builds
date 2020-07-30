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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/error", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isFatalDiagnosticError = exports.makeRelatedInformation = exports.makeDiagnostic = exports.FatalDiagnosticError = void 0;
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
    function makeDiagnostic(code, node, messageText, relatedInformation) {
        node = ts.getOriginalNode(node);
        return {
            category: ts.DiagnosticCategory.Error,
            code: Number('-99' + code.valueOf()),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2RpYWdub3N0aWNzL3NyYy9lcnJvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFJakM7UUFDRSw4QkFBcUIsSUFBZSxFQUFXLElBQWEsRUFBVyxPQUFlO1lBQWpFLFNBQUksR0FBSixJQUFJLENBQVc7WUFBVyxTQUFJLEdBQUosSUFBSSxDQUFTO1lBQVcsWUFBTyxHQUFQLE9BQU8sQ0FBUTtZQUV0Rjs7ZUFFRztZQUNILDRCQUF1QixHQUFHLElBQUksQ0FBQztRQUwwRCxDQUFDO1FBTzFGLDJDQUFZLEdBQVo7WUFDRSxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFYRCxJQVdDO0lBWFksb0RBQW9CO0lBYWpDLFNBQWdCLGNBQWMsQ0FDMUIsSUFBZSxFQUFFLElBQWEsRUFBRSxXQUE2QyxFQUM3RSxrQkFBc0Q7UUFDeEQsSUFBSSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsT0FBTztZQUNMLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSztZQUNyQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxFQUFFO1lBQzlDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUM7WUFDdEMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDdkIsV0FBVyxhQUFBO1lBQ1gsa0JBQWtCLG9CQUFBO1NBQ25CLENBQUM7SUFDSixDQUFDO0lBYkQsd0NBYUM7SUFFRCxTQUFnQixzQkFBc0IsQ0FDbEMsSUFBYSxFQUFFLFdBQW1CO1FBQ3BDLElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLE9BQU87WUFDTCxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU87WUFDdkMsSUFBSSxFQUFFLENBQUM7WUFDUCxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUMxQixLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUN0QixNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUN2QixXQUFXLGFBQUE7U0FDWixDQUFDO0lBQ0osQ0FBQztJQVhELHdEQVdDO0lBRUQsU0FBZ0Isc0JBQXNCLENBQUMsR0FBUTtRQUM3QyxPQUFPLEdBQUcsQ0FBQyx1QkFBdUIsS0FBSyxJQUFJLENBQUM7SUFDOUMsQ0FBQztJQUZELHdEQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZX0gZnJvbSAnLi9lcnJvcl9jb2RlJztcblxuZXhwb3J0IGNsYXNzIEZhdGFsRGlhZ25vc3RpY0Vycm9yIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgY29kZTogRXJyb3JDb2RlLCByZWFkb25seSBub2RlOiB0cy5Ob2RlLCByZWFkb25seSBtZXNzYWdlOiBzdHJpbmcpIHt9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX2lzRmF0YWxEaWFnbm9zdGljRXJyb3IgPSB0cnVlO1xuXG4gIHRvRGlhZ25vc3RpYygpOiB0cy5EaWFnbm9zdGljV2l0aExvY2F0aW9uIHtcbiAgICByZXR1cm4gbWFrZURpYWdub3N0aWModGhpcy5jb2RlLCB0aGlzLm5vZGUsIHRoaXMubWVzc2FnZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VEaWFnbm9zdGljKFxuICAgIGNvZGU6IEVycm9yQ29kZSwgbm9kZTogdHMuTm9kZSwgbWVzc2FnZVRleHQ6IHN0cmluZ3x0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluLFxuICAgIHJlbGF0ZWRJbmZvcm1hdGlvbj86IHRzLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb25bXSk6IHRzLkRpYWdub3N0aWNXaXRoTG9jYXRpb24ge1xuICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpO1xuICByZXR1cm4ge1xuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgY29kZTogTnVtYmVyKCctOTknICsgY29kZS52YWx1ZU9mKCkpLFxuICAgIGZpbGU6IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCksXG4gICAgc3RhcnQ6IG5vZGUuZ2V0U3RhcnQodW5kZWZpbmVkLCBmYWxzZSksXG4gICAgbGVuZ3RoOiBub2RlLmdldFdpZHRoKCksXG4gICAgbWVzc2FnZVRleHQsXG4gICAgcmVsYXRlZEluZm9ybWF0aW9uLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICBub2RlOiB0cy5Ob2RlLCBtZXNzYWdlVGV4dDogc3RyaW5nKTogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbiB7XG4gIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSk7XG4gIHJldHVybiB7XG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgIGNvZGU6IDAsXG4gICAgZmlsZTogbm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgc3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSxcbiAgICBsZW5ndGg6IG5vZGUuZ2V0V2lkdGgoKSxcbiAgICBtZXNzYWdlVGV4dCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRmF0YWxEaWFnbm9zdGljRXJyb3IoZXJyOiBhbnkpOiBlcnIgaXMgRmF0YWxEaWFnbm9zdGljRXJyb3Ige1xuICByZXR1cm4gZXJyLl9pc0ZhdGFsRGlhZ25vc3RpY0Vycm9yID09PSB0cnVlO1xufVxuIl19