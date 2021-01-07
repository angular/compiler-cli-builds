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
    exports.PartialComponentLinkerVersion1 = void 0;
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
        function PartialComponentLinkerVersion1(environment, getSourceFile, sourceUrl, code) {
            this.environment = environment;
            this.getSourceFile = getSourceFile;
            this.sourceUrl = sourceUrl;
            this.code = code;
            this.i18nNormalizeLineEndingsInICUs = this.environment.options.i18nNormalizeLineEndingsInICUs;
            this.enableI18nLegacyMessageIdFormat = this.environment.options.enableI18nLegacyMessageIdFormat;
            this.i18nUseExternalIds = this.environment.options.i18nUseExternalIds;
        }
        PartialComponentLinkerVersion1.prototype.linkPartialDeclaration = function (constantPool, metaObj) {
            var meta = this.toR3ComponentMeta(metaObj);
            var def = compiler_1.compileComponentFromMetadata(meta, constantPool, compiler_1.makeBindingParser());
            return def.expression;
        };
        /**
         * This function derives the `R3ComponentMetadata` from the provided AST object.
         */
        PartialComponentLinkerVersion1.prototype.toR3ComponentMeta = function (metaObj) {
            var interpolation = parseInterpolationConfig(metaObj);
            var templateObj = metaObj.getObject('template');
            var templateSource = templateObj.getValue('source');
            var isInline = templateObj.getBoolean('isInline');
            var templateInfo = this.getTemplateInfo(templateSource, isInline);
            // We always normalize line endings if the template is inline.
            var i18nNormalizeLineEndingsInICUs = isInline || this.i18nNormalizeLineEndingsInICUs;
            var template = compiler_1.parseTemplate(templateInfo.code, templateInfo.sourceUrl, {
                escapedString: templateInfo.isEscaped,
                interpolationConfig: interpolation,
                range: templateInfo.range,
                enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
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
            return tslib_1.__assign(tslib_1.__assign({}, partial_directive_linker_1_1.toR3DirectiveMeta(metaObj, this.code, this.sourceUrl)), { viewProviders: metaObj.has('viewProviders') ? metaObj.getOpaque('viewProviders') : null, template: {
                    nodes: template.nodes,
                    ngContentSelectors: template.ngContentSelectors,
                }, declarationListEmitMode: declarationListEmitMode, styles: metaObj.has('styles') ? metaObj.getArray('styles').map(function (entry) { return entry.getString(); }) :
                    [], encapsulation: metaObj.has('encapsulation') ?
                    parseEncapsulation(metaObj.getValue('encapsulation')) :
                    core_1.ViewEncapsulation.Emulated, interpolation: interpolation, changeDetection: metaObj.has('changeDetection') ?
                    parseChangeDetectionStrategy(metaObj.getValue('changeDetection')) :
                    core_1.ChangeDetectionStrategy.Default, animations: metaObj.has('animations') ? metaObj.getOpaque('animations') : null, relativeContextFilePath: this.sourceUrl, i18nUseExternalIds: this.i18nUseExternalIds, pipes: pipes,
                directives: directives });
        };
        /**
         * Update the range to remove the start and end chars, which should be quotes around the template.
         */
        PartialComponentLinkerVersion1.prototype.getTemplateInfo = function (templateNode, isInline) {
            var range = templateNode.getRange();
            if (!isInline) {
                // If not marked as inline, then we try to get the template info from the original external
                // template file, via source-mapping.
                var externalTemplate = this.tryExternalTemplate(range);
                if (externalTemplate !== null) {
                    return externalTemplate;
                }
            }
            // Either the template is marked inline or we failed to find the original external template.
            // So just use the literal string from the partially compiled component declaration.
            return this.templateFromPartialCode(templateNode, range);
        };
        PartialComponentLinkerVersion1.prototype.tryExternalTemplate = function (range) {
            var sourceFile = this.getSourceFile();
            if (sourceFile === null) {
                return null;
            }
            var pos = sourceFile.getOriginalLocation(range.startLine, range.startCol);
            // Only interested if the original location is in an "external" template file:
            // * the file is different to the current file
            // * the file does not end in `.js` or `.ts` (we expect it to be something like `.html`).
            // * the range starts at the beginning of the file
            if (pos === null || pos.file === this.sourceUrl || /\.[jt]s$/.test(pos.file) ||
                pos.line !== 0 || pos.column !== 0) {
                return null;
            }
            var templateContents = sourceFile.sources.find(function (src) { return (src === null || src === void 0 ? void 0 : src.sourcePath) === pos.file; }).contents;
            return {
                code: templateContents,
                sourceUrl: pos.file,
                range: { startPos: 0, startLine: 0, startCol: 0, endPos: templateContents.length },
                isEscaped: false,
            };
        };
        PartialComponentLinkerVersion1.prototype.templateFromPartialCode = function (templateNode, _a) {
            var startPos = _a.startPos, endPos = _a.endPos, startLine = _a.startLine, startCol = _a.startCol;
            if (!/["'`]/.test(this.code[startPos]) || this.code[startPos] !== this.code[endPos - 1]) {
                throw new fatal_linker_error_1.FatalLinkerError(templateNode.expression, "Expected the template string to be wrapped in quotes but got: " + this.code.substring(startPos, endPos));
            }
            return {
                code: this.code,
                sourceUrl: this.sourceUrl,
                range: { startPos: startPos + 1, endPos: endPos - 1, startLine: startLine, startCol: startCol + 1 },
                isEscaped: true,
            };
        };
        return PartialComponentLinkerVersion1;
    }());
    exports.PartialComponentLinkerVersion1 = PartialComponentLinkerVersion1;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUEyUjtJQUMzUixtREFBc0Y7SUFNdEYsMEZBQTBEO0lBSTFELHNJQUErRDtJQUcvRDs7T0FFRztJQUNIO1FBUUUsd0NBQ3FCLFdBQXVELEVBQ3ZELGFBQThCLEVBQVUsU0FBeUIsRUFDMUUsSUFBWTtZQUZILGdCQUFXLEdBQVgsV0FBVyxDQUE0QztZQUN2RCxrQkFBYSxHQUFiLGFBQWEsQ0FBaUI7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRSxTQUFJLEdBQUosSUFBSSxDQUFRO1lBVFAsbUNBQThCLEdBQzNDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDO1lBQzNDLG9DQUErQixHQUM1QyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQztZQUM1Qyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUt2RCxDQUFDO1FBRTVCLCtEQUFzQixHQUF0QixVQUNJLFlBQTBCLEVBQzFCLE9BQXFEO1lBQ3ZELElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxJQUFNLEdBQUcsR0FBRyx1Q0FBNEIsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLDRCQUFpQixFQUFFLENBQUMsQ0FBQztZQUNsRixPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7UUFDeEIsQ0FBQztRQUVEOztXQUVHO1FB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QUMzQixNQUFNLElBQUkscUNBQWdCLENBQ3RCLFNBQVMsRUFBRSwyREFBMkQsQ0FBQyxDQUFDO1NBQzdFO1FBRUQsT0FBTyxTQUFTLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUN4RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEsIENvbnN0YW50UG9vbCwgRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUsIERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUcsIEludGVycG9sYXRpb25Db25maWcsIG1ha2VCaW5kaW5nUGFyc2VyLCBwYXJzZVRlbXBsYXRlLCBSM0NvbXBvbmVudE1ldGFkYXRhLCBSM0RlY2xhcmVDb21wb25lbnRNZXRhZGF0YSwgUjNQYXJ0aWFsRGVjbGFyYXRpb24sIFIzVXNlZERpcmVjdGl2ZU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0NoYW5nZURldGVjdGlvblN0cmF0ZWd5LCBWaWV3RW5jYXBzdWxhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NvcmUnO1xuaW1wb3J0ICogYXMgbyBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvb3V0cHV0L291dHB1dF9hc3QnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSYW5nZX0gZnJvbSAnLi4vLi4vYXN0L2FzdF9ob3N0JztcbmltcG9ydCB7QXN0T2JqZWN0LCBBc3RWYWx1ZX0gZnJvbSAnLi4vLi4vYXN0L2FzdF92YWx1ZSc7XG5pbXBvcnQge0ZhdGFsTGlua2VyRXJyb3J9IGZyb20gJy4uLy4uL2ZhdGFsX2xpbmtlcl9lcnJvcic7XG5pbXBvcnQge0dldFNvdXJjZUZpbGVGbn0gZnJvbSAnLi4vZ2V0X3NvdXJjZV9maWxlJztcbmltcG9ydCB7TGlua2VyRW52aXJvbm1lbnR9IGZyb20gJy4uL2xpbmtlcl9lbnZpcm9ubWVudCc7XG5cbmltcG9ydCB7dG9SM0RpcmVjdGl2ZU1ldGF9IGZyb20gJy4vcGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcblxuLyoqXG4gKiBBIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGlzIGRlc2lnbmVkIHRvIHByb2Nlc3MgYMm1ybVuZ0RlY2xhcmVDb21wb25lbnQoKWAgY2FsbCBleHByZXNzaW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMTxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4gaW1wbGVtZW50c1xuICAgIFBhcnRpYWxMaW5rZXI8VEV4cHJlc3Npb24+IHtcbiAgcHJpdmF0ZSByZWFkb25seSBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgPVxuICAgICAgdGhpcy5lbnZpcm9ubWVudC5vcHRpb25zLmkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcztcbiAgcHJpdmF0ZSByZWFkb25seSBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID1cbiAgICAgIHRoaXMuZW52aXJvbm1lbnQub3B0aW9ucy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0O1xuICBwcml2YXRlIHJlYWRvbmx5IGkxOG5Vc2VFeHRlcm5hbElkcyA9IHRoaXMuZW52aXJvbm1lbnQub3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHM7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGVudmlyb25tZW50OiBMaW5rZXJFbnZpcm9ubWVudDxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGdldFNvdXJjZUZpbGU6IEdldFNvdXJjZUZpbGVGbiwgcHJpdmF0ZSBzb3VyY2VVcmw6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJpdmF0ZSBjb2RlOiBzdHJpbmcpIHt9XG5cbiAgbGlua1BhcnRpYWxEZWNsYXJhdGlvbihcbiAgICAgIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sLFxuICAgICAgbWV0YU9iajogQXN0T2JqZWN0PFIzUGFydGlhbERlY2xhcmF0aW9uLCBURXhwcmVzc2lvbj4pOiBvLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLnRvUjNDb21wb25lbnRNZXRhKG1ldGFPYmopO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgY29uc3RhbnRQb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICByZXR1cm4gZGVmLmV4cHJlc3Npb247XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBmdW5jdGlvbiBkZXJpdmVzIHRoZSBgUjNDb21wb25lbnRNZXRhZGF0YWAgZnJvbSB0aGUgcHJvdmlkZWQgQVNUIG9iamVjdC5cbiAgICovXG4gIHByaXZhdGUgdG9SM0NvbXBvbmVudE1ldGEobWV0YU9iajogQXN0T2JqZWN0PFIzRGVjbGFyZUNvbXBvbmVudE1ldGFkYXRhLCBURXhwcmVzc2lvbj4pOlxuICAgICAgUjNDb21wb25lbnRNZXRhZGF0YSB7XG4gICAgY29uc3QgaW50ZXJwb2xhdGlvbiA9IHBhcnNlSW50ZXJwb2xhdGlvbkNvbmZpZyhtZXRhT2JqKTtcbiAgICBjb25zdCB0ZW1wbGF0ZU9iaiA9IG1ldGFPYmouZ2V0T2JqZWN0KCd0ZW1wbGF0ZScpO1xuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gdGVtcGxhdGVPYmouZ2V0VmFsdWUoJ3NvdXJjZScpO1xuICAgIGNvbnN0IGlzSW5saW5lID0gdGVtcGxhdGVPYmouZ2V0Qm9vbGVhbignaXNJbmxpbmUnKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmdldFRlbXBsYXRlSW5mbyh0ZW1wbGF0ZVNvdXJjZSwgaXNJbmxpbmUpO1xuXG4gICAgLy8gV2UgYWx3YXlzIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGlzIGlubGluZS5cbiAgICBjb25zdCBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgPSBpc0lubGluZSB8fCB0aGlzLmkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcztcblxuICAgIGNvbnN0IHRlbXBsYXRlID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZUluZm8uY29kZSwgdGVtcGxhdGVJbmZvLnNvdXJjZVVybCwge1xuICAgICAgZXNjYXBlZFN0cmluZzogdGVtcGxhdGVJbmZvLmlzRXNjYXBlZCxcbiAgICAgIGludGVycG9sYXRpb25Db25maWc6IGludGVycG9sYXRpb24sXG4gICAgICByYW5nZTogdGVtcGxhdGVJbmZvLnJhbmdlLFxuICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogdGhpcy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczpcbiAgICAgICAgICBtZXRhT2JqLmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpID8gbWV0YU9iai5nZXRCb29sZWFuKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykgOiBmYWxzZSxcbiAgICAgIGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyxcbiAgICAgIGlzSW5saW5lLFxuICAgIH0pO1xuICAgIGlmICh0ZW1wbGF0ZS5lcnJvcnMgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGVycm9ycyA9IHRlbXBsYXRlLmVycm9ycy5tYXAoZXJyID0+IGVyci50b1N0cmluZygpKS5qb2luKCdcXG4nKTtcbiAgICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICAgIHRlbXBsYXRlU291cmNlLmV4cHJlc3Npb24sIGBFcnJvcnMgZm91bmQgaW4gdGhlIHRlbXBsYXRlOlxcbiR7ZXJyb3JzfWApO1xuICAgIH1cblxuICAgIGxldCBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSA9IERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkRpcmVjdDtcblxuICAgIGxldCBkaXJlY3RpdmVzOiBSM1VzZWREaXJlY3RpdmVNZXRhZGF0YVtdID0gW107XG4gICAgaWYgKG1ldGFPYmouaGFzKCdkaXJlY3RpdmVzJykpIHtcbiAgICAgIGRpcmVjdGl2ZXMgPSBtZXRhT2JqLmdldEFycmF5KCdkaXJlY3RpdmVzJykubWFwKGRpcmVjdGl2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZUV4cHIgPSBkaXJlY3RpdmUuZ2V0T2JqZWN0KCk7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBkaXJlY3RpdmVFeHByLmdldFZhbHVlKCd0eXBlJyk7XG4gICAgICAgIGNvbnN0IHNlbGVjdG9yID0gZGlyZWN0aXZlRXhwci5nZXRTdHJpbmcoJ3NlbGVjdG9yJyk7XG5cbiAgICAgICAgbGV0IHR5cGVFeHByID0gdHlwZS5nZXRPcGFxdWUoKTtcbiAgICAgICAgY29uc3QgZm9yd2FyZFJlZlR5cGUgPSBleHRyYWN0Rm9yd2FyZFJlZih0eXBlKTtcbiAgICAgICAgaWYgKGZvcndhcmRSZWZUeXBlICE9PSBudWxsKSB7XG4gICAgICAgICAgdHlwZUV4cHIgPSBmb3J3YXJkUmVmVHlwZTtcbiAgICAgICAgICBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSA9IERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHR5cGU6IHR5cGVFeHByLFxuICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICBpbnB1dHM6IGRpcmVjdGl2ZUV4cHIuaGFzKCdpbnB1dHMnKSA/XG4gICAgICAgICAgICAgIGRpcmVjdGl2ZUV4cHIuZ2V0QXJyYXkoJ2lucHV0cycpLm1hcChpbnB1dCA9PiBpbnB1dC5nZXRTdHJpbmcoKSkgOlxuICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICBvdXRwdXRzOiBkaXJlY3RpdmVFeHByLmhhcygnb3V0cHV0cycpID9cbiAgICAgICAgICAgICAgZGlyZWN0aXZlRXhwci5nZXRBcnJheSgnb3V0cHV0cycpLm1hcChpbnB1dCA9PiBpbnB1dC5nZXRTdHJpbmcoKSkgOlxuICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICBleHBvcnRBczogZGlyZWN0aXZlRXhwci5oYXMoJ2V4cG9ydEFzJykgP1xuICAgICAgICAgICAgICBkaXJlY3RpdmVFeHByLmdldEFycmF5KCdleHBvcnRBcycpLm1hcChleHBvcnRBcyA9PiBleHBvcnRBcy5nZXRTdHJpbmcoKSkgOlxuICAgICAgICAgICAgICBudWxsLFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbGV0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIG8uRXhwcmVzc2lvbj4oKTtcbiAgICBpZiAobWV0YU9iai5oYXMoJ3BpcGVzJykpIHtcbiAgICAgIHBpcGVzID0gbWV0YU9iai5nZXRPYmplY3QoJ3BpcGVzJykudG9NYXAocGlwZSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcndhcmRSZWZUeXBlID0gZXh0cmFjdEZvcndhcmRSZWYocGlwZSk7XG4gICAgICAgIGlmIChmb3J3YXJkUmVmVHlwZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlID0gRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuQ2xvc3VyZTtcbiAgICAgICAgICByZXR1cm4gZm9yd2FyZFJlZlR5cGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHBpcGUuZ2V0T3BhcXVlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAuLi50b1IzRGlyZWN0aXZlTWV0YShtZXRhT2JqLCB0aGlzLmNvZGUsIHRoaXMuc291cmNlVXJsKSxcbiAgICAgIHZpZXdQcm92aWRlcnM6IG1ldGFPYmouaGFzKCd2aWV3UHJvdmlkZXJzJykgPyBtZXRhT2JqLmdldE9wYXF1ZSgndmlld1Byb3ZpZGVycycpIDogbnVsbCxcbiAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgIG5vZGVzOiB0ZW1wbGF0ZS5ub2RlcyxcbiAgICAgICAgbmdDb250ZW50U2VsZWN0b3JzOiB0ZW1wbGF0ZS5uZ0NvbnRlbnRTZWxlY3RvcnMsXG4gICAgICB9LFxuICAgICAgZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUsXG4gICAgICBzdHlsZXM6IG1ldGFPYmouaGFzKCdzdHlsZXMnKSA/IG1ldGFPYmouZ2V0QXJyYXkoJ3N0eWxlcycpLm1hcChlbnRyeSA9PiBlbnRyeS5nZXRTdHJpbmcoKSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbXSxcbiAgICAgIGVuY2Fwc3VsYXRpb246IG1ldGFPYmouaGFzKCdlbmNhcHN1bGF0aW9uJykgP1xuICAgICAgICAgIHBhcnNlRW5jYXBzdWxhdGlvbihtZXRhT2JqLmdldFZhbHVlKCdlbmNhcHN1bGF0aW9uJykpIDpcbiAgICAgICAgICBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZCxcbiAgICAgIGludGVycG9sYXRpb24sXG4gICAgICBjaGFuZ2VEZXRlY3Rpb246IG1ldGFPYmouaGFzKCdjaGFuZ2VEZXRlY3Rpb24nKSA/XG4gICAgICAgICAgcGFyc2VDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneShtZXRhT2JqLmdldFZhbHVlKCdjaGFuZ2VEZXRlY3Rpb24nKSkgOlxuICAgICAgICAgIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LkRlZmF1bHQsXG4gICAgICBhbmltYXRpb25zOiBtZXRhT2JqLmhhcygnYW5pbWF0aW9ucycpID8gbWV0YU9iai5nZXRPcGFxdWUoJ2FuaW1hdGlvbnMnKSA6IG51bGwsXG4gICAgICByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aDogdGhpcy5zb3VyY2VVcmwsXG4gICAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IHRoaXMuaTE4blVzZUV4dGVybmFsSWRzLFxuICAgICAgcGlwZXMsXG4gICAgICBkaXJlY3RpdmVzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSByYW5nZSB0byByZW1vdmUgdGhlIHN0YXJ0IGFuZCBlbmQgY2hhcnMsIHdoaWNoIHNob3VsZCBiZSBxdW90ZXMgYXJvdW5kIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVJbmZvKHRlbXBsYXRlTm9kZTogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+LCBpc0lubGluZTogYm9vbGVhbik6XG4gICAgICBUZW1wbGF0ZUluZm8ge1xuICAgIGNvbnN0IHJhbmdlID0gdGVtcGxhdGVOb2RlLmdldFJhbmdlKCk7XG5cbiAgICBpZiAoIWlzSW5saW5lKSB7XG4gICAgICAvLyBJZiBub3QgbWFya2VkIGFzIGlubGluZSwgdGhlbiB3ZSB0cnkgdG8gZ2V0IHRoZSB0ZW1wbGF0ZSBpbmZvIGZyb20gdGhlIG9yaWdpbmFsIGV4dGVybmFsXG4gICAgICAvLyB0ZW1wbGF0ZSBmaWxlLCB2aWEgc291cmNlLW1hcHBpbmcuXG4gICAgICBjb25zdCBleHRlcm5hbFRlbXBsYXRlID0gdGhpcy50cnlFeHRlcm5hbFRlbXBsYXRlKHJhbmdlKTtcbiAgICAgIGlmIChleHRlcm5hbFRlbXBsYXRlICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBleHRlcm5hbFRlbXBsYXRlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEVpdGhlciB0aGUgdGVtcGxhdGUgaXMgbWFya2VkIGlubGluZSBvciB3ZSBmYWlsZWQgdG8gZmluZCB0aGUgb3JpZ2luYWwgZXh0ZXJuYWwgdGVtcGxhdGUuXG4gICAgLy8gU28ganVzdCB1c2UgdGhlIGxpdGVyYWwgc3RyaW5nIGZyb20gdGhlIHBhcnRpYWxseSBjb21waWxlZCBjb21wb25lbnQgZGVjbGFyYXRpb24uXG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVGcm9tUGFydGlhbENvZGUodGVtcGxhdGVOb2RlLCByYW5nZSk7XG4gIH1cblxuICBwcml2YXRlIHRyeUV4dGVybmFsVGVtcGxhdGUocmFuZ2U6IFJhbmdlKTogVGVtcGxhdGVJbmZvfG51bGwge1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoc291cmNlRmlsZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zID0gc291cmNlRmlsZS5nZXRPcmlnaW5hbExvY2F0aW9uKHJhbmdlLnN0YXJ0TGluZSwgcmFuZ2Uuc3RhcnRDb2wpO1xuICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpZiB0aGUgb3JpZ2luYWwgbG9jYXRpb24gaXMgaW4gYW4gXCJleHRlcm5hbFwiIHRlbXBsYXRlIGZpbGU6XG4gICAgLy8gKiB0aGUgZmlsZSBpcyBkaWZmZXJlbnQgdG8gdGhlIGN1cnJlbnQgZmlsZVxuICAgIC8vICogdGhlIGZpbGUgZG9lcyBub3QgZW5kIGluIGAuanNgIG9yIGAudHNgICh3ZSBleHBlY3QgaXQgdG8gYmUgc29tZXRoaW5nIGxpa2UgYC5odG1sYCkuXG4gICAgLy8gKiB0aGUgcmFuZ2Ugc3RhcnRzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGVcbiAgICBpZiAocG9zID09PSBudWxsIHx8IHBvcy5maWxlID09PSB0aGlzLnNvdXJjZVVybCB8fCAvXFwuW2p0XXMkLy50ZXN0KHBvcy5maWxlKSB8fFxuICAgICAgICBwb3MubGluZSAhPT0gMCB8fCBwb3MuY29sdW1uICE9PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUNvbnRlbnRzID0gc291cmNlRmlsZS5zb3VyY2VzLmZpbmQoc3JjID0+IHNyYz8uc291cmNlUGF0aCA9PT0gcG9zLmZpbGUpIS5jb250ZW50cztcblxuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiB0ZW1wbGF0ZUNvbnRlbnRzLFxuICAgICAgc291cmNlVXJsOiBwb3MuZmlsZSxcbiAgICAgIHJhbmdlOiB7c3RhcnRQb3M6IDAsIHN0YXJ0TGluZTogMCwgc3RhcnRDb2w6IDAsIGVuZFBvczogdGVtcGxhdGVDb250ZW50cy5sZW5ndGh9LFxuICAgICAgaXNFc2NhcGVkOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUZyb21QYXJ0aWFsQ29kZShcbiAgICAgIHRlbXBsYXRlTm9kZTogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+LFxuICAgICAge3N0YXJ0UG9zLCBlbmRQb3MsIHN0YXJ0TGluZSwgc3RhcnRDb2x9OiBSYW5nZSk6IFRlbXBsYXRlSW5mbyB7XG4gICAgaWYgKCEvW1wiJ2BdLy50ZXN0KHRoaXMuY29kZVtzdGFydFBvc10pIHx8IHRoaXMuY29kZVtzdGFydFBvc10gIT09IHRoaXMuY29kZVtlbmRQb3MgLSAxXSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgICAgdGVtcGxhdGVOb2RlLmV4cHJlc3Npb24sXG4gICAgICAgICAgYEV4cGVjdGVkIHRoZSB0ZW1wbGF0ZSBzdHJpbmcgdG8gYmUgd3JhcHBlZCBpbiBxdW90ZXMgYnV0IGdvdDogJHtcbiAgICAgICAgICAgICAgdGhpcy5jb2RlLnN1YnN0cmluZyhzdGFydFBvcywgZW5kUG9zKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IHRoaXMuY29kZSxcbiAgICAgIHNvdXJjZVVybDogdGhpcy5zb3VyY2VVcmwsXG4gICAgICByYW5nZToge3N0YXJ0UG9zOiBzdGFydFBvcyArIDEsIGVuZFBvczogZW5kUG9zIC0gMSwgc3RhcnRMaW5lLCBzdGFydENvbDogc3RhcnRDb2wgKyAxfSxcbiAgICAgIGlzRXNjYXBlZDogdHJ1ZSxcbiAgICB9O1xuICB9XG59XG5cbmludGVyZmFjZSBUZW1wbGF0ZUluZm8ge1xuICBjb2RlOiBzdHJpbmc7XG4gIHNvdXJjZVVybDogc3RyaW5nO1xuICByYW5nZTogUmFuZ2U7XG4gIGlzRXNjYXBlZDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGFuIGBJbnRlcnBvbGF0aW9uQ29uZmlnYCBmcm9tIHRoZSBjb21wb25lbnQgZGVjbGFyYXRpb24uXG4gKi9cbmZ1bmN0aW9uIHBhcnNlSW50ZXJwb2xhdGlvbkNvbmZpZzxURXhwcmVzc2lvbj4oXG4gICAgbWV0YU9iajogQXN0T2JqZWN0PFIzRGVjbGFyZUNvbXBvbmVudE1ldGFkYXRhLCBURXhwcmVzc2lvbj4pOiBJbnRlcnBvbGF0aW9uQ29uZmlnIHtcbiAgaWYgKCFtZXRhT2JqLmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgcmV0dXJuIERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUc7XG4gIH1cblxuICBjb25zdCBpbnRlcnBvbGF0aW9uRXhwciA9IG1ldGFPYmouZ2V0VmFsdWUoJ2ludGVycG9sYXRpb24nKTtcbiAgY29uc3QgdmFsdWVzID0gaW50ZXJwb2xhdGlvbkV4cHIuZ2V0QXJyYXkoKS5tYXAoZW50cnkgPT4gZW50cnkuZ2V0U3RyaW5nKCkpO1xuICBpZiAodmFsdWVzLmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBpbnRlcnBvbGF0aW9uRXhwci5leHByZXNzaW9uLFxuICAgICAgICAnVW5zdXBwb3J0ZWQgaW50ZXJwb2xhdGlvbiBjb25maWcsIGV4cGVjdGVkIGFuIGFycmF5IGNvbnRhaW5pbmcgZXhhY3RseSB0d28gc3RyaW5ncycpO1xuICB9XG4gIHJldHVybiBJbnRlcnBvbGF0aW9uQ29uZmlnLmZyb21BcnJheSh2YWx1ZXMgYXMgW3N0cmluZywgc3RyaW5nXSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgYFZpZXdFbmNhcHN1bGF0aW9uYCBtb2RlIGZyb20gdGhlIEFTVCB2YWx1ZSdzIHN5bWJvbCBuYW1lLlxuICovXG5mdW5jdGlvbiBwYXJzZUVuY2Fwc3VsYXRpb248VEV4cHJlc3Npb24+KGVuY2Fwc3VsYXRpb246IEFzdFZhbHVlPFZpZXdFbmNhcHN1bGF0aW9uLCBURXhwcmVzc2lvbj4pOlxuICAgIFZpZXdFbmNhcHN1bGF0aW9uIHtcbiAgY29uc3Qgc3ltYm9sTmFtZSA9IGVuY2Fwc3VsYXRpb24uZ2V0U3ltYm9sTmFtZSgpO1xuICBpZiAoc3ltYm9sTmFtZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBlbmNhcHN1bGF0aW9uLmV4cHJlc3Npb24sICdFeHBlY3RlZCBlbmNhcHN1bGF0aW9uIHRvIGhhdmUgYSBzeW1ib2wgbmFtZScpO1xuICB9XG4gIGNvbnN0IGVudW1WYWx1ZSA9IFZpZXdFbmNhcHN1bGF0aW9uW3N5bWJvbE5hbWUgYXMga2V5b2YgdHlwZW9mIFZpZXdFbmNhcHN1bGF0aW9uXTtcbiAgaWYgKGVudW1WYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoZW5jYXBzdWxhdGlvbi5leHByZXNzaW9uLCAnVW5zdXBwb3J0ZWQgZW5jYXBzdWxhdGlvbicpO1xuICB9XG4gIHJldHVybiBlbnVtVmFsdWU7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgYENoYW5nZURldGVjdGlvblN0cmF0ZWd5YCBmcm9tIHRoZSBBU1QgdmFsdWUncyBzeW1ib2wgbmFtZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneTxURXhwcmVzc2lvbj4oXG4gICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3k6IEFzdFZhbHVlPENoYW5nZURldGVjdGlvblN0cmF0ZWd5LCBURXhwcmVzc2lvbj4pOlxuICAgIENoYW5nZURldGVjdGlvblN0cmF0ZWd5IHtcbiAgY29uc3Qgc3ltYm9sTmFtZSA9IGNoYW5nZURldGVjdGlvblN0cmF0ZWd5LmdldFN5bWJvbE5hbWUoKTtcbiAgaWYgKHN5bWJvbE5hbWUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuZXhwcmVzc2lvbixcbiAgICAgICAgJ0V4cGVjdGVkIGNoYW5nZSBkZXRlY3Rpb24gc3RyYXRlZ3kgdG8gaGF2ZSBhIHN5bWJvbCBuYW1lJyk7XG4gIH1cbiAgY29uc3QgZW51bVZhbHVlID0gQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3lbc3ltYm9sTmFtZSBhcyBrZXlvZiB0eXBlb2YgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ldO1xuICBpZiAoZW51bVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuZXhwcmVzc2lvbiwgJ1Vuc3VwcG9ydGVkIGNoYW5nZSBkZXRlY3Rpb24gc3RyYXRlZ3knKTtcbiAgfVxuICByZXR1cm4gZW51bVZhbHVlO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgdGhlIHR5cGUgcmVmZXJlbmNlIGV4cHJlc3Npb24gZnJvbSBhIGBmb3J3YXJkUmVmYCBmdW5jdGlvbiBjYWxsLiBGb3IgZXhhbXBsZSwgdGhlXG4gKiBleHByZXNzaW9uIGBmb3J3YXJkUmVmKGZ1bmN0aW9uKCkgeyByZXR1cm4gRm9vRGlyOyB9KWAgcmV0dXJucyBgRm9vRGlyYC4gTm90ZSB0aGF0IHRoaXNcbiAqIGV4cHJlc3Npb24gaXMgcmVxdWlyZWQgdG8gYmUgd3JhcHBlZCBpbiBhIGNsb3N1cmUsIGFzIG90aGVyd2lzZSB0aGUgZm9yd2FyZCByZWZlcmVuY2Ugd291bGQgYmVcbiAqIHJlc29sdmVkIGJlZm9yZSBpbml0aWFsaXphdGlvbi5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEZvcndhcmRSZWY8VEV4cHJlc3Npb24+KGV4cHI6IEFzdFZhbHVlPHVua25vd24sIFRFeHByZXNzaW9uPik6XG4gICAgby5XcmFwcGVkTm9kZUV4cHI8VEV4cHJlc3Npb24+fG51bGwge1xuICBpZiAoIWV4cHIuaXNDYWxsRXhwcmVzc2lvbigpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjYWxsZWUgPSBleHByLmdldENhbGxlZSgpO1xuICBpZiAoY2FsbGVlLmdldFN5bWJvbE5hbWUoKSAhPT0gJ2ZvcndhcmRSZWYnKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgIGNhbGxlZS5leHByZXNzaW9uLCAnVW5zdXBwb3J0ZWQgZGlyZWN0aXZlIHR5cGUsIGV4cGVjdGVkIGZvcndhcmRSZWYgb3IgYSB0eXBlIHJlZmVyZW5jZScpO1xuICB9XG5cbiAgY29uc3QgYXJncyA9IGV4cHIuZ2V0QXJndW1lbnRzKCk7XG4gIGlmIChhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKGV4cHIsICdVbnN1cHBvcnRlZCBmb3J3YXJkUmVmIGNhbGwsIGV4cGVjdGVkIGEgc2luZ2xlIGFyZ3VtZW50Jyk7XG4gIH1cblxuICBjb25zdCB3cmFwcGVyRm4gPSBhcmdzWzBdIGFzIEFzdFZhbHVlPEZ1bmN0aW9uLCBURXhwcmVzc2lvbj47XG4gIGlmICghd3JhcHBlckZuLmlzRnVuY3Rpb24oKSkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICB3cmFwcGVyRm4sICdVbnN1cHBvcnRlZCBmb3J3YXJkUmVmIGNhbGwsIGV4cGVjdGVkIGEgZnVuY3Rpb24gYXJndW1lbnQnKTtcbiAgfVxuXG4gIHJldHVybiB3cmFwcGVyRm4uZ2V0RnVuY3Rpb25SZXR1cm5WYWx1ZSgpLmdldE9wYXF1ZSgpO1xufVxuIl19