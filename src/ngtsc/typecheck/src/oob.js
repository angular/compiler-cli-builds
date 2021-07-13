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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/oob", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OutOfBandDiagnosticRecorderImpl = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var OutOfBandDiagnosticRecorderImpl = /** @class */ (function () {
        function OutOfBandDiagnosticRecorderImpl(resolver) {
            this.resolver = resolver;
            this._diagnostics = [];
            /**
             * Tracks which `BindingPipe` nodes have already been recorded as invalid, so only one diagnostic
             * is ever produced per node.
             */
            this.recordedPipes = new Set();
        }
        Object.defineProperty(OutOfBandDiagnosticRecorderImpl.prototype, "diagnostics", {
            get: function () {
                return this._diagnostics;
            },
            enumerable: false,
            configurable: true
        });
        OutOfBandDiagnosticRecorderImpl.prototype.missingReferenceTarget = function (templateId, ref) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var value = ref.value.trim();
            var errorMsg = "No directive found with exportAs '" + value + "'.";
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(templateId, mapping, ref.valueSpan || ref.sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.MISSING_REFERENCE_TARGET), errorMsg));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.missingPipe = function (templateId, ast) {
            if (this.recordedPipes.has(ast)) {
                return;
            }
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "No pipe found with name '" + ast.name + "'.";
            var sourceSpan = this.resolver.toParseSourceSpan(templateId, ast.nameSpan);
            if (sourceSpan === null) {
                throw new Error("Assertion failure: no SourceLocation found for usage of pipe '" + ast.name + "'.");
            }
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(templateId, mapping, sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.MISSING_PIPE), errorMsg));
            this.recordedPipes.add(ast);
        };
        OutOfBandDiagnosticRecorderImpl.prototype.illegalAssignmentToTemplateVar = function (templateId, assignment, target) {
            var _a, _b;
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "Cannot use variable '" + assignment
                .name + "' as the left-hand side of an assignment expression. Template variables are read-only.";
            var sourceSpan = this.resolver.toParseSourceSpan(templateId, assignment.sourceSpan);
            if (sourceSpan === null) {
                throw new Error("Assertion failure: no SourceLocation found for property binding.");
            }
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(templateId, mapping, sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.WRITE_TO_READ_ONLY_VARIABLE), errorMsg, [{
                    text: "The variable " + assignment.name + " is declared here.",
                    start: ((_a = target.valueSpan) === null || _a === void 0 ? void 0 : _a.start.offset) || target.sourceSpan.start.offset,
                    end: ((_b = target.valueSpan) === null || _b === void 0 ? void 0 : _b.end.offset) || target.sourceSpan.end.offset,
                    sourceFile: mapping.node.getSourceFile(),
                }]));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.duplicateTemplateVar = function (templateId, variable, firstDecl) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "Cannot redeclare variable '" + variable.name + "' as it was previously declared elsewhere for the same template.";
            // The allocation of the error here is pretty useless for variables declared in microsyntax,
            // since the sourceSpan refers to the entire microsyntax property, not a span for the specific
            // variable in question.
            //
            // TODO(alxhub): allocate to a tighter span once one is available.
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(templateId, mapping, variable.sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.DUPLICATE_VARIABLE_DECLARATION), errorMsg, [{
                    text: "The variable '" + firstDecl.name + "' was first declared here.",
                    start: firstDecl.sourceSpan.start.offset,
                    end: firstDecl.sourceSpan.end.offset,
                    sourceFile: mapping.node.getSourceFile(),
                }]));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.requiresInlineTcb = function (templateId, node) {
            this._diagnostics.push(makeInlineDiagnostic(templateId, diagnostics_1.ErrorCode.INLINE_TCB_REQUIRED, node.name, "This component requires inline template type-checking, which is not supported by the current environment."));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.requiresInlineTypeConstructors = function (templateId, node, directives) {
            var message;
            if (directives.length > 1) {
                message =
                    "This component uses directives which require inline type constructors, which are not supported by the current environment.";
            }
            else {
                message =
                    "This component uses a directive which requires an inline type constructor, which is not supported by the current environment.";
            }
            this._diagnostics.push(makeInlineDiagnostic(templateId, diagnostics_1.ErrorCode.INLINE_TYPE_CTOR_REQUIRED, node.name, message, directives.map(function (dir) { return diagnostics_1.makeRelatedInformation(dir.name, "Requires an inline type constructor."); })));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.suboptimalTypeInference = function (templateId, variables) {
            var e_1, _a;
            var mapping = this.resolver.getSourceMapping(templateId);
            // Select one of the template variables that's most suitable for reporting the diagnostic. Any
            // variable will do, but prefer one bound to the context's $implicit if present.
            var diagnosticVar = null;
            try {
                for (var variables_1 = tslib_1.__values(variables), variables_1_1 = variables_1.next(); !variables_1_1.done; variables_1_1 = variables_1.next()) {
                    var variable = variables_1_1.value;
                    if (diagnosticVar === null || (variable.value === '' || variable.value === '$implicit')) {
                        diagnosticVar = variable;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (variables_1_1 && !variables_1_1.done && (_a = variables_1.return)) _a.call(variables_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (diagnosticVar === null) {
                // There is no variable on which to report the diagnostic.
                return;
            }
            var varIdentification = "'" + diagnosticVar.name + "'";
            if (variables.length === 2) {
                varIdentification += " (and 1 other)";
            }
            else if (variables.length > 2) {
                varIdentification += " (and " + (variables.length - 1) + " others)";
            }
            var message = "This structural directive supports advanced type inference, but the current compiler configuration prevents its usage. The variable " + varIdentification + " will have type 'any' as a result.\n\nConsider enabling the 'strictTemplates' option in your tsconfig.json for better type inference within this template.";
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(templateId, mapping, diagnosticVar.keySpan, ts.DiagnosticCategory.Suggestion, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.SUGGEST_SUBOPTIMAL_TYPE_INFERENCE), message));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.splitTwoWayBinding = function (templateId, input, output, inputConsumer, outputConsumer) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "The property and event halves of the two-way binding '" + input.name + "' are not bound to the same target.\n            Find more at https://angular.io/guide/two-way-binding#how-two-way-binding-works";
            var relatedMessages = [];
            relatedMessages.push({
                text: "The property half of the binding is to the '" + inputConsumer.name.text + "' component.",
                start: inputConsumer.name.getStart(),
                end: inputConsumer.name.getEnd(),
                sourceFile: inputConsumer.name.getSourceFile(),
            });
            if (outputConsumer instanceof compiler_1.TmplAstElement) {
                var message = "The event half of the binding is to a native event called '" + input.name + "' on the <" + outputConsumer.name + "> DOM element.";
                if (!mapping.node.getSourceFile().isDeclarationFile) {
                    message += "\n \n Are you missing an output declaration called '" + output.name + "'?";
                }
                relatedMessages.push({
                    text: message,
                    start: outputConsumer.sourceSpan.start.offset + 1,
                    end: outputConsumer.sourceSpan.start.offset + outputConsumer.name.length + 1,
                    sourceFile: mapping.node.getSourceFile(),
                });
            }
            else {
                relatedMessages.push({
                    text: "The event half of the binding is to the '" + outputConsumer.name.text + "' component.",
                    start: outputConsumer.name.getStart(),
                    end: outputConsumer.name.getEnd(),
                    sourceFile: outputConsumer.name.getSourceFile(),
                });
            }
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(templateId, mapping, input.keySpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.SPLIT_TWO_WAY_BINDING), errorMsg, relatedMessages));
        };
        return OutOfBandDiagnosticRecorderImpl;
    }());
    exports.OutOfBandDiagnosticRecorderImpl = OutOfBandDiagnosticRecorderImpl;
    function makeInlineDiagnostic(templateId, code, node, messageText, relatedInformation) {
        return tslib_1.__assign(tslib_1.__assign({}, diagnostics_1.makeDiagnostic(code, node, messageText, relatedInformation)), { componentFile: node.getSourceFile(), templateId: templateId });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib29iLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL29vYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW1JO0lBRW5JLCtCQUFpQztJQUVqQywyRUFBaUc7SUFHakcscUZBQTBFO0lBdUUxRTtRQVNFLHlDQUFvQixRQUFnQztZQUFoQyxhQUFRLEdBQVIsUUFBUSxDQUF3QjtZQVI1QyxpQkFBWSxHQUF5QixFQUFFLENBQUM7WUFFaEQ7OztlQUdHO1lBQ0ssa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBRVEsQ0FBQztRQUV4RCxzQkFBSSx3REFBVztpQkFBZjtnQkFDRSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDM0IsQ0FBQzs7O1dBQUE7UUFFRCxnRUFBc0IsR0FBdEIsVUFBdUIsVUFBc0IsRUFBRSxHQUFxQjtZQUNsRSxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzNELElBQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFL0IsSUFBTSxRQUFRLEdBQUcsdUNBQXFDLEtBQUssT0FBSSxDQUFDO1lBQ2hFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLG9DQUFzQixDQUN6QyxVQUFVLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUNqRix5QkFBVyxDQUFDLHVCQUFTLENBQUMsd0JBQXdCLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCxxREFBVyxHQUFYLFVBQVksVUFBc0Is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R0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDO29CQUM1RSxVQUFVLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUU7aUJBQ3pDLENBQUMsQ0FBQzthQUNKO2lCQUFNO2dCQUNMLGVBQWUsQ0FBQyxJQUFJLENBQUM7b0JBQ25CLElBQUksRUFBRSw4Q0FBNEMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLGlCQUFjO29CQUN4RixLQUFLLEVBQUUsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7b0JBQ3JDLEdBQUcsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDakMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO2lCQUNoRCxDQUFDLENBQUM7YUFDSjtZQUdELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLG9DQUFzQixDQUN6QyxVQUFVLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFDL0QseUJBQVcsQ0FBQyx1QkFBUyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUNILHNDQUFDO0lBQUQsQ0FBQyxBQXhMRCxJQXdMQztJQXhMWSwwRUFBK0I7SUEwTDVDLFNBQVMsb0JBQW9CLENBQ3pCLFVBQXNCLEVBQUUsSUFBdUUsRUFDL0YsSUFBYSxFQUFFLFdBQTZDLEVBQzVELGtCQUFzRDtRQUN4RCw2Q0FDSyw0QkFBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixDQUFDLEtBQzlELGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQ25DLFVBQVUsWUFBQSxJQUNWO0lBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0JpbmRpbmdQaXBlLCBQcm9wZXJ0eVdyaXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtCb3VuZEF0dHJpYnV0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL3JlbmRlcjMvcjNfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgbWFrZURpYWdub3N0aWMsIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24sIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtUZW1wbGF0ZUlkfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHttYWtlVGVtcGxhdGVEaWFnbm9zdGljLCBUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZVJlc29sdmVyfSBmcm9tICcuL3RjYl91dGlsJztcblxuXG5cbi8qKlxuICogQ29sbGVjdHMgYHRzLkRpYWdub3N0aWNgcyBvbiBwcm9ibGVtcyB3aGljaCBvY2N1ciBpbiB0aGUgdGVtcGxhdGUgd2hpY2ggYXJlbid0IGRpcmVjdGx5IHNvdXJjZWRcbiAqIGZyb20gVHlwZSBDaGVjayBCbG9ja3MuXG4gKlxuICogRHVyaW5nIHRoZSBjcmVhdGlvbiBvZiBhIFR5cGUgQ2hlY2sgQmxvY2ssIHRoZSB0ZW1wbGF0ZSBpcyB0cmF2ZXJzZWQgYW5kIHRoZVxuICogYE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcmAgaXMgY2FsbGVkIHRvIHJlY29yZCBjYXNlcyB3aGVuIGEgY29ycmVjdCBpbnRlcnByZXRhdGlvbiBmb3IgdGhlXG4gKiB0ZW1wbGF0ZSBjYW5ub3QgYmUgZm91bmQuIFRoZXNlIG9wZXJhdGlvbnMgY3JlYXRlIGB0cy5EaWFnbm9zdGljYHMgd2hpY2ggYXJlIHN0b3JlZCBieSB0aGVcbiAqIHJlY29yZGVyIGZvciBsYXRlciBkaXNwbGF5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlciB7XG4gIHJlYWRvbmx5IGRpYWdub3N0aWNzOiBSZWFkb25seUFycmF5PFRlbXBsYXRlRGlhZ25vc3RpYz47XG5cbiAgLyoqXG4gICAqIFJlcG9ydHMgYSBgI3JlZj1cInRhcmdldFwiYCBleHByZXNzaW9uIGluIHRoZSB0ZW1wbGF0ZSBmb3Igd2hpY2ggYSB0YXJnZXQgZGlyZWN0aXZlIGNvdWxkIG5vdCBiZVxuICAgKiBmb3VuZC5cbiAgICpcbiAgICogQHBhcmFtIHRlbXBsYXRlSWQgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgSUQgb2YgdGhlIHRlbXBsYXRlIHdoaWNoIGNvbnRhaW5zIHRoZSBicm9rZW5cbiAgICogcmVmZXJlbmNlLlxuICAgKiBAcGFyYW0gcmVmIHRoZSBgVG1wbEFzdFJlZmVyZW5jZWAgd2hpY2ggY291bGQgbm90IGJlIG1hdGNoZWQgdG8gYSBkaXJlY3RpdmUuXG4gICAqL1xuICBtaXNzaW5nUmVmZXJlbmNlVGFyZ2V0KHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIHJlZjogVG1wbEFzdFJlZmVyZW5jZSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJlcG9ydHMgdXNhZ2Ugb2YgYSBgfCBwaXBlYCBleHByZXNzaW9uIGluIHRoZSB0ZW1wbGF0ZSBmb3Igd2hpY2ggdGhlIG5hbWVkIHBpcGUgY291bGQgbm90IGJlXG4gICAqIGZvdW5kLlxuICAgKlxuICAgKiBAcGFyYW0gdGVtcGxhdGVJZCB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBJRCBvZiB0aGUgdGVtcGxhdGUgd2hpY2ggY29udGFpbnMgdGhlIHVua25vd25cbiAgICogcGlwZS5cbiAgICogQHBhcmFtIGFzdCB0aGUgYEJpbmRpbmdQaXBlYCBpbnZvY2F0aW9uIG9mIHRoZSBwaXBlIHdoaWNoIGNvdWxkIG5vdCBiZSBmb3VuZC5cbiAgICovXG4gIG1pc3NpbmdQaXBlKHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIGFzdDogQmluZGluZ1BpcGUpOiB2b2lkO1xuXG4gIGlsbGVnYWxBc3NpZ25tZW50VG9UZW1wbGF0ZVZhcihcbiAgICAgIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIGFzc2lnbm1lbnQ6IFByb3BlcnR5V3JpdGUsIHRhcmdldDogVG1wbEFzdFZhcmlhYmxlKTogdm9pZDtcblxuICAvKipcbiAgICogUmVwb3J0cyBhIGR1cGxpY2F0ZSBkZWNsYXJhdGlvbiBvZiBhIHRlbXBsYXRlIHZhcmlhYmxlLlxuICAgKlxuICAgKiBAcGFyYW0gdGVtcGxhdGVJZCB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBJRCBvZiB0aGUgdGVtcGxhdGUgd2hpY2ggY29udGFpbnMgdGhlIGR1cGxpY2F0ZVxuICAgKiBkZWNsYXJhdGlvbi5cbiAgICogQHBhcmFtIHZhcmlhYmxlIHRoZSBgVG1wbEFzdFZhcmlhYmxlYCB3aGljaCBkdXBsaWNhdGVzIGEgcHJldmlvdXNseSBkZWNsYXJlZCB2YXJpYWJsZS5cbiAgICogQHBhcmFtIGZpcnN0RGVjbCB0aGUgZmlyc3QgdmFyaWFibGUgZGVjbGFyYXRpb24gd2hpY2ggdXNlcyB0aGUgc2FtZSBuYW1lIGFzIGB2YXJpYWJsZWAuXG4gICAqL1xuICBkdXBsaWNhdGVUZW1wbGF0ZVZhcihcbiAgICAgIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUsIGZpcnN0RGVjbDogVG1wbEFzdFZhcmlhYmxlKTogdm9pZDtcblxuICByZXF1aXJlc0lubGluZVRjYih0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZDtcblxuICByZXF1aXJlc0lubGluZVR5cGVDb25zdHJ1Y3RvcnMoXG4gICAgICB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkaXJlY3RpdmVzOiBDbGFzc0RlY2xhcmF0aW9uW10pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZXBvcnQgYSB3YXJuaW5nIHdoZW4gc3RydWN0dXJhbCBkaXJlY3RpdmVzIHN1cHBvcnQgY29udGV4dCBndWFyZHMsIGJ1dCB0aGUgY3VycmVudFxuICAgKiB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24gcHJvaGliaXRzIHRoZWlyIHVzYWdlLlxuICAgKi9cbiAgc3Vib3B0aW1hbFR5cGVJbmZlcmVuY2UodGVtcGxhdGVJZDogVGVtcGxhdGVJZCwgdmFyaWFibGVzOiBUbXBsQXN0VmFyaWFibGVbXSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJlcG9ydHMgYSBzcGxpdCB0d28gd2F5IGJpbmRpbmcgZXJyb3IgbWVzc2FnZS5cbiAgICovXG4gIHNwbGl0VHdvV2F5QmluZGluZyhcbiAgICAgIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIGlucHV0OiBCb3VuZEF0dHJpYnV0ZSwgb3V0cHV0OiBUbXBsQXN0Qm91bmRFdmVudCxcbiAgICAgIGlucHV0Q29uc3VtZXI6IENsYXNzRGVjbGFyYXRpb24sIG91dHB1dENvbnN1bWVyOiBDbGFzc0RlY2xhcmF0aW9ufFRtcGxBc3RFbGVtZW50KTogdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGwgaW1wbGVtZW50cyBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIge1xuICBwcml2YXRlIF9kaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW10gPSBbXTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoaWNoIGBCaW5kaW5nUGlwZWAgbm9kZXMgaGF2ZSBhbHJlYWR5IGJlZW4gcmVjb3JkZWQgYXMgaW52YWxpZCwgc28gb25seSBvbmUgZGlhZ25vc3RpY1xuICAgKiBpcyBldmVyIHByb2R1Y2VkIHBlciBub2RlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWNvcmRlZFBpcGVzID0gbmV3IFNldDxCaW5kaW5nUGlwZT4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlc29sdmVyOiBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyKSB7fVxuXG4gIGdldCBkaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PFRlbXBsYXRlRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLl9kaWFnbm9zdGljcztcbiAgfVxuXG4gIG1pc3NpbmdSZWZlcmVuY2VUYXJnZXQodGVtcGxhdGVJZDogVGVtcGxhdGVJZCwgcmVmOiBUbXBsQXN0UmVmZXJlbmNlKTogdm9pZCB7XG4gICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyh0ZW1wbGF0ZUlkKTtcbiAgICBjb25zdCB2YWx1ZSA9IHJlZi52YWx1ZS50cmltKCk7XG5cbiAgICBjb25zdCBlcnJvck1zZyA9IGBObyBkaXJlY3RpdmUgZm91bmQgd2l0aCBleHBvcnRBcyAnJHt2YWx1ZX0nLmA7XG4gICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICB0ZW1wbGF0ZUlkLCBtYXBwaW5nLCByZWYudmFsdWVTcGFuIHx8IHJlZi5zb3VyY2VTcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgIG5nRXJyb3JDb2RlKEVycm9yQ29kZS5NSVNTSU5HX1JFRkVSRU5DRV9UQVJHRVQpLCBlcnJvck1zZykpO1xuICB9XG5cbiAgbWlzc2luZ1BpcGUodGVtcGxhdGVJZDogVGVtcGxhdGVJZCwgYXN0OiBCaW5kaW5nUGlwZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJlY29yZGVkUGlwZXMuaGFzKGFzdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBtYXBwaW5nID0gdGhpcy5yZXNvbHZlci5nZXRTb3VyY2VNYXBwaW5nKHRlbXBsYXRlSWQpO1xuICAgIGNvbnN0IGVycm9yTXNnID0gYE5vIHBpcGUgZm91bmQgd2l0aCBuYW1lICcke2FzdC5uYW1lfScuYDtcblxuICAgIGNvbnN0IHNvdXJjZVNwYW4gPSB0aGlzLnJlc29sdmVyLnRvUGFyc2VTb3VyY2VTcGFuKHRlbXBsYXRlSWQsIGFzdC5uYW1lU3Bhbik7XG4gICAgaWYgKHNvdXJjZVNwYW4gPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXNzZXJ0aW9uIGZhaWx1cmU6IG5vIFNvdXJjZUxvY2F0aW9uIGZvdW5kIGZvciB1c2FnZSBvZiBwaXBlICcke2FzdC5uYW1lfScuYCk7XG4gICAgfVxuICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2gobWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgdGVtcGxhdGVJZCwgbWFwcGluZywgc291cmNlU3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBuZ0Vycm9yQ29kZShFcnJvckNvZGUuTUlTU0lOR19QSVBFKSwgZXJyb3JNc2cpKTtcbiAgICB0aGlzLnJlY29yZGVkUGlwZXMuYWRkKGFzdCk7XG4gIH1cblxuICBpbGxlZ2FsQXNzaWdubWVudFRvVGVtcGxhdGVWYXIoXG4gICAgICB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBhc3NpZ25tZW50OiBQcm9wZXJ0eVdyaXRlLCB0YXJnZXQ6IFRtcGxBc3RWYXJpYWJsZSk6IHZvaWQge1xuICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcodGVtcGxhdGVJZCk7XG4gICAgY29uc3QgZXJyb3JNc2cgPSBgQ2Fubm90IHVzZSB2YXJpYWJsZSAnJHtcbiAgICAgICAgYXNzaWdubWVudFxuICAgICAgICAgICAgLm5hbWV9JyBhcyB0aGUgbGVmdC1oYW5kIHNpZGUgb2YgYW4gYXNzaWdubWVudCBleHByZXNzaW9uLiBUZW1wbGF0ZSB2YXJpYWJsZXMgYXJlIHJlYWQtb25seS5gO1xuXG4gICAgY29uc3Qgc291cmNlU3BhbiA9IHRoaXMucmVzb2x2ZXIudG9QYXJzZVNvdXJjZVNwYW4odGVtcGxhdGVJZCwgYXNzaWdubWVudC5zb3VyY2VTcGFuKTtcbiAgICBpZiAoc291cmNlU3BhbiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb24gZmFpbHVyZTogbm8gU291cmNlTG9jYXRpb24gZm91bmQgZm9yIHByb3BlcnR5IGJpbmRpbmcuYCk7XG4gICAgfVxuICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2gobWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgdGVtcGxhdGVJZCwgbWFwcGluZywgc291cmNlU3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBuZ0Vycm9yQ29kZShFcnJvckNvZGUuV1JJVEVfVE9fUkVBRF9PTkxZX1ZBUklBQkxFKSwgZXJyb3JNc2csIFt7XG4gICAgICAgICAgdGV4dDogYFRoZSB2YXJpYWJsZSAke2Fzc2lnbm1lbnQubmFtZX0gaXMgZGVjbGFyZWQgaGVyZS5gLFxuICAgICAgICAgIHN0YXJ0OiB0YXJnZXQudmFsdWVTcGFuPy5zdGFydC5vZmZzZXQgfHwgdGFyZ2V0LnNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgICAgIGVuZDogdGFyZ2V0LnZhbHVlU3Bhbj8uZW5kLm9mZnNldCB8fCB0YXJnZXQuc291cmNlU3Bhbi5lbmQub2Zmc2V0LFxuICAgICAgICAgIHNvdXJjZUZpbGU6IG1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICAgIH1dKSk7XG4gIH1cblxuICBkdXBsaWNhdGVUZW1wbGF0ZVZhcihcbiAgICAgIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUsIGZpcnN0RGVjbDogVG1wbEFzdFZhcmlhYmxlKTogdm9pZCB7XG4gICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyh0ZW1wbGF0ZUlkKTtcbiAgICBjb25zdCBlcnJvck1zZyA9IGBDYW5ub3QgcmVkZWNsYXJlIHZhcmlhYmxlICcke1xuICAgICAgICB2YXJpYWJsZS5uYW1lfScgYXMgaXQgd2FzIHByZXZpb3VzbHkgZGVjbGFyZWQgZWxzZXdoZXJlIGZvciB0aGUgc2FtZSB0ZW1wbGF0ZS5gO1xuXG4gICAgLy8gVGhlIGFsbG9jYXRpb24gb2YgdGhlIGVycm9yIGhlcmUgaXMgcHJldHR5IHVzZWxlc3MgZm9yIHZhcmlhYmxlcyBkZWNsYXJlZCBpbiBtaWNyb3N5bnRheCxcbiAgICAvLyBzaW5jZSB0aGUgc291cmNlU3BhbiByZWZlcnMgdG8gdGhlIGVudGlyZSBtaWNyb3N5bnRheCBwcm9wZXJ0eSwgbm90IGEgc3BhbiBmb3IgdGhlIHNwZWNpZmljXG4gICAgLy8gdmFyaWFibGUgaW4gcXVlc3Rpb24uXG4gICAgLy9cbiAgICAvLyBUT0RPKGFseGh1Yik6IGFsbG9jYXRlIHRvIGEgdGlnaHRlciBzcGFuIG9uY2Ugb25lIGlzIGF2YWlsYWJsZS5cbiAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgIHRlbXBsYXRlSWQsIG1hcHBpbmcsIHZhcmlhYmxlLnNvdXJjZVNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgbmdFcnJvckNvZGUoRXJyb3JDb2RlLkRVUExJQ0FURV9WQVJJQUJMRV9ERUNMQVJBVElPTiksIGVycm9yTXNnLCBbe1xuICAgICAgICAgIHRleHQ6IGBUaGUgdmFyaWFibGUgJyR7Zmlyc3REZWNsLm5hbWV9JyB3YXMgZmlyc3QgZGVjbGFyZWQgaGVyZS5gLFxuICAgICAgICAgIHN0YXJ0OiBmaXJzdERlY2wuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgICAgZW5kOiBmaXJzdERlY2wuc291cmNlU3Bhbi5lbmQub2Zmc2V0LFxuICAgICAgICAgIHNvdXJjZUZpbGU6IG1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICAgIH1dKSk7XG4gIH1cblxuICByZXF1aXJlc0lubGluZVRjYih0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChtYWtlSW5saW5lRGlhZ25vc3RpYyhcbiAgICAgICAgdGVtcGxhdGVJZCwgRXJyb3JDb2RlLklOTElORV9UQ0JfUkVRVUlSRUQsIG5vZGUubmFtZSxcbiAgICAgICAgYFRoaXMgY29tcG9uZW50IHJlcXVpcmVzIGlubGluZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nLCB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBjdXJyZW50IGVudmlyb25tZW50LmApKTtcbiAgfVxuXG4gIHJlcXVpcmVzSW5saW5lVHlwZUNvbnN0cnVjdG9ycyhcbiAgICAgIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRpcmVjdGl2ZXM6IENsYXNzRGVjbGFyYXRpb25bXSk6IHZvaWQge1xuICAgIGxldCBtZXNzYWdlOiBzdHJpbmc7XG4gICAgaWYgKGRpcmVjdGl2ZXMubGVuZ3RoID4gMSkge1xuICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgYFRoaXMgY29tcG9uZW50IHVzZXMgZGlyZWN0aXZlcyB3aGljaCByZXF1aXJlIGlubGluZSB0eXBlIGNvbnN0cnVjdG9ycywgd2hpY2ggYXJlIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgYFRoaXMgY29tcG9uZW50IHVzZXMgYSBkaXJlY3RpdmUgd2hpY2ggcmVxdWlyZXMgYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3IsIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuYDtcbiAgICB9XG5cbiAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKG1ha2VJbmxpbmVEaWFnbm9zdGljKFxuICAgICAgICB0ZW1wbGF0ZUlkLCBFcnJvckNvZGUuSU5MSU5FX1RZUEVfQ1RPUl9SRVFVSVJFRCwgbm9kZS5uYW1lLCBtZXNzYWdlLFxuICAgICAgICBkaXJlY3RpdmVzLm1hcChcbiAgICAgICAgICAgIGRpciA9PiBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKGRpci5uYW1lLCBgUmVxdWlyZXMgYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3IuYCkpKSk7XG4gIH1cblxuICBzdWJvcHRpbWFsVHlwZUluZmVyZW5jZSh0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCB2YXJpYWJsZXM6IFRtcGxBc3RWYXJpYWJsZVtdKTogdm9pZCB7XG4gICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyh0ZW1wbGF0ZUlkKTtcblxuICAgIC8vIFNlbGVjdCBvbmUgb2YgdGhlIHRlbXBsYXRlIHZhcmlhYmxlcyB0aGF0J3MgbW9zdCBzdWl0YWJsZSBmb3IgcmVwb3J0aW5nIHRoZSBkaWFnbm9zdGljLiBBbnlcbiAgICAvLyB2YXJpYWJsZSB3aWxsIGRvLCBidXQgcHJlZmVyIG9uZSBib3VuZCB0byB0aGUgY29udGV4dCdzICRpbXBsaWNpdCBpZiBwcmVzZW50LlxuICAgIGxldCBkaWFnbm9zdGljVmFyOiBUbXBsQXN0VmFyaWFibGV8bnVsbCA9IG51bGw7XG4gICAgZm9yIChjb25zdCB2YXJpYWJsZSBvZiB2YXJpYWJsZXMpIHtcbiAgICAgIGlmIChkaWFnbm9zdGljVmFyID09PSBudWxsIHx8ICh2YXJpYWJsZS52YWx1ZSA9PT0gJycgfHwgdmFyaWFibGUudmFsdWUgPT09ICckaW1wbGljaXQnKSkge1xuICAgICAgICBkaWFnbm9zdGljVmFyID0gdmFyaWFibGU7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkaWFnbm9zdGljVmFyID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSBpcyBubyB2YXJpYWJsZSBvbiB3aGljaCB0byByZXBvcnQgdGhlIGRpYWdub3N0aWMuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IHZhcklkZW50aWZpY2F0aW9uID0gYCcke2RpYWdub3N0aWNWYXIubmFtZX0nYDtcbiAgICBpZiAodmFyaWFibGVzLmxlbmd0aCA9PT0gMikge1xuICAgICAgdmFySWRlbnRpZmljYXRpb24gKz0gYCAoYW5kIDEgb3RoZXIpYDtcbiAgICB9IGVsc2UgaWYgKHZhcmlhYmxlcy5sZW5ndGggPiAyKSB7XG4gICAgICB2YXJJZGVudGlmaWNhdGlvbiArPSBgIChhbmQgJHt2YXJpYWJsZXMubGVuZ3RoIC0gMX0gb3RoZXJzKWA7XG4gICAgfVxuICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICBgVGhpcyBzdHJ1Y3R1cmFsIGRpcmVjdGl2ZSBzdXBwb3J0cyBhZHZhbmNlZCB0eXBlIGluZmVyZW5jZSwgYnV0IHRoZSBjdXJyZW50IGNvbXBpbGVyIGNvbmZpZ3VyYXRpb24gcHJldmVudHMgaXRzIHVzYWdlLiBUaGUgdmFyaWFibGUgJHtcbiAgICAgICAgICAgIHZhcklkZW50aWZpY2F0aW9ufSB3aWxsIGhhdmUgdHlwZSAnYW55JyBhcyBhIHJlc3VsdC5cXG5cXG5Db25zaWRlciBlbmFibGluZyB0aGUgJ3N0cmljdFRlbXBsYXRlcycgb3B0aW9uIGluIHlvdXIgdHNjb25maWcuanNvbiBmb3IgYmV0dGVyIHR5cGUgaW5mZXJlbmNlIHdpdGhpbiB0aGlzIHRlbXBsYXRlLmA7XG5cbiAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgIHRlbXBsYXRlSWQsIG1hcHBpbmcsIGRpYWdub3N0aWNWYXIua2V5U3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LlN1Z2dlc3Rpb24sXG4gICAgICAgIG5nRXJyb3JDb2RlKEVycm9yQ29kZS5TVUdHRVNUX1NVQk9QVElNQUxfVFlQRV9JTkZFUkVOQ0UpLCBtZXNzYWdlKSk7XG4gIH1cblxuICBzcGxpdFR3b1dheUJpbmRpbmcoXG4gICAgICB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBpbnB1dDogQm91bmRBdHRyaWJ1dGUsIG91dHB1dDogVG1wbEFzdEJvdW5kRXZlbnQsXG4gICAgICBpbnB1dENvbnN1bWVyOiBDbGFzc0RlY2xhcmF0aW9uLCBvdXRwdXRDb25zdW1lcjogQ2xhc3NEZWNsYXJhdGlvbnxUbXBsQXN0RWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcodGVtcGxhdGVJZCk7XG4gICAgY29uc3QgZXJyb3JNc2cgPSBgVGhlIHByb3BlcnR5IGFuZCBldmVudCBoYWx2ZXMgb2YgdGhlIHR3by13YXkgYmluZGluZyAnJHtcbiAgICAgICAgaW5wdXQubmFtZX0nIGFyZSBub3QgYm91bmQgdG8gdGhlIHNhbWUgdGFyZ2V0LlxuICAgICAgICAgICAgRmluZCBtb3JlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9ndWlkZS90d28td2F5LWJpbmRpbmcjaG93LXR3by13YXktYmluZGluZy13b3Jrc2A7XG5cbiAgICBjb25zdCByZWxhdGVkTWVzc2FnZXM6IHt0ZXh0OiBzdHJpbmc7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7fVtdID0gW107XG5cbiAgICByZWxhdGVkTWVzc2FnZXMucHVzaCh7XG4gICAgICB0ZXh0OiBgVGhlIHByb3BlcnR5IGhhbGYgb2YgdGhlIGJpbmRpbmcgaXMgdG8gdGhlICcke2lucHV0Q29uc3VtZXIubmFtZS50ZXh0fScgY29tcG9uZW50LmAsXG4gICAgICBzdGFydDogaW5wdXRDb25zdW1lci5uYW1lLmdldFN0YXJ0KCksXG4gICAgICBlbmQ6IGlucHV0Q29uc3VtZXIubmFtZS5nZXRFbmQoKSxcbiAgICAgIHNvdXJjZUZpbGU6IGlucHV0Q29uc3VtZXIubmFtZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgfSk7XG5cbiAgICBpZiAob3V0cHV0Q29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgbGV0IG1lc3NhZ2UgPSBgVGhlIGV2ZW50IGhhbGYgb2YgdGhlIGJpbmRpbmcgaXMgdG8gYSBuYXRpdmUgZXZlbnQgY2FsbGVkICcke1xuICAgICAgICAgIGlucHV0Lm5hbWV9JyBvbiB0aGUgPCR7b3V0cHV0Q29uc3VtZXIubmFtZX0+IERPTSBlbGVtZW50LmA7XG4gICAgICBpZiAoIW1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgbWVzc2FnZSArPSBgXFxuIFxcbiBBcmUgeW91IG1pc3NpbmcgYW4gb3V0cHV0IGRlY2xhcmF0aW9uIGNhbGxlZCAnJHtvdXRwdXQubmFtZX0nP2A7XG4gICAgICB9XG4gICAgICByZWxhdGVkTWVzc2FnZXMucHVzaCh7XG4gICAgICAgIHRleHQ6IG1lc3NhZ2UsXG4gICAgICAgIHN0YXJ0OiBvdXRwdXRDb25zdW1lci5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldCArIDEsXG4gICAgICAgIGVuZDogb3V0cHV0Q29uc3VtZXIuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQgKyBvdXRwdXRDb25zdW1lci5uYW1lLmxlbmd0aCArIDEsXG4gICAgICAgIHNvdXJjZUZpbGU6IG1hcHBpbmcubm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2goe1xuICAgICAgICB0ZXh0OiBgVGhlIGV2ZW50IGhhbGYgb2YgdGhlIGJpbmRpbmcgaXMgdG8gdGhlICcke291dHB1dENvbnN1bWVyLm5hbWUudGV4dH0nIGNvbXBvbmVudC5gLFxuICAgICAgICBzdGFydDogb3V0cHV0Q29uc3VtZXIubmFtZS5nZXRTdGFydCgpLFxuICAgICAgICBlbmQ6IG91dHB1dENvbnN1bWVyLm5hbWUuZ2V0RW5kKCksXG4gICAgICAgIHNvdXJjZUZpbGU6IG91dHB1dENvbnN1bWVyLm5hbWUuZ2V0U291cmNlRmlsZSgpLFxuICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgIHRlbXBsYXRlSWQsIG1hcHBpbmcsIGlucHV0LmtleVNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgbmdFcnJvckNvZGUoRXJyb3JDb2RlLlNQTElUX1RXT19XQVlfQklORElORyksIGVycm9yTXNnLCByZWxhdGVkTWVzc2FnZXMpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlSW5saW5lRGlhZ25vc3RpYyhcbiAgICB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBjb2RlOiBFcnJvckNvZGUuSU5MSU5FX1RDQl9SRVFVSVJFRHxFcnJvckNvZGUuSU5MSU5FX1RZUEVfQ1RPUl9SRVFVSVJFRCxcbiAgICBub2RlOiB0cy5Ob2RlLCBtZXNzYWdlVGV4dDogc3RyaW5nfHRzLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4sXG4gICAgcmVsYXRlZEluZm9ybWF0aW9uPzogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbltdKTogVGVtcGxhdGVEaWFnbm9zdGljIHtcbiAgcmV0dXJuIHtcbiAgICAuLi5tYWtlRGlhZ25vc3RpYyhjb2RlLCBub2RlLCBtZXNzYWdlVGV4dCwgcmVsYXRlZEluZm9ybWF0aW9uKSxcbiAgICBjb21wb25lbnRGaWxlOiBub2RlLmdldFNvdXJjZUZpbGUoKSxcbiAgICB0ZW1wbGF0ZUlkLFxuICB9O1xufVxuIl19