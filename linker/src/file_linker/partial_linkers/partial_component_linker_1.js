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
            var templateSource = metaObj.getValue('template');
            var isInline = metaObj.has('isInline') ? metaObj.getBoolean('isInline') : false;
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
            var collectUsedDirectives = function (directives) {
                return directives.map(function (directive) {
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
            };
            var directives = [];
            if (metaObj.has('components')) {
                directives.push.apply(directives, tslib_1.__spreadArray([], tslib_1.__read(collectUsedDirectives(metaObj.getArray('components')))));
            }
            if (metaObj.has('directives')) {
                directives.push.apply(directives, tslib_1.__spreadArray([], tslib_1.__read(collectUsedDirectives(metaObj.getArray('directives')))));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUEyVDtJQUMzVCxtREFBc0Y7SUFNdEYsMEZBQTBEO0lBSTFELHNJQUErRDtJQUcvRDs7T0FFRztJQUNIO1FBUUUsd0NBQ3FCLFdBQXVELEVBQ3ZELGFBQThCLEVBQVUsU0FBeUIsRUFDMUUsSUFBWTtZQUZILGdCQUFXLEdBQVgsV0FBVyxDQUE0QztZQUN2RCxrQkFBYSxHQUFiLGFBQWEsQ0FBaUI7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRSxTQUFJLEdBQUosSUFBSSxDQUFRO1lBVFAsbUNBQThCLEdBQzNDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDO1lBQzNDLG9DQUErQixHQUM1QyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQztZQUM1Qyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUt2RCxDQUFDO1FBRTVCLCtEQUFzQixHQUF0QixVQUNJLFlBQTBCLEVBQzFCLE9BQXFEO1lBQ3ZELElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxJQUFNLEdBQUcsR0FBRyx1Q0FBNEIsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLDRCQUFpQixFQUFFLENBQUMsQ0FBQztZQUNsRixPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7UUFDeEIsQ0FBQztRQUVEOztXQUVHO1FB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RSxxRUFBcUUsQ0FBQyxDQUFDO1NBQy9GO1FBRUQsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDckIsTUFBTSxJQUFJLHFDQUFnQixDQUFDLElBQUksRUFBRSx5REFBeUQsQ0FBQyxDQUFDO1NBQzdGO1FBRUQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBb0MsQ0FBQztRQUM3RCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQzNCLE1BQU0sSUFBSSxxQ0FBZ0IsQ0FDdEIsU0FBUyxFQUFFLDJEQUEyRCxDQUFDLENBQUM7U0FDN0U7UUFFRCxPQUFPLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgQ29uc3RhbnRQb29sLCBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSwgREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRywgSW50ZXJwb2xhdGlvbkNvbmZpZywgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlVGVtcGxhdGUsIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzRGVjbGFyZUNvbXBvbmVudE1ldGFkYXRhLCBSM0RlY2xhcmVVc2VkRGlyZWN0aXZlTWV0YWRhdGEsIFIzUGFydGlhbERlY2xhcmF0aW9uLCBSM1VzZWREaXJlY3RpdmVNZXRhZGF0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgVmlld0VuY2Fwc3VsYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jb3JlJztcbmltcG9ydCAqIGFzIG8gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL291dHB1dC9vdXRwdXRfYXN0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UmFuZ2V9IGZyb20gJy4uLy4uL2FzdC9hc3RfaG9zdCc7XG5pbXBvcnQge0FzdE9iamVjdCwgQXN0VmFsdWV9IGZyb20gJy4uLy4uL2FzdC9hc3RfdmFsdWUnO1xuaW1wb3J0IHtGYXRhbExpbmtlckVycm9yfSBmcm9tICcuLi8uLi9mYXRhbF9saW5rZXJfZXJyb3InO1xuaW1wb3J0IHtHZXRTb3VyY2VGaWxlRm59IGZyb20gJy4uL2dldF9zb3VyY2VfZmlsZSc7XG5pbXBvcnQge0xpbmtlckVudmlyb25tZW50fSBmcm9tICcuLi9saW5rZXJfZW52aXJvbm1lbnQnO1xuXG5pbXBvcnQge3RvUjNEaXJlY3RpdmVNZXRhfSBmcm9tICcuL3BhcnRpYWxfZGlyZWN0aXZlX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbExpbmtlcn0gZnJvbSAnLi9wYXJ0aWFsX2xpbmtlcic7XG5cbi8qKlxuICogQSBgUGFydGlhbExpbmtlcmAgdGhhdCBpcyBkZXNpZ25lZCB0byBwcm9jZXNzIGDJtcm1bmdEZWNsYXJlQ29tcG9uZW50KClgIGNhbGwgZXhwcmVzc2lvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjE8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+IGltcGxlbWVudHNcbiAgICBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzID1cbiAgICAgIHRoaXMuZW52aXJvbm1lbnQub3B0aW9ucy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM7XG4gIHByaXZhdGUgcmVhZG9ubHkgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCA9XG4gICAgICB0aGlzLmVudmlyb25tZW50Lm9wdGlvbnMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDtcbiAgcHJpdmF0ZSByZWFkb25seSBpMThuVXNlRXh0ZXJuYWxJZHMgPSB0aGlzLmVudmlyb25tZW50Lm9wdGlvbnMuaTE4blVzZUV4dGVybmFsSWRzO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBlbnZpcm9ubWVudDogTGlua2VyRW52aXJvbm1lbnQ8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBnZXRTb3VyY2VGaWxlOiBHZXRTb3VyY2VGaWxlRm4sIHByaXZhdGUgc291cmNlVXJsOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHByaXZhdGUgY29kZTogc3RyaW5nKSB7fVxuXG4gIGxpbmtQYXJ0aWFsRGVjbGFyYXRpb24oXG4gICAgICBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCxcbiAgICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM1BhcnRpYWxEZWNsYXJhdGlvbiwgVEV4cHJlc3Npb24+KTogby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBtZXRhID0gdGhpcy50b1IzQ29tcG9uZW50TWV0YShtZXRhT2JqKTtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhKG1ldGEsIGNvbnN0YW50UG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgcmV0dXJuIGRlZi5leHByZXNzaW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgZnVuY3Rpb24gZGVyaXZlcyB0aGUgYFIzQ29tcG9uZW50TWV0YWRhdGFgIGZyb20gdGhlIHByb3ZpZGVkIEFTVCBvYmplY3QuXG4gICAqL1xuICBwcml2YXRlIHRvUjNDb21wb25lbnRNZXRhKG1ldGFPYmo6IEFzdE9iamVjdDxSM0RlY2xhcmVDb21wb25lbnRNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTpcbiAgICAgIFIzQ29tcG9uZW50TWV0YWRhdGEge1xuICAgIGNvbnN0IGludGVycG9sYXRpb24gPSBwYXJzZUludGVycG9sYXRpb25Db25maWcobWV0YU9iaik7XG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBtZXRhT2JqLmdldFZhbHVlKCd0ZW1wbGF0ZScpO1xuICAgIGNvbnN0IGlzSW5saW5lID0gbWV0YU9iai5oYXMoJ2lzSW5saW5lJykgPyBtZXRhT2JqLmdldEJvb2xlYW4oJ2lzSW5saW5lJykgOiBmYWxzZTtcbiAgICBjb25zdCB0ZW1wbGF0ZUluZm8gPSB0aGlzLmdldFRlbXBsYXRlSW5mbyh0ZW1wbGF0ZVNvdXJjZSwgaXNJbmxpbmUpO1xuXG4gICAgLy8gV2UgYWx3YXlzIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGlzIGlubGluZS5cbiAgICBjb25zdCBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgPSBpc0lubGluZSB8fCB0aGlzLmkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcztcblxuICAgIGNvbnN0IHRlbXBsYXRlID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZUluZm8uY29kZSwgdGVtcGxhdGVJbmZvLnNvdXJjZVVybCwge1xuICAgICAgZXNjYXBlZFN0cmluZzogdGVtcGxhdGVJbmZvLmlzRXNjYXBlZCxcbiAgICAgIGludGVycG9sYXRpb25Db25maWc6IGludGVycG9sYXRpb24sXG4gICAgICByYW5nZTogdGVtcGxhdGVJbmZvLnJhbmdlLFxuICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogdGhpcy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczpcbiAgICAgICAgICBtZXRhT2JqLmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpID8gbWV0YU9iai5nZXRCb29sZWFuKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykgOiBmYWxzZSxcbiAgICAgIGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyxcbiAgICAgIGlzSW5saW5lLFxuICAgIH0pO1xuICAgIGlmICh0ZW1wbGF0ZS5lcnJvcnMgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGVycm9ycyA9IHRlbXBsYXRlLmVycm9ycy5tYXAoZXJyID0+IGVyci50b1N0cmluZygpKS5qb2luKCdcXG4nKTtcbiAgICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICAgIHRlbXBsYXRlU291cmNlLmV4cHJlc3Npb24sIGBFcnJvcnMgZm91bmQgaW4gdGhlIHRlbXBsYXRlOlxcbiR7ZXJyb3JzfWApO1xuICAgIH1cblxuICAgIGxldCBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSA9IERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkRpcmVjdDtcblxuICAgIGNvbnN0IGNvbGxlY3RVc2VkRGlyZWN0aXZlcyA9XG4gICAgICAgIChkaXJlY3RpdmVzOiBBc3RWYWx1ZTxSM0RlY2xhcmVVc2VkRGlyZWN0aXZlTWV0YWRhdGEsIFRFeHByZXNzaW9uPltdKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpcmVjdGl2ZXMubWFwKGRpcmVjdGl2ZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmVFeHByID0gZGlyZWN0aXZlLmdldE9iamVjdCgpO1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGRpcmVjdGl2ZUV4cHIuZ2V0VmFsdWUoJ3R5cGUnKTtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gZGlyZWN0aXZlRXhwci5nZXRTdHJpbmcoJ3NlbGVjdG9yJyk7XG5cbiAgICAgICAgICAgIGxldCB0eXBlRXhwciA9IHR5cGUuZ2V0T3BhcXVlKCk7XG4gICAgICAgICAgICBjb25zdCBmb3J3YXJkUmVmVHlwZSA9IGV4dHJhY3RGb3J3YXJkUmVmKHR5cGUpO1xuICAgICAgICAgICAgaWYgKGZvcndhcmRSZWZUeXBlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHR5cGVFeHByID0gZm9yd2FyZFJlZlR5cGU7XG4gICAgICAgICAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlID0gRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuQ2xvc3VyZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdHlwZTogdHlwZUV4cHIsXG4gICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICAgICAgaW5wdXRzOiBkaXJlY3RpdmVFeHByLmhhcygnaW5wdXRzJykgP1xuICAgICAgICAgICAgICAgICAgZGlyZWN0aXZlRXhwci5nZXRBcnJheSgnaW5wdXRzJykubWFwKGlucHV0ID0+IGlucHV0LmdldFN0cmluZygpKSA6XG4gICAgICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICAgICAgb3V0cHV0czogZGlyZWN0aXZlRXhwci5oYXMoJ291dHB1dHMnKSA/XG4gICAgICAgICAgICAgICAgICBkaXJlY3RpdmVFeHByLmdldEFycmF5KCdvdXRwdXRzJykubWFwKGlucHV0ID0+IGlucHV0LmdldFN0cmluZygpKSA6XG4gICAgICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICAgICAgZXhwb3J0QXM6IGRpcmVjdGl2ZUV4cHIuaGFzKCdleHBvcnRBcycpID9cbiAgICAgICAgICAgICAgICAgIGRpcmVjdGl2ZUV4cHIuZ2V0QXJyYXkoJ2V4cG9ydEFzJykubWFwKGV4cG9ydEFzID0+IGV4cG9ydEFzLmdldFN0cmluZygpKSA6XG4gICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIGxldCBkaXJlY3RpdmVzOiBSM1VzZWREaXJlY3RpdmVNZXRhZGF0YVtdID0gW107XG4gICAgaWYgKG1ldGFPYmouaGFzKCdjb21wb25lbnRzJykpIHtcbiAgICAgIGRpcmVjdGl2ZXMucHVzaCguLi5jb2xsZWN0VXNlZERpcmVjdGl2ZXMobWV0YU9iai5nZXRBcnJheSgnY29tcG9uZW50cycpKSk7XG4gICAgfVxuICAgIGlmIChtZXRhT2JqLmhhcygnZGlyZWN0aXZlcycpKSB7XG4gICAgICBkaXJlY3RpdmVzLnB1c2goLi4uY29sbGVjdFVzZWREaXJlY3RpdmVzKG1ldGFPYmouZ2V0QXJyYXkoJ2RpcmVjdGl2ZXMnKSkpO1xuICAgIH1cblxuICAgIGxldCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBvLkV4cHJlc3Npb24+KCk7XG4gICAgaWYgKG1ldGFPYmouaGFzKCdwaXBlcycpKSB7XG4gICAgICBwaXBlcyA9IG1ldGFPYmouZ2V0T2JqZWN0KCdwaXBlcycpLnRvTWFwKHBpcGUgPT4ge1xuICAgICAgICBjb25zdCBmb3J3YXJkUmVmVHlwZSA9IGV4dHJhY3RGb3J3YXJkUmVmKHBpcGUpO1xuICAgICAgICBpZiAoZm9yd2FyZFJlZlR5cGUgIT09IG51bGwpIHtcbiAgICAgICAgICBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSA9IERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmU7XG4gICAgICAgICAgcmV0dXJuIGZvcndhcmRSZWZUeXBlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBwaXBlLmdldE9wYXF1ZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4udG9SM0RpcmVjdGl2ZU1ldGEobWV0YU9iaiwgdGhpcy5jb2RlLCB0aGlzLnNvdXJjZVVybCksXG4gICAgICB2aWV3UHJvdmlkZXJzOiBtZXRhT2JqLmhhcygndmlld1Byb3ZpZGVycycpID8gbWV0YU9iai5nZXRPcGFxdWUoJ3ZpZXdQcm92aWRlcnMnKSA6IG51bGwsXG4gICAgICB0ZW1wbGF0ZToge1xuICAgICAgICBub2RlczogdGVtcGxhdGUubm9kZXMsXG4gICAgICAgIG5nQ29udGVudFNlbGVjdG9yczogdGVtcGxhdGUubmdDb250ZW50U2VsZWN0b3JzLFxuICAgICAgfSxcbiAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLFxuICAgICAgc3R5bGVzOiBtZXRhT2JqLmhhcygnc3R5bGVzJykgPyBtZXRhT2JqLmdldEFycmF5KCdzdHlsZXMnKS5tYXAoZW50cnkgPT4gZW50cnkuZ2V0U3RyaW5nKCkpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW10sXG4gICAgICBlbmNhcHN1bGF0aW9uOiBtZXRhT2JqLmhhcygnZW5jYXBzdWxhdGlvbicpID9cbiAgICAgICAgICBwYXJzZUVuY2Fwc3VsYXRpb24obWV0YU9iai5nZXRWYWx1ZSgnZW5jYXBzdWxhdGlvbicpKSA6XG4gICAgICAgICAgVmlld0VuY2Fwc3VsYXRpb24uRW11bGF0ZWQsXG4gICAgICBpbnRlcnBvbGF0aW9uLFxuICAgICAgY2hhbmdlRGV0ZWN0aW9uOiBtZXRhT2JqLmhhcygnY2hhbmdlRGV0ZWN0aW9uJykgP1xuICAgICAgICAgIHBhcnNlQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kobWV0YU9iai5nZXRWYWx1ZSgnY2hhbmdlRGV0ZWN0aW9uJykpIDpcbiAgICAgICAgICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5EZWZhdWx0LFxuICAgICAgYW5pbWF0aW9uczogbWV0YU9iai5oYXMoJ2FuaW1hdGlvbnMnKSA/IG1ldGFPYmouZ2V0T3BhcXVlKCdhbmltYXRpb25zJykgOiBudWxsLFxuICAgICAgcmVsYXRpdmVDb250ZXh0RmlsZVBhdGg6IHRoaXMuc291cmNlVXJsLFxuICAgICAgaTE4blVzZUV4dGVybmFsSWRzOiB0aGlzLmkxOG5Vc2VFeHRlcm5hbElkcyxcbiAgICAgIHBpcGVzLFxuICAgICAgZGlyZWN0aXZlcyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgcmFuZ2UgdG8gcmVtb3ZlIHRoZSBzdGFydCBhbmQgZW5kIGNoYXJzLCB3aGljaCBzaG91bGQgYmUgcXVvdGVzIGFyb3VuZCB0aGUgdGVtcGxhdGUuXG4gICAqL1xuICBwcml2YXRlIGdldFRlbXBsYXRlSW5mbyh0ZW1wbGF0ZU5vZGU6IEFzdFZhbHVlPHVua25vd24sIFRFeHByZXNzaW9uPiwgaXNJbmxpbmU6IGJvb2xlYW4pOlxuICAgICAgVGVtcGxhdGVJbmZvIHtcbiAgICBjb25zdCByYW5nZSA9IHRlbXBsYXRlTm9kZS5nZXRSYW5nZSgpO1xuXG4gICAgaWYgKCFpc0lubGluZSkge1xuICAgICAgLy8gSWYgbm90IG1hcmtlZCBhcyBpbmxpbmUsIHRoZW4gd2UgdHJ5IHRvIGdldCB0aGUgdGVtcGxhdGUgaW5mbyBmcm9tIHRoZSBvcmlnaW5hbCBleHRlcm5hbFxuICAgICAgLy8gdGVtcGxhdGUgZmlsZSwgdmlhIHNvdXJjZS1tYXBwaW5nLlxuICAgICAgY29uc3QgZXh0ZXJuYWxUZW1wbGF0ZSA9IHRoaXMudHJ5RXh0ZXJuYWxUZW1wbGF0ZShyYW5nZSk7XG4gICAgICBpZiAoZXh0ZXJuYWxUZW1wbGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZXh0ZXJuYWxUZW1wbGF0ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBFaXRoZXIgdGhlIHRlbXBsYXRlIGlzIG1hcmtlZCBpbmxpbmUgb3Igd2UgZmFpbGVkIHRvIGZpbmQgdGhlIG9yaWdpbmFsIGV4dGVybmFsIHRlbXBsYXRlLlxuICAgIC8vIFNvIGp1c3QgdXNlIHRoZSBsaXRlcmFsIHN0cmluZyBmcm9tIHRoZSBwYXJ0aWFsbHkgY29tcGlsZWQgY29tcG9uZW50IGRlY2xhcmF0aW9uLlxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlRnJvbVBhcnRpYWxDb2RlKHRlbXBsYXRlTm9kZSwgcmFuZ2UpO1xuICB9XG5cbiAgcHJpdmF0ZSB0cnlFeHRlcm5hbFRlbXBsYXRlKHJhbmdlOiBSYW5nZSk6IFRlbXBsYXRlSW5mb3xudWxsIHtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gdGhpcy5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKHNvdXJjZUZpbGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBvcyA9IHNvdXJjZUZpbGUuZ2V0T3JpZ2luYWxMb2NhdGlvbihyYW5nZS5zdGFydExpbmUsIHJhbmdlLnN0YXJ0Q29sKTtcbiAgICAvLyBPbmx5IGludGVyZXN0ZWQgaWYgdGhlIG9yaWdpbmFsIGxvY2F0aW9uIGlzIGluIGFuIFwiZXh0ZXJuYWxcIiB0ZW1wbGF0ZSBmaWxlOlxuICAgIC8vICogdGhlIGZpbGUgaXMgZGlmZmVyZW50IHRvIHRoZSBjdXJyZW50IGZpbGVcbiAgICAvLyAqIHRoZSBmaWxlIGRvZXMgbm90IGVuZCBpbiBgLmpzYCBvciBgLnRzYCAod2UgZXhwZWN0IGl0IHRvIGJlIHNvbWV0aGluZyBsaWtlIGAuaHRtbGApLlxuICAgIC8vICogdGhlIHJhbmdlIHN0YXJ0cyBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBmaWxlXG4gICAgaWYgKHBvcyA9PT0gbnVsbCB8fCBwb3MuZmlsZSA9PT0gdGhpcy5zb3VyY2VVcmwgfHwgL1xcLltqdF1zJC8udGVzdChwb3MuZmlsZSkgfHxcbiAgICAgICAgcG9zLmxpbmUgIT09IDAgfHwgcG9zLmNvbHVtbiAhPT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVDb250ZW50cyA9IHNvdXJjZUZpbGUuc291cmNlcy5maW5kKHNyYyA9PiBzcmM/LnNvdXJjZVBhdGggPT09IHBvcy5maWxlKSEuY29udGVudHM7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogdGVtcGxhdGVDb250ZW50cyxcbiAgICAgIHNvdXJjZVVybDogcG9zLmZpbGUsXG4gICAgICByYW5nZToge3N0YXJ0UG9zOiAwLCBzdGFydExpbmU6IDAsIHN0YXJ0Q29sOiAwLCBlbmRQb3M6IHRlbXBsYXRlQ29udGVudHMubGVuZ3RofSxcbiAgICAgIGlzRXNjYXBlZDogZmFsc2UsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdGVtcGxhdGVGcm9tUGFydGlhbENvZGUoXG4gICAgICB0ZW1wbGF0ZU5vZGU6IEFzdFZhbHVlPHVua25vd24sIFRFeHByZXNzaW9uPixcbiAgICAgIHtzdGFydFBvcywgZW5kUG9zLCBzdGFydExpbmUsIHN0YXJ0Q29sfTogUmFuZ2UpOiBUZW1wbGF0ZUluZm8ge1xuICAgIGlmICghL1tcIidgXS8udGVzdCh0aGlzLmNvZGVbc3RhcnRQb3NdKSB8fCB0aGlzLmNvZGVbc3RhcnRQb3NdICE9PSB0aGlzLmNvZGVbZW5kUG9zIC0gMV0pIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICAgIHRlbXBsYXRlTm9kZS5leHByZXNzaW9uLFxuICAgICAgICAgIGBFeHBlY3RlZCB0aGUgdGVtcGxhdGUgc3RyaW5nIHRvIGJlIHdyYXBwZWQgaW4gcXVvdGVzIGJ1dCBnb3Q6ICR7XG4gICAgICAgICAgICAgIHRoaXMuY29kZS5zdWJzdHJpbmcoc3RhcnRQb3MsIGVuZFBvcyl9YCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiB0aGlzLmNvZGUsXG4gICAgICBzb3VyY2VVcmw6IHRoaXMuc291cmNlVXJsLFxuICAgICAgcmFuZ2U6IHtzdGFydFBvczogc3RhcnRQb3MgKyAxLCBlbmRQb3M6IGVuZFBvcyAtIDEsIHN0YXJ0TGluZSwgc3RhcnRDb2w6IHN0YXJ0Q29sICsgMX0sXG4gICAgICBpc0VzY2FwZWQ6IHRydWUsXG4gICAgfTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgVGVtcGxhdGVJbmZvIHtcbiAgY29kZTogc3RyaW5nO1xuICBzb3VyY2VVcmw6IHN0cmluZztcbiAgcmFuZ2U6IFJhbmdlO1xuICBpc0VzY2FwZWQ6IGJvb2xlYW47XG59XG5cbi8qKlxuICogRXh0cmFjdCBhbiBgSW50ZXJwb2xhdGlvbkNvbmZpZ2AgZnJvbSB0aGUgY29tcG9uZW50IGRlY2xhcmF0aW9uLlxuICovXG5mdW5jdGlvbiBwYXJzZUludGVycG9sYXRpb25Db25maWc8VEV4cHJlc3Npb24+KFxuICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM0RlY2xhcmVDb21wb25lbnRNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTogSW50ZXJwb2xhdGlvbkNvbmZpZyB7XG4gIGlmICghbWV0YU9iai5oYXMoJ2ludGVycG9sYXRpb24nKSkge1xuICAgIHJldHVybiBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHO1xuICB9XG5cbiAgY29uc3QgaW50ZXJwb2xhdGlvbkV4cHIgPSBtZXRhT2JqLmdldFZhbHVlKCdpbnRlcnBvbGF0aW9uJyk7XG4gIGNvbnN0IHZhbHVlcyA9IGludGVycG9sYXRpb25FeHByLmdldEFycmF5KCkubWFwKGVudHJ5ID0+IGVudHJ5LmdldFN0cmluZygpKTtcbiAgaWYgKHZhbHVlcy5sZW5ndGggIT09IDIpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgaW50ZXJwb2xhdGlvbkV4cHIuZXhwcmVzc2lvbixcbiAgICAgICAgJ1Vuc3VwcG9ydGVkIGludGVycG9sYXRpb24gY29uZmlnLCBleHBlY3RlZCBhbiBhcnJheSBjb250YWluaW5nIGV4YWN0bHkgdHdvIHN0cmluZ3MnKTtcbiAgfVxuICByZXR1cm4gSW50ZXJwb2xhdGlvbkNvbmZpZy5mcm9tQXJyYXkodmFsdWVzIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgdGhlIGBWaWV3RW5jYXBzdWxhdGlvbmAgbW9kZSBmcm9tIHRoZSBBU1QgdmFsdWUncyBzeW1ib2wgbmFtZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VFbmNhcHN1bGF0aW9uPFRFeHByZXNzaW9uPihlbmNhcHN1bGF0aW9uOiBBc3RWYWx1ZTxWaWV3RW5jYXBzdWxhdGlvbiwgVEV4cHJlc3Npb24+KTpcbiAgICBWaWV3RW5jYXBzdWxhdGlvbiB7XG4gIGNvbnN0IHN5bWJvbE5hbWUgPSBlbmNhcHN1bGF0aW9uLmdldFN5bWJvbE5hbWUoKTtcbiAgaWYgKHN5bWJvbE5hbWUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgZW5jYXBzdWxhdGlvbi5leHByZXNzaW9uLCAnRXhwZWN0ZWQgZW5jYXBzdWxhdGlvbiB0byBoYXZlIGEgc3ltYm9sIG5hbWUnKTtcbiAgfVxuICBjb25zdCBlbnVtVmFsdWUgPSBWaWV3RW5jYXBzdWxhdGlvbltzeW1ib2xOYW1lIGFzIGtleW9mIHR5cGVvZiBWaWV3RW5jYXBzdWxhdGlvbl07XG4gIGlmIChlbnVtVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKGVuY2Fwc3VsYXRpb24uZXhwcmVzc2lvbiwgJ1Vuc3VwcG9ydGVkIGVuY2Fwc3VsYXRpb24nKTtcbiAgfVxuICByZXR1cm4gZW51bVZhbHVlO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgdGhlIGBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneWAgZnJvbSB0aGUgQVNUIHZhbHVlJ3Mgc3ltYm9sIG5hbWUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3k8VEV4cHJlc3Npb24+KFxuICAgIGNoYW5nZURldGVjdGlvblN0cmF0ZWd5OiBBc3RWYWx1ZTxDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgVEV4cHJlc3Npb24+KTpcbiAgICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSB7XG4gIGNvbnN0IHN5bWJvbE5hbWUgPSBjaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5nZXRTeW1ib2xOYW1lKCk7XG4gIGlmIChzeW1ib2xOYW1lID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgIGNoYW5nZURldGVjdGlvblN0cmF0ZWd5LmV4cHJlc3Npb24sXG4gICAgICAgICdFeHBlY3RlZCBjaGFuZ2UgZGV0ZWN0aW9uIHN0cmF0ZWd5IHRvIGhhdmUgYSBzeW1ib2wgbmFtZScpO1xuICB9XG4gIGNvbnN0IGVudW1WYWx1ZSA9IENoYW5nZURldGVjdGlvblN0cmF0ZWd5W3N5bWJvbE5hbWUgYXMga2V5b2YgdHlwZW9mIENoYW5nZURldGVjdGlvblN0cmF0ZWd5XTtcbiAgaWYgKGVudW1WYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgIGNoYW5nZURldGVjdGlvblN0cmF0ZWd5LmV4cHJlc3Npb24sICdVbnN1cHBvcnRlZCBjaGFuZ2UgZGV0ZWN0aW9uIHN0cmF0ZWd5Jyk7XG4gIH1cbiAgcmV0dXJuIGVudW1WYWx1ZTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IHRoZSB0eXBlIHJlZmVyZW5jZSBleHByZXNzaW9uIGZyb20gYSBgZm9yd2FyZFJlZmAgZnVuY3Rpb24gY2FsbC4gRm9yIGV4YW1wbGUsIHRoZVxuICogZXhwcmVzc2lvbiBgZm9yd2FyZFJlZihmdW5jdGlvbigpIHsgcmV0dXJuIEZvb0RpcjsgfSlgIHJldHVybnMgYEZvb0RpcmAuIE5vdGUgdGhhdCB0aGlzXG4gKiBleHByZXNzaW9uIGlzIHJlcXVpcmVkIHRvIGJlIHdyYXBwZWQgaW4gYSBjbG9zdXJlLCBhcyBvdGhlcndpc2UgdGhlIGZvcndhcmQgcmVmZXJlbmNlIHdvdWxkIGJlXG4gKiByZXNvbHZlZCBiZWZvcmUgaW5pdGlhbGl6YXRpb24uXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RGb3J3YXJkUmVmPFRFeHByZXNzaW9uPihleHByOiBBc3RWYWx1ZTx1bmtub3duLCBURXhwcmVzc2lvbj4pOlxuICAgIG8uV3JhcHBlZE5vZGVFeHByPFRFeHByZXNzaW9uPnxudWxsIHtcbiAgaWYgKCFleHByLmlzQ2FsbEV4cHJlc3Npb24oKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgY2FsbGVlID0gZXhwci5nZXRDYWxsZWUoKTtcbiAgaWYgKGNhbGxlZS5nZXRTeW1ib2xOYW1lKCkgIT09ICdmb3J3YXJkUmVmJykge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBjYWxsZWUuZXhwcmVzc2lvbiwgJ1Vuc3VwcG9ydGVkIGRpcmVjdGl2ZSB0eXBlLCBleHBlY3RlZCBmb3J3YXJkUmVmIG9yIGEgdHlwZSByZWZlcmVuY2UnKTtcbiAgfVxuXG4gIGNvbnN0IGFyZ3MgPSBleHByLmdldEFyZ3VtZW50cygpO1xuICBpZiAoYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihleHByLCAnVW5zdXBwb3J0ZWQgZm9yd2FyZFJlZiBjYWxsLCBleHBlY3RlZCBhIHNpbmdsZSBhcmd1bWVudCcpO1xuICB9XG5cbiAgY29uc3Qgd3JhcHBlckZuID0gYXJnc1swXSBhcyBBc3RWYWx1ZTxGdW5jdGlvbiwgVEV4cHJlc3Npb24+O1xuICBpZiAoIXdyYXBwZXJGbi5pc0Z1bmN0aW9uKCkpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgd3JhcHBlckZuLCAnVW5zdXBwb3J0ZWQgZm9yd2FyZFJlZiBjYWxsLCBleHBlY3RlZCBhIGZ1bmN0aW9uIGFyZ3VtZW50Jyk7XG4gIH1cblxuICByZXR1cm4gd3JhcHBlckZuLmdldEZ1bmN0aW9uUmV0dXJuVmFsdWUoKS5nZXRPcGFxdWUoKTtcbn1cbiJdfQ==