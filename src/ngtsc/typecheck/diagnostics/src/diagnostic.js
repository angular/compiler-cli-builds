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
        define("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics/src/diagnostic", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isTemplateDiagnostic = exports.makeTemplateDiagnostic = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    /**
     * Constructs a `ts.Diagnostic` for a given `ParseSourceSpan` within a template.
     */
    function makeTemplateDiagnostic(templateId, mapping, span, category, code, messageText, relatedMessages) {
        var e_1, _a, e_2, _b;
        if (mapping.type === 'direct') {
            var relatedInformation = undefined;
            if (relatedMessages !== undefined) {
                relatedInformation = [];
                try {
                    for (var relatedMessages_1 = tslib_1.__values(relatedMessages), relatedMessages_1_1 = relatedMessages_1.next(); !relatedMessages_1_1.done; relatedMessages_1_1 = relatedMessages_1.next()) {
                        var relatedMessage = relatedMessages_1_1.value;
                        relatedInformation.push({
                            category: ts.DiagnosticCategory.Message,
                            code: 0,
                            file: relatedMessage.sourceFile,
                            start: relatedMessage.start,
                            length: relatedMessage.end - relatedMessage.start,
                            messageText: relatedMessage.text,
                        });
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (relatedMessages_1_1 && !relatedMessages_1_1.done && (_a = relatedMessages_1.return)) _a.call(relatedMessages_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            // For direct mappings, the error is shown inline as ngtsc was able to pinpoint a string
            // constant within the `@Component` decorator for the template. This allows us to map the error
            // directly into the bytes of the source file.
            return {
                source: 'ngtsc',
                code: code,
                category: category,
                messageText: messageText,
                file: mapping.node.getSourceFile(),
                componentFile: mapping.node.getSourceFile(),
                templateId: templateId,
                start: span.start.offset,
                length: span.end.offset - span.start.offset,
                relatedInformation: relatedInformation,
            };
        }
        else if (mapping.type === 'indirect' || mapping.type === 'external') {
            // For indirect mappings (template was declared inline, but ngtsc couldn't map it directly
            // to a string constant in the decorator), the component's file name is given with a suffix
            // indicating it's not the TS file being displayed, but a template.
            // For external temoplates, the HTML filename is used.
            var componentSf = mapping.componentClass.getSourceFile();
            var componentName = mapping.componentClass.name.text;
            // TODO(alxhub): remove cast when TS in g3 supports this narrowing.
            var fileName = mapping.type === 'indirect' ?
                componentSf.fileName + " (" + componentName + " template)" :
                mapping.templateUrl;
            // TODO(alxhub): investigate creating a fake `ts.SourceFile` here instead of invoking the TS
            // parser against the template (HTML is just really syntactically invalid TypeScript code ;).
            // Also investigate caching the file to avoid running the parser multiple times.
            var sf = ts.createSourceFile(fileName, mapping.template, ts.ScriptTarget.Latest, false, ts.ScriptKind.JSX);
            var relatedInformation = [];
            if (relatedMessages !== undefined) {
                try {
                    for (var relatedMessages_2 = tslib_1.__values(relatedMessages), relatedMessages_2_1 = relatedMessages_2.next(); !relatedMessages_2_1.done; relatedMessages_2_1 = relatedMessages_2.next()) {
                        var relatedMessage = relatedMessages_2_1.value;
                        relatedInformation.push({
                            category: ts.DiagnosticCategory.Message,
                            code: 0,
                            file: relatedMessage.sourceFile,
                            start: relatedMessage.start,
                            length: relatedMessage.end - relatedMessage.start,
                            messageText: relatedMessage.text,
                        });
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (relatedMessages_2_1 && !relatedMessages_2_1.done && (_b = relatedMessages_2.return)) _b.call(relatedMessages_2);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            relatedInformation.push({
                category: ts.DiagnosticCategory.Message,
                code: 0,
                file: componentSf,
                // mapping.node represents either the 'template' or 'templateUrl' expression. getStart()
                // and getEnd() are used because they don't include surrounding whitespace.
                start: mapping.node.getStart(),
                length: mapping.node.getEnd() - mapping.node.getStart(),
                messageText: "Error occurs in the template of component " + componentName + ".",
            });
            return {
                source: 'ngtsc',
                category: category,
                code: code,
                messageText: messageText,
                file: sf,
                componentFile: componentSf,
                templateId: templateId,
                start: span.start.offset,
                length: span.end.offset - span.start.offset,
                // Show a secondary message indicating the component whose template contains the error.
                relatedInformation: relatedInformation,
            };
        }
        else {
            throw new Error("Unexpected source mapping type: " + mapping.type);
        }
    }
    exports.makeTemplateDiagnostic = makeTemplateDiagnostic;
    function isTemplateDiagnostic(diagnostic) {
        return diagnostic.hasOwnProperty('componentFile') &&
            ts.isSourceFile(diagnostic.componentFile);
    }
    exports.isTemplateDiagnostic = isTemplateDiagnostic;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2RpYWdub3N0aWNzL3NyYy9kaWFnbm9zdGljLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFJakM7O09BRUc7SUFDSCxTQUFnQixzQkFBc0IsQ0FDbEMsVUFBc0IsRUFBRSxPQUE4QixFQUFFLElBQXFCLEVBQzdFLFFBQStCLEVBQUUsSUFBWSxFQUFFLFdBQTZDLEVBQzVGLGVBS0c7O1FBQ0wsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtZQUM3QixJQUFJLGtCQUFrQixHQUFnRCxTQUFTLENBQUM7WUFDaEYsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO2dCQUNqQyxrQkFBa0IsR0FBRyxFQUFFLENBQUM7O29CQUN4QixLQUE2QixJQUFBLG9CQUFBLGlCQUFBLGVBQWUsQ0FBQSxnREFBQSw2RUFBRTt3QkFBekMsSUFBTSxjQUFjLDRCQUFBO3dCQUN2QixrQkFBa0IsQ0FBQyxJQUFJLENBQUM7NEJBQ3RCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTzs0QkFDdkMsSUFBSSxFQUFFLENBQUM7NEJBQ1AsSUFBSSxFQUFFLGNBQWMsQ0FBQyxVQUFVOzRCQUMvQixLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7NEJBQzNCLE1BQU0sRUFBRSxjQUFjLENBQUMsR0FBRyxHQUFHLGNBQWMsQ0FBQyxLQUFLOzRCQUNqRCxXQUFXLEVBQUUsY0FBYyxDQUFDLElBQUk7eUJBQ2pDLENBQUMsQ0FBQztxQkFDSjs7Ozs7Ozs7O2FBQ0Y7WUFDRCx3RkFBd0Y7WUFDeEYsK0ZBQStGO1lBQy9GLDhDQUE4QztZQUM5QyxPQUFPO2dCQUNMLE1BQU0sRUFBRSxPQUFPO2dC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QixNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO2dCQUMzQyx1RkFBdUY7Z0JBQ3ZGLGtCQUFrQixvQkFBQTthQUNuQixDQUFDO1NBQ0g7YUFBTTtZQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQW9DLE9BQTBCLENBQUMsSUFBTSxDQUFDLENBQUM7U0FDeEY7SUFDSCxDQUFDO0lBakdELHdEQWlHQztJQUVELFNBQWdCLG9CQUFvQixDQUFDLFVBQXlCO1FBQzVELE9BQU8sVUFBVSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUM7WUFDN0MsRUFBRSxDQUFDLFlBQVksQ0FBRSxVQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFIRCxvREFHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1BhcnNlU291cmNlU3Bhbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXh0ZXJuYWxUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIFRlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVJZCwgVGVtcGxhdGVTb3VyY2VNYXBwaW5nfSBmcm9tICcuLi8uLi9hcGknO1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGEgZ2l2ZW4gYFBhcnNlU291cmNlU3BhbmAgd2l0aGluIGEgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIG1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZywgc3BhbjogUGFyc2VTb3VyY2VTcGFuLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnksIGNvZGU6IG51bWJlciwgbWVzc2FnZVRleHQ6IHN0cmluZ3x0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluLFxuICAgIHJlbGF0ZWRNZXNzYWdlcz86IHtcbiAgICAgIHRleHQ6IHN0cmluZyxcbiAgICAgIHN0YXJ0OiBudW1iZXIsXG4gICAgICBlbmQ6IG51bWJlcixcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgfVtdKTogVGVtcGxhdGVEaWFnbm9zdGljIHtcbiAgaWYgKG1hcHBpbmcudHlwZSA9PT0gJ2RpcmVjdCcpIHtcbiAgICBsZXQgcmVsYXRlZEluZm9ybWF0aW9uOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChyZWxhdGVkTWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVsYXRlZEluZm9ybWF0aW9uID0gW107XG4gICAgICBmb3IgKGNvbnN0IHJlbGF0ZWRNZXNzYWdlIG9mIHJlbGF0ZWRNZXNzYWdlcykge1xuICAgICAgICByZWxhdGVkSW5mb3JtYXRpb24ucHVzaCh7XG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgICAgIGNvZGU6IDAsXG4gICAgICAgICAgZmlsZTogcmVsYXRlZE1lc3NhZ2Uuc291cmNlRmlsZSxcbiAgICAgICAgICBzdGFydDogcmVsYXRlZE1lc3NhZ2Uuc3RhcnQsXG4gICAgICAgICAgbGVuZ3RoOiByZWxhdGVkTWVzc2FnZS5lbmQgLSByZWxhdGVkTWVzc2FnZS5zdGFydCxcbiAgICAgICAgICBtZXNzYWdlVGV4dDogcmVsYXRlZE1lc3NhZ2UudGV4dCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZvciBkaXJlY3QgbWFwcGluZ3MsIHRoZSBlcnJvciBpcyBzaG93biBpbmxpbmUgYXMgbmd0c2Mgd2FzIGFibGUgdG8gcGlucG9pbnQgYSBzdHJpbmdcbiAgICAvLyBjb25zdGFudCB3aXRoaW4gdGhlIGBAQ29tcG9uZW50YCBkZWNvcmF0b3IgZm9yIHRoZSB0ZW1wbGF0ZS4gVGhpcyBhbGxvd3MgdXMgdG8gbWFwIHRoZSBlcnJvclxuICAgIC8vIGRpcmVjdGx5IGludG8gdGhlIGJ5dGVzIG9mIHRoZSBzb3VyY2UgZmlsZS5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiAnbmd0c2MnLFxuICAgICAgY29kZSxcbiAgICAgIGNhdGVnb3J5LFxuICAgICAgbWVzc2FnZVRleHQsXG4gICAgICBmaWxlOiBtYXBwaW5nLm5vZGUuZ2V0U291cmNlRmlsZSgpLFxuICAgICAgY29tcG9uZW50RmlsZTogbWFwcGluZy5ub2RlLmdldFNvdXJjZUZpbGUoKSxcbiAgICAgIHRlbXBsYXRlSWQsXG4gICAgICBzdGFydDogc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICBsZW5ndGg6IHNwYW4uZW5kLm9mZnNldCAtIHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgcmVsYXRlZEluZm9ybWF0aW9uLFxuICAgIH07XG4gIH0gZWxzZSBpZiAobWFwcGluZy50eXBlID09PSAnaW5kaXJlY3QnIHx8IG1hcHBpbmcudHlwZSA9PT0gJ2V4dGVybmFsJykge1xuICAgIC8vIEZvciBpbmRpcmVjdCBtYXBwaW5ncyAodGVtcGxhdGUgd2FzIGRlY2xhcmVkIGlubGluZSwgYnV0IG5ndHNjIGNvdWxkbid0IG1hcCBpdCBkaXJlY3RseVxuICAgIC8vIHRvIGEgc3RyaW5nIGNvbnN0YW50IGluIHRoZSBkZWNvcmF0b3IpLCB0aGUgY29tcG9uZW50J3MgZmlsZSBuYW1lIGlzIGdpdmVuIHdpdGggYSBzdWZmaXhcbiAgICAvLyBpbmRpY2F0aW5nIGl0J3Mgbm90IHRoZSBUUyBmaWxlIGJlaW5nIGRpc3BsYXllZCwgYnV0IGEgdGVtcGxhdGUuXG4gICAgLy8gRm9yIGV4dGVybmFsIHRlbW9wbGF0ZXMsIHRoZSBIVE1MIGZpbGVuYW1lIGlzIHVzZWQuXG4gICAgY29uc3QgY29tcG9uZW50U2YgPSBtYXBwaW5nLmNvbXBvbmVudENsYXNzLmdldFNvdXJjZUZpbGUoKTtcbiAgICBjb25zdCBjb21wb25lbnROYW1lID0gbWFwcGluZy5jb21wb25lbnRDbGFzcy5uYW1lLnRleHQ7XG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgY2FzdCB3aGVuIFRTIGluIGczIHN1cHBvcnRzIHRoaXMgbmFycm93aW5nLlxuICAgIGNvbnN0IGZpbGVOYW1lID0gbWFwcGluZy50eXBlID09PSAnaW5kaXJlY3QnID9cbiAgICAgICAgYCR7Y29tcG9uZW50U2YuZmlsZU5hbWV9ICgke2NvbXBvbmVudE5hbWV9IHRlbXBsYXRlKWAgOlxuICAgICAgICAobWFwcGluZyBhcyBFeHRlcm5hbFRlbXBsYXRlU291cmNlTWFwcGluZykudGVtcGxhdGVVcmw7XG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBjcmVhdGluZyBhIGZha2UgYHRzLlNvdXJjZUZpbGVgIGhlcmUgaW5zdGVhZCBvZiBpbnZva2luZyB0aGUgVFNcbiAgICAvLyBwYXJzZXIgYWdhaW5zdCB0aGUgdGVtcGxhdGUgKEhUTUwgaXMganVzdCByZWFsbHkgc3ludGFjdGljYWxseSBpbnZhbGlkIFR5cGVTY3JpcHQgY29kZSA7KS5cbiAgICAvLyBBbHNvIGludmVzdGlnYXRlIGNhY2hpbmcgdGhlIGZpbGUgdG8gYXZvaWQgcnVubmluZyB0aGUgcGFyc2VyIG11bHRpcGxlIHRpbWVzLlxuICAgIGNvbnN0IHNmID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZmlsZU5hbWUsIG1hcHBpbmcudGVtcGxhdGUsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIGZhbHNlLCB0cy5TY3JpcHRLaW5kLkpTWCk7XG5cbiAgICBsZXQgcmVsYXRlZEluZm9ybWF0aW9uOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10gPSBbXTtcbiAgICBpZiAocmVsYXRlZE1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvciAoY29uc3QgcmVsYXRlZE1lc3NhZ2Ugb2YgcmVsYXRlZE1lc3NhZ2VzKSB7XG4gICAgICAgIHJlbGF0ZWRJbmZvcm1hdGlvbi5wdXNoKHtcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgICAgICAgY29kZTogMCxcbiAgICAgICAgICBmaWxlOiByZWxhdGVkTWVzc2FnZS5zb3VyY2VGaWxlLFxuICAgICAgICAgIHN0YXJ0OiByZWxhdGVkTWVzc2FnZS5zdGFydCxcbiAgICAgICAgICBsZW5ndGg6IHJlbGF0ZWRNZXNzYWdlLmVuZCAtIHJlbGF0ZWRNZXNzYWdlLnN0YXJ0LFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiByZWxhdGVkTWVzc2FnZS50ZXh0LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZWxhdGVkSW5mb3JtYXRpb24ucHVzaCh7XG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgICBjb2RlOiAwLFxuICAgICAgZmlsZTogY29tcG9uZW50U2YsXG4gICAgICAvLyBtYXBwaW5nLm5vZGUgcmVwcmVzZW50cyBlaXRoZXIgdGhlICd0ZW1wbGF0ZScgb3IgJ3RlbXBsYXRlVXJsJyBleHByZXNzaW9uLiBnZXRTdGFydCgpXG4gICAgICAvLyBhbmQgZ2V0RW5kKCkgYXJlIHVzZWQgYmVjYXVzZSB0aGV5IGRvbid0IGluY2x1ZGUgc3Vycm91bmRpbmcgd2hpdGVzcGFjZS5cbiAgICAgIHN0YXJ0OiBtYXBwaW5nLm5vZGUuZ2V0U3RhcnQoKSxcbiAgICAgIGxlbmd0aDogbWFwcGluZy5ub2RlLmdldEVuZCgpIC0gbWFwcGluZy5ub2RlLmdldFN0YXJ0KCksXG4gICAgICBtZXNzYWdlVGV4dDogYEVycm9yIG9jY3VycyBpbiB0aGUgdGVtcGxhdGUgb2YgY29tcG9uZW50ICR7Y29tcG9uZW50TmFtZX0uYCxcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2U6ICduZ3RzYycsXG4gICAgICBjYXRlZ29yeSxcbiAgICAgIGNvZGUsXG4gICAgICBtZXNzYWdlVGV4dCxcbiAgICAgIGZpbGU6IHNmLFxuICAgICAgY29tcG9uZW50RmlsZTogY29tcG9uZW50U2YsXG4gICAgICB0ZW1wbGF0ZUlkLFxuICAgICAgc3RhcnQ6IHNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgbGVuZ3RoOiBzcGFuLmVuZC5vZmZzZXQgLSBzcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgIC8vIFNob3cgYSBzZWNvbmRhcnkgbWVzc2FnZSBpbmRpY2F0aW5nIHRoZSBjb21wb25lbnQgd2hvc2UgdGVtcGxhdGUgY29udGFpbnMgdGhlIGVycm9yLlxuICAgICAgcmVsYXRlZEluZm9ybWF0aW9uLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHNvdXJjZSBtYXBwaW5nIHR5cGU6ICR7KG1hcHBpbmcgYXMge3R5cGU6IHN0cmluZ30pLnR5cGV9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVGVtcGxhdGVEaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpOiBkaWFnbm9zdGljIGlzIFRlbXBsYXRlRGlhZ25vc3RpYyB7XG4gIHJldHVybiBkaWFnbm9zdGljLmhhc093blByb3BlcnR5KCdjb21wb25lbnRGaWxlJykgJiZcbiAgICAgIHRzLmlzU291cmNlRmlsZSgoZGlhZ25vc3RpYyBhcyBhbnkpLmNvbXBvbmVudEZpbGUpO1xufVxuIl19