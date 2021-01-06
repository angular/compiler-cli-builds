(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/core", "@angular/compiler-cli/linker/src/fatal_linker_error", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toR3ComponentMeta = exports.PartialComponentLinkerVersion1 = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/compiler/src/core");
    var fatal_linker_error_1 = require("@angular/compiler-cli/linker/src/fatal_linker_error");
    var partial_directive_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1");
    /**
     * A `PartialLinker` that is designed to process `ɵɵngDeclareComponent()` call expressions.
     */
    var PartialComponentLinkerVersion1 = /** @class */ (function () {
        function PartialComponentLinkerVersion1(options) {
            this.options = options;
        }
        PartialComponentLinkerVersion1.prototype.linkPartialDeclaration = function (sourceUrl, code, constantPool, metaObj) {
            var meta = toR3ComponentMeta(metaObj, code, sourceUrl, this.options);
            var def = compiler_1.compileComponentFromMetadata(meta, constantPool, compiler_1.makeBindingParser());
            return def.expression;
        };
        return PartialComponentLinkerVersion1;
    }());
    exports.PartialComponentLinkerVersion1 = PartialComponentLinkerVersion1;
    /**
     * This function derives the `R3ComponentMetadata` from the provided AST object.
     */
    function toR3ComponentMeta(metaObj, code, sourceUrl, options) {
        var interpolation = parseInterpolationConfig(metaObj);
        var templateObj = metaObj.getObject('template');
        var templateSource = templateObj.getValue('source');
        var range = getTemplateRange(templateSource, code);
        var isInline = templateObj.getBoolean('isInline');
        // We always normalize line endings if the template is inline.
        var i18nNormalizeLineEndingsInICUs = isInline || options.i18nNormalizeLineEndingsInICUs;
        var template = compiler_1.parseTemplate(code, sourceUrl, {
            escapedString: true,
            interpolationConfig: interpolation,
            range: range,
            enableI18nLegacyMessageIdFormat: options.enableI18nLegacyMessageIdFormat,
            preserveWhitespaces: metaObj.has('preserveWhitespaces') ? metaObj.getBoolean('preserveWhitespaces') : false,
            i18nNormalizeLineEndingsInICUs: i18nNormalizeLineEndingsInICUs,
            isInline: isInline,
        });
        if (template.errors !== null) {
            var errors = template.errors.map(function (err) { return err.toString(); }).join('\n');
            throw new fatal_linker_error_1.FatalLinkerError(templateSource.expression, "Errors found in the template:\n" + errors);
        }
        var declarationListEmitMode = 0 /* Direct */;
        var directives = [];
        if (metaObj.has('directives')) {
            directives = metaObj.getArray('directives').map(function (directive) {
                var directiveExpr = directive.getObject();
                var type = directiveExpr.getValue('type');
                var selector = directiveExpr.getString('selector');
                var typeExpr = type.getOpaque();
                var forwardRefType = extractForwardRef(type);
                if (forwardRefType !== null) {
                    typeExpr = forwardRefType;
                    declarationListEmitMode = 1 /* Closure */;
                }
                return {
                    type: typeExpr,
                    selector: selector,
                    inputs: directiveExpr.has('inputs') ?
                        directiveExpr.getArray('inputs').map(function (input) { return input.getString(); }) :
                        [],
                    outputs: directiveExpr.has('outputs') ?
                        directiveExpr.getArray('outputs').map(function (input) { return input.getString(); }) :
                        [],
                    exportAs: directiveExpr.has('exportAs') ?
                        directiveExpr.getArray('exportAs').map(function (exportAs) { return exportAs.getString(); }) :
                        null,
                };
            });
        }
        var pipes = new Map();
        if (metaObj.has('pipes')) {
            pipes = metaObj.getObject('pipes').toMap(function (pipe) {
                var forwardRefType = extractForwardRef(pipe);
                if (forwardRefType !== null) {
                    declarationListEmitMode = 1 /* Closure */;
                    return forwardRefType;
                }
                else {
                    return pipe.getOpaque();
                }
            });
        }
        return tslib_1.__assign(tslib_1.__assign({}, partial_directive_linker_1_1.toR3DirectiveMeta(metaObj, code, sourceUrl)), { viewProviders: metaObj.has('viewProviders') ? metaObj.getOpaque('viewProviders') : null, template: {
                nodes: template.nodes,
                ngContentSelectors: template.ngContentSelectors,
            }, declarationListEmitMode: declarationListEmitMode, styles: metaObj.has('styles') ? metaObj.getArray('styles').map(function (entry) { return entry.getString(); }) : [], encapsulation: metaObj.has('encapsulation') ?
                parseEncapsulation(metaObj.getValue('encapsulation')) :
                core_1.ViewEncapsulation.Emulated, interpolation: interpolation, changeDetection: metaObj.has('changeDetection') ?
                parseChangeDetectionStrategy(metaObj.getValue('changeDetection')) :
                core_1.ChangeDetectionStrategy.Default, animations: metaObj.has('animations') ? metaObj.getOpaque('animations') : null, relativeContextFilePath: sourceUrl, i18nUseExternalIds: options.i18nUseExternalIds, pipes: pipes,
            directives: directives });
    }
    exports.toR3ComponentMeta = toR3ComponentMeta;
    /**
     * Extract an `InterpolationConfig` from the component declaration.
     */
    function parseInterpolationConfig(metaObj) {
        if (!metaObj.has('interpolation')) {
            return compiler_1.DEFAULT_INTERPOLATION_CONFIG;
        }
        var interpolationExpr = metaObj.getValue('interpolation');
        var values = interpolationExpr.getArray().map(function (entry) { return entry.getString(); });
        if (values.length !== 2) {
            throw new fatal_linker_error_1.FatalLinkerError(interpolationExpr.expression, 'Unsupported interpolation config, expected an array containing exactly two strings');
        }
        return compiler_1.InterpolationConfig.fromArray(values);
    }
    /**
     * Determines the `ViewEncapsulation` mode from the AST value's symbol name.
     */
    function parseEncapsulation(encapsulation) {
        var symbolName = encapsulation.getSymbolName();
        if (symbolName === null) {
            throw new fatal_linker_error_1.FatalLinkerError(encapsulation.expression, 'Expected encapsulation to have a symbol name');
        }
        var enumValue = core_1.ViewEncapsulation[symbolName];
        if (enumValue === undefined) {
            throw new fatal_linker_error_1.FatalLinkerError(encapsulation.expression, 'Unsupported encapsulation');
        }
        return enumValue;
    }
    /**
     * Determines the `ChangeDetectionStrategy` from the AST value's symbol name.
     */
    function parseChangeDetectionStrategy(changeDetectionStrategy) {
        var symbolName = changeDetectionStrategy.getSymbolName();
        if (symbolName === null) {
            throw new fatal_linker_error_1.FatalLinkerError(changeDetectionStrategy.expression, 'Expected change detection strategy to have a symbol name');
        }
        var enumValue = core_1.ChangeDetectionStrategy[symbolName];
        if (enumValue === undefined) {
            throw new fatal_linker_error_1.FatalLinkerError(changeDetectionStrategy.expression, 'Unsupported change detection strategy');
        }
        return enumValue;
    }
    /**
     * Update the range to remove the start and end chars, which should be quotes around the template.
     */
    function getTemplateRange(templateNode, code) {
        var _a = templateNode.getRange(), startPos = _a.startPos, endPos = _a.endPos, startLine = _a.startLine, startCol = _a.startCol;
        if (!/["'`]/.test(code[startPos]) || code[startPos] !== code[endPos - 1]) {
            throw new fatal_linker_error_1.FatalLinkerError(templateNode.expression, "Expected the template string to be wrapped in quotes but got: " + code.substring(startPos, endPos));
        }
        return {
            startPos: startPos + 1,
            endPos: endPos - 1,
            startLine: startLine,
            startCol: startCol + 1,
        };
    }
    /**
     * Extract the type reference expression from a `forwardRef` function call. For example, the
     * expression `forwardRef(function() { return FooDir; })` returns `FooDir`. Note that this
     * expression is required to be wrapped in a closure, as otherwise the forward reference would be
     * resolved before initialization.
     */
    function extractForwardRef(expr) {
        if (!expr.isCallExpression()) {
            return null;
        }
        var callee = expr.getCallee();
        if (callee.getSymbolName() !== 'forwardRef') {
            throw new fatal_linker_error_1.FatalLinkerError(callee.expression, 'Unsupported directive type, expected forwardRef or a type reference');
        }
        var args = expr.getArguments();
        if (args.length !== 1) {
            throw new fatal_linker_error_1.FatalLinkerError(expr, 'Unsupported forwardRef call, expected a single argument');
        }
        var wrapperFn = args[0];
        if (!wrapperFn.isFunction()) {
            throw new fatal_linker_error_1.FatalLinkerError(wrapperFn, 'Unsupported forwardRef call, expected a function argument');
        }
        return wrapperFn.getFunctionReturnValue().getOpaque();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUEyUjtJQUMzUixtREFBc0Y7SUFLdEYsMEZBQTBEO0lBRzFELHNJQUErRDtJQUcvRDs7T0FFRztJQUNIO1FBQ0Usd0NBQTZCLE9BQXNCO1lBQXRCLFlBQU8sR0FBUCxPQUFPLENBQWU7UUFBRyxDQUFDO1FBRXZELCtEQUFzQixHQUF0QixVQUNJLFNBQWlCLEVBQUUsSUFBWSxFQUFFLFlBQTBCLEVBQzNELE9BQXFEO1lBQ3ZELElBQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2RSxJQUFNLEdBQUcsR0FBRyx1Q0FBNEIsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLDRCQUFpQixFQUFFLENBQUMsQ0FBQztZQUNsRixPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7UUFDeEIsQ0FBQztRQUNILHFDQUFDO0lBQUQsQ0FBQyxBQVZELElBVUM7SUFWWSx3RUFBOEI7SUFZM0M7O09BRUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsT0FBMkQsRUFBRSxJQUFZLEVBQUUsU0FBaUIsRUFDNUYsT0FBc0I7UUFDeEIsSUFBTSxhQUFhLEdBQUcsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRCxJQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsUUFBUSxD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SyxDQUFDLEVBQUU7WUFDckIsTUFBTSxJQUFJLHFDQUFnQixDQUFDLElBQUksRUFBRSx5REFBeUQsQ0FBQyxDQUFDO1NBQzdGO1FBRUQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBb0MsQ0FBQztRQUM3RCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQzNCLE1BQU0sSUFBSSxxQ0FBZ0IsQ0FDdEIsU0FBUyxFQUFFLDJEQUEyRCxDQUFDLENBQUM7U0FDN0U7UUFFRCxPQUFPLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgQ29uc3RhbnRQb29sLCBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSwgREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRywgSW50ZXJwb2xhdGlvbkNvbmZpZywgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlVGVtcGxhdGUsIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzRGVjbGFyZUNvbXBvbmVudE1ldGFkYXRhLCBSM1BhcnRpYWxEZWNsYXJhdGlvbiwgUjNVc2VkRGlyZWN0aXZlTWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Q2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksIFZpZXdFbmNhcHN1bGF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvY29yZSc7XG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5cbmltcG9ydCB7UmFuZ2V9IGZyb20gJy4uLy4uL2FzdC9hc3RfaG9zdCc7XG5pbXBvcnQge0FzdE9iamVjdCwgQXN0VmFsdWV9IGZyb20gJy4uLy4uL2FzdC9hc3RfdmFsdWUnO1xuaW1wb3J0IHtGYXRhbExpbmtlckVycm9yfSBmcm9tICcuLi8uLi9mYXRhbF9saW5rZXJfZXJyb3InO1xuaW1wb3J0IHtMaW5rZXJPcHRpb25zfSBmcm9tICcuLi9saW5rZXJfb3B0aW9ucyc7XG5cbmltcG9ydCB7dG9SM0RpcmVjdGl2ZU1ldGF9IGZyb20gJy4vcGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcblxuLyoqXG4gKiBBIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGlzIGRlc2lnbmVkIHRvIHByb2Nlc3MgYMm1ybVuZ0RlY2xhcmVDb21wb25lbnQoKWAgY2FsbCBleHByZXNzaW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMTxURXhwcmVzc2lvbj4gaW1wbGVtZW50cyBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogTGlua2VyT3B0aW9ucykge31cblxuICBsaW5rUGFydGlhbERlY2xhcmF0aW9uKFxuICAgICAgc291cmNlVXJsOiBzdHJpbmcsIGNvZGU6IHN0cmluZywgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wsXG4gICAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNQYXJ0aWFsRGVjbGFyYXRpb24sIFRFeHByZXNzaW9uPik6IG8uRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgbWV0YSA9IHRvUjNDb21wb25lbnRNZXRhKG1ldGFPYmosIGNvZGUsIHNvdXJjZVVybCwgdGhpcy5vcHRpb25zKTtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhKG1ldGEsIGNvbnN0YW50UG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgcmV0dXJuIGRlZi5leHByZXNzaW9uO1xuICB9XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBkZXJpdmVzIHRoZSBgUjNDb21wb25lbnRNZXRhZGF0YWAgZnJvbSB0aGUgcHJvdmlkZWQgQVNUIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUjNDb21wb25lbnRNZXRhPFRFeHByZXNzaW9uPihcbiAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlQ29tcG9uZW50TWV0YWRhdGEsIFRFeHByZXNzaW9uPiwgY29kZTogc3RyaW5nLCBzb3VyY2VVcmw6IHN0cmluZyxcbiAgICBvcHRpb25zOiBMaW5rZXJPcHRpb25zKTogUjNDb21wb25lbnRNZXRhZGF0YSB7XG4gIGNvbnN0IGludGVycG9sYXRpb24gPSBwYXJzZUludGVycG9sYXRpb25Db25maWcobWV0YU9iaik7XG4gIGNvbnN0IHRlbXBsYXRlT2JqID0gbWV0YU9iai5nZXRPYmplY3QoJ3RlbXBsYXRlJyk7XG4gIGNvbnN0IHRlbXBsYXRlU291cmNlID0gdGVtcGxhdGVPYmouZ2V0VmFsdWUoJ3NvdXJjZScpO1xuICBjb25zdCByYW5nZSA9IGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGVTb3VyY2UsIGNvZGUpO1xuICBjb25zdCBpc0lubGluZSA9IHRlbXBsYXRlT2JqLmdldEJvb2xlYW4oJ2lzSW5saW5lJyk7XG5cbiAgLy8gV2UgYWx3YXlzIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGlzIGlubGluZS5cbiAgY29uc3QgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzID0gaXNJbmxpbmUgfHwgb3B0aW9ucy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM7XG5cbiAgY29uc3QgdGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKGNvZGUsIHNvdXJjZVVybCwge1xuICAgIGVzY2FwZWRTdHJpbmc6IHRydWUsXG4gICAgaW50ZXJwb2xhdGlvbkNvbmZpZzogaW50ZXJwb2xhdGlvbixcbiAgICByYW5nZSxcbiAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBvcHRpb25zLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgcHJlc2VydmVXaGl0ZXNwYWNlczpcbiAgICAgICAgbWV0YU9iai5oYXMoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSA/IG1ldGFPYmouZ2V0Qm9vbGVhbigncHJlc2VydmVXaGl0ZXNwYWNlcycpIDogZmFsc2UsXG4gICAgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLFxuICAgIGlzSW5saW5lLFxuICB9KTtcbiAgaWYgKHRlbXBsYXRlLmVycm9ycyAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGVycm9ycyA9IHRlbXBsYXRlLmVycm9ycy5tYXAoZXJyID0+IGVyci50b1N0cmluZygpKS5qb2luKCdcXG4nKTtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgdGVtcGxhdGVTb3VyY2UuZXhwcmVzc2lvbiwgYEVycm9ycyBmb3VuZCBpbiB0aGUgdGVtcGxhdGU6XFxuJHtlcnJvcnN9YCk7XG4gIH1cblxuICBsZXQgZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUgPSBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZS5EaXJlY3Q7XG5cbiAgbGV0IGRpcmVjdGl2ZXM6IFIzVXNlZERpcmVjdGl2ZU1ldGFkYXRhW10gPSBbXTtcbiAgaWYgKG1ldGFPYmouaGFzKCdkaXJlY3RpdmVzJykpIHtcbiAgICBkaXJlY3RpdmVzID0gbWV0YU9iai5nZXRBcnJheSgnZGlyZWN0aXZlcycpLm1hcChkaXJlY3RpdmUgPT4ge1xuICAgICAgY29uc3QgZGlyZWN0aXZlRXhwciA9IGRpcmVjdGl2ZS5nZXRPYmplY3QoKTtcbiAgICAgIGNvbnN0IHR5cGUgPSBkaXJlY3RpdmVFeHByLmdldFZhbHVlKCd0eXBlJyk7XG4gICAgICBjb25zdCBzZWxlY3RvciA9IGRpcmVjdGl2ZUV4cHIuZ2V0U3RyaW5nKCdzZWxlY3RvcicpO1xuXG4gICAgICBsZXQgdHlwZUV4cHIgPSB0eXBlLmdldE9wYXF1ZSgpO1xuICAgICAgY29uc3QgZm9yd2FyZFJlZlR5cGUgPSBleHRyYWN0Rm9yd2FyZFJlZih0eXBlKTtcbiAgICAgIGlmIChmb3J3YXJkUmVmVHlwZSAhPT0gbnVsbCkge1xuICAgICAgICB0eXBlRXhwciA9IGZvcndhcmRSZWZUeXBlO1xuICAgICAgICBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSA9IERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IHR5cGVFeHByLFxuICAgICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgIGlucHV0czogZGlyZWN0aXZlRXhwci5oYXMoJ2lucHV0cycpID9cbiAgICAgICAgICAgIGRpcmVjdGl2ZUV4cHIuZ2V0QXJyYXkoJ2lucHV0cycpLm1hcChpbnB1dCA9PiBpbnB1dC5nZXRTdHJpbmcoKSkgOlxuICAgICAgICAgICAgW10sXG4gICAgICAgIG91dHB1dHM6IGRpcmVjdGl2ZUV4cHIuaGFzKCdvdXRwdXRzJykgP1xuICAgICAgICAgICAgZGlyZWN0aXZlRXhwci5nZXRBcnJheSgnb3V0cHV0cycpLm1hcChpbnB1dCA9PiBpbnB1dC5nZXRTdHJpbmcoKSkgOlxuICAgICAgICAgICAgW10sXG4gICAgICAgIGV4cG9ydEFzOiBkaXJlY3RpdmVFeHByLmhhcygnZXhwb3J0QXMnKSA/XG4gICAgICAgICAgICBkaXJlY3RpdmVFeHByLmdldEFycmF5KCdleHBvcnRBcycpLm1hcChleHBvcnRBcyA9PiBleHBvcnRBcy5nZXRTdHJpbmcoKSkgOlxuICAgICAgICAgICAgbnVsbCxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBsZXQgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgby5FeHByZXNzaW9uPigpO1xuICBpZiAobWV0YU9iai5oYXMoJ3BpcGVzJykpIHtcbiAgICBwaXBlcyA9IG1ldGFPYmouZ2V0T2JqZWN0KCdwaXBlcycpLnRvTWFwKHBpcGUgPT4ge1xuICAgICAgY29uc3QgZm9yd2FyZFJlZlR5cGUgPSBleHRyYWN0Rm9yd2FyZFJlZihwaXBlKTtcbiAgICAgIGlmIChmb3J3YXJkUmVmVHlwZSAhPT0gbnVsbCkge1xuICAgICAgICBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSA9IERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmU7XG4gICAgICAgIHJldHVybiBmb3J3YXJkUmVmVHlwZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwaXBlLmdldE9wYXF1ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAuLi50b1IzRGlyZWN0aXZlTWV0YShtZXRhT2JqLCBjb2RlLCBzb3VyY2VVcmwpLFxuICAgIHZpZXdQcm92aWRlcnM6IG1ldGFPYmouaGFzKCd2aWV3UHJvdmlkZXJzJykgPyBtZXRhT2JqLmdldE9wYXF1ZSgndmlld1Byb3ZpZGVycycpIDogbnVsbCxcbiAgICB0ZW1wbGF0ZToge1xuICAgICAgbm9kZXM6IHRlbXBsYXRlLm5vZGVzLFxuICAgICAgbmdDb250ZW50U2VsZWN0b3JzOiB0ZW1wbGF0ZS5uZ0NvbnRlbnRTZWxlY3RvcnMsXG4gICAgfSxcbiAgICBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSxcbiAgICBzdHlsZXM6IG1ldGFPYmouaGFzKCdzdHlsZXMnKSA/IG1ldGFPYmouZ2V0QXJyYXkoJ3N0eWxlcycpLm1hcChlbnRyeSA9PiBlbnRyeS5nZXRTdHJpbmcoKSkgOiBbXSxcbiAgICBlbmNhcHN1bGF0aW9uOiBtZXRhT2JqLmhhcygnZW5jYXBzdWxhdGlvbicpID9cbiAgICAgICAgcGFyc2VFbmNhcHN1bGF0aW9uKG1ldGFPYmouZ2V0VmFsdWUoJ2VuY2Fwc3VsYXRpb24nKSkgOlxuICAgICAgICBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZCxcbiAgICBpbnRlcnBvbGF0aW9uLFxuICAgIGNoYW5nZURldGVjdGlvbjogbWV0YU9iai5oYXMoJ2NoYW5nZURldGVjdGlvbicpID9cbiAgICAgICAgcGFyc2VDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneShtZXRhT2JqLmdldFZhbHVlKCdjaGFuZ2VEZXRlY3Rpb24nKSkgOlxuICAgICAgICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5EZWZhdWx0LFxuICAgIGFuaW1hdGlvbnM6IG1ldGFPYmouaGFzKCdhbmltYXRpb25zJykgPyBtZXRhT2JqLmdldE9wYXF1ZSgnYW5pbWF0aW9ucycpIDogbnVsbCxcbiAgICByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aDogc291cmNlVXJsLFxuICAgIGkxOG5Vc2VFeHRlcm5hbElkczogb3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMsXG4gICAgcGlwZXMsXG4gICAgZGlyZWN0aXZlcyxcbiAgfTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGFuIGBJbnRlcnBvbGF0aW9uQ29uZmlnYCBmcm9tIHRoZSBjb21wb25lbnQgZGVjbGFyYXRpb24uXG4gKi9cbmZ1bmN0aW9uIHBhcnNlSW50ZXJwb2xhdGlvbkNvbmZpZzxURXhwcmVzc2lvbj4oXG4gICAgbWV0YU9iajogQXN0T2JqZWN0PFIzRGVjbGFyZUNvbXBvbmVudE1ldGFkYXRhLCBURXhwcmVzc2lvbj4pOiBJbnRlcnBvbGF0aW9uQ29uZmlnIHtcbiAgaWYgKCFtZXRhT2JqLmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgcmV0dXJuIERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUc7XG4gIH1cblxuICBjb25zdCBpbnRlcnBvbGF0aW9uRXhwciA9IG1ldGFPYmouZ2V0VmFsdWUoJ2ludGVycG9sYXRpb24nKTtcbiAgY29uc3QgdmFsdWVzID0gaW50ZXJwb2xhdGlvbkV4cHIuZ2V0QXJyYXkoKS5tYXAoZW50cnkgPT4gZW50cnkuZ2V0U3RyaW5nKCkpO1xuICBpZiAodmFsdWVzLmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBpbnRlcnBvbGF0aW9uRXhwci5leHByZXNzaW9uLFxuICAgICAgICAnVW5zdXBwb3J0ZWQgaW50ZXJwb2xhdGlvbiBjb25maWcsIGV4cGVjdGVkIGFuIGFycmF5IGNvbnRhaW5pbmcgZXhhY3RseSB0d28gc3RyaW5ncycpO1xuICB9XG4gIHJldHVybiBJbnRlcnBvbGF0aW9uQ29uZmlnLmZyb21BcnJheSh2YWx1ZXMgYXMgW3N0cmluZywgc3RyaW5nXSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgYFZpZXdFbmNhcHN1bGF0aW9uYCBtb2RlIGZyb20gdGhlIEFTVCB2YWx1ZSdzIHN5bWJvbCBuYW1lLlxuICovXG5mdW5jdGlvbiBwYXJzZUVuY2Fwc3VsYXRpb248VEV4cHJlc3Npb24+KGVuY2Fwc3VsYXRpb246IEFzdFZhbHVlPFZpZXdFbmNhcHN1bGF0aW9uLCBURXhwcmVzc2lvbj4pOlxuICAgIFZpZXdFbmNhcHN1bGF0aW9uIHtcbiAgY29uc3Qgc3ltYm9sTmFtZSA9IGVuY2Fwc3VsYXRpb24uZ2V0U3ltYm9sTmFtZSgpO1xuICBpZiAoc3ltYm9sTmFtZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBlbmNhcHN1bGF0aW9uLmV4cHJlc3Npb24sICdFeHBlY3RlZCBlbmNhcHN1bGF0aW9uIHRvIGhhdmUgYSBzeW1ib2wgbmFtZScpO1xuICB9XG4gIGNvbnN0IGVudW1WYWx1ZSA9IFZpZXdFbmNhcHN1bGF0aW9uW3N5bWJvbE5hbWUgYXMga2V5b2YgdHlwZW9mIFZpZXdFbmNhcHN1bGF0aW9uXTtcbiAgaWYgKGVudW1WYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoZW5jYXBzdWxhdGlvbi5leHByZXNzaW9uLCAnVW5zdXBwb3J0ZWQgZW5jYXBzdWxhdGlvbicpO1xuICB9XG4gIHJldHVybiBlbnVtVmFsdWU7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgYENoYW5nZURldGVjdGlvblN0cmF0ZWd5YCBmcm9tIHRoZSBBU1QgdmFsdWUncyBzeW1ib2wgbmFtZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneTxURXhwcmVzc2lvbj4oXG4gICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3k6IEFzdFZhbHVlPENoYW5nZURldGVjdGlvblN0cmF0ZWd5LCBURXhwcmVzc2lvbj4pOlxuICAgIENoYW5nZURldGVjdGlvblN0cmF0ZWd5IHtcbiAgY29uc3Qgc3ltYm9sTmFtZSA9IGNoYW5nZURldGVjdGlvblN0cmF0ZWd5LmdldFN5bWJvbE5hbWUoKTtcbiAgaWYgKHN5bWJvbE5hbWUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuZXhwcmVzc2lvbixcbiAgICAgICAgJ0V4cGVjdGVkIGNoYW5nZSBkZXRlY3Rpb24gc3RyYXRlZ3kgdG8gaGF2ZSBhIHN5bWJvbCBuYW1lJyk7XG4gIH1cbiAgY29uc3QgZW51bVZhbHVlID0gQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3lbc3ltYm9sTmFtZSBhcyBrZXlvZiB0eXBlb2YgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ldO1xuICBpZiAoZW51bVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuZXhwcmVzc2lvbiwgJ1Vuc3VwcG9ydGVkIGNoYW5nZSBkZXRlY3Rpb24gc3RyYXRlZ3knKTtcbiAgfVxuICByZXR1cm4gZW51bVZhbHVlO1xufVxuXG4vKipcbiAqIFVwZGF0ZSB0aGUgcmFuZ2UgdG8gcmVtb3ZlIHRoZSBzdGFydCBhbmQgZW5kIGNoYXJzLCB3aGljaCBzaG91bGQgYmUgcXVvdGVzIGFyb3VuZCB0aGUgdGVtcGxhdGUuXG4gKi9cbmZ1bmN0aW9uIGdldFRlbXBsYXRlUmFuZ2U8VEV4cHJlc3Npb24+KFxuICAgIHRlbXBsYXRlTm9kZTogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+LCBjb2RlOiBzdHJpbmcpOiBSYW5nZSB7XG4gIGNvbnN0IHtzdGFydFBvcywgZW5kUG9zLCBzdGFydExpbmUsIHN0YXJ0Q29sfSA9IHRlbXBsYXRlTm9kZS5nZXRSYW5nZSgpO1xuXG4gIGlmICghL1tcIidgXS8udGVzdChjb2RlW3N0YXJ0UG9zXSkgfHwgY29kZVtzdGFydFBvc10gIT09IGNvZGVbZW5kUG9zIC0gMV0pIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgdGVtcGxhdGVOb2RlLmV4cHJlc3Npb24sXG4gICAgICAgIGBFeHBlY3RlZCB0aGUgdGVtcGxhdGUgc3RyaW5nIHRvIGJlIHdyYXBwZWQgaW4gcXVvdGVzIGJ1dCBnb3Q6ICR7XG4gICAgICAgICAgICBjb2RlLnN1YnN0cmluZyhzdGFydFBvcywgZW5kUG9zKX1gKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHN0YXJ0UG9zOiBzdGFydFBvcyArIDEsXG4gICAgZW5kUG9zOiBlbmRQb3MgLSAxLFxuICAgIHN0YXJ0TGluZSxcbiAgICBzdGFydENvbDogc3RhcnRDb2wgKyAxLFxuICB9O1xufVxuXG4vKipcbiAqIEV4dHJhY3QgdGhlIHR5cGUgcmVmZXJlbmNlIGV4cHJlc3Npb24gZnJvbSBhIGBmb3J3YXJkUmVmYCBmdW5jdGlvbiBjYWxsLiBGb3IgZXhhbXBsZSwgdGhlXG4gKiBleHByZXNzaW9uIGBmb3J3YXJkUmVmKGZ1bmN0aW9uKCkgeyByZXR1cm4gRm9vRGlyOyB9KWAgcmV0dXJucyBgRm9vRGlyYC4gTm90ZSB0aGF0IHRoaXNcbiAqIGV4cHJlc3Npb24gaXMgcmVxdWlyZWQgdG8gYmUgd3JhcHBlZCBpbiBhIGNsb3N1cmUsIGFzIG90aGVyd2lzZSB0aGUgZm9yd2FyZCByZWZlcmVuY2Ugd291bGQgYmVcbiAqIHJlc29sdmVkIGJlZm9yZSBpbml0aWFsaXphdGlvbi5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEZvcndhcmRSZWY8VEV4cHJlc3Npb24+KGV4cHI6IEFzdFZhbHVlPHVua25vd24sIFRFeHByZXNzaW9uPik6XG4gICAgby5XcmFwcGVkTm9kZUV4cHI8VEV4cHJlc3Npb24+fG51bGwge1xuICBpZiAoIWV4cHIuaXNDYWxsRXhwcmVzc2lvbigpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjYWxsZWUgPSBleHByLmdldENhbGxlZSgpO1xuICBpZiAoY2FsbGVlLmdldFN5bWJvbE5hbWUoKSAhPT0gJ2ZvcndhcmRSZWYnKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgIGNhbGxlZS5leHByZXNzaW9uLCAnVW5zdXBwb3J0ZWQgZGlyZWN0aXZlIHR5cGUsIGV4cGVjdGVkIGZvcndhcmRSZWYgb3IgYSB0eXBlIHJlZmVyZW5jZScpO1xuICB9XG5cbiAgY29uc3QgYXJncyA9IGV4cHIuZ2V0QXJndW1lbnRzKCk7XG4gIGlmIChhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKGV4cHIsICdVbnN1cHBvcnRlZCBmb3J3YXJkUmVmIGNhbGwsIGV4cGVjdGVkIGEgc2luZ2xlIGFyZ3VtZW50Jyk7XG4gIH1cblxuICBjb25zdCB3cmFwcGVyRm4gPSBhcmdzWzBdIGFzIEFzdFZhbHVlPEZ1bmN0aW9uLCBURXhwcmVzc2lvbj47XG4gIGlmICghd3JhcHBlckZuLmlzRnVuY3Rpb24oKSkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICB3cmFwcGVyRm4sICdVbnN1cHBvcnRlZCBmb3J3YXJkUmVmIGNhbGwsIGV4cGVjdGVkIGEgZnVuY3Rpb24gYXJndW1lbnQnKTtcbiAgfVxuXG4gIHJldHVybiB3cmFwcGVyRm4uZ2V0RnVuY3Rpb25SZXR1cm5WYWx1ZSgpLmdldE9wYXF1ZSgpO1xufVxuIl19