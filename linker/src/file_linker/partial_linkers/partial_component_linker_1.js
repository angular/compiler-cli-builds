(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/core", "@angular/compiler-cli/linker/src/fatal_linker_error", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/util"], factory);
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
    var util_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/util");
    /**
     * A `PartialLinker` that is designed to process `ɵɵngDeclareComponent()` call expressions.
     */
    var PartialComponentLinkerVersion1 = /** @class */ (function () {
        function PartialComponentLinkerVersion1(getSourceFile, sourceUrl, code) {
            this.getSourceFile = getSourceFile;
            this.sourceUrl = sourceUrl;
            this.code = code;
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
            var template = compiler_1.parseTemplate(templateInfo.code, templateInfo.sourceUrl, {
                escapedString: templateInfo.isEscaped,
                interpolationConfig: interpolation,
                range: templateInfo.range,
                enableI18nLegacyMessageIdFormat: false,
                preserveWhitespaces: metaObj.has('preserveWhitespaces') ? metaObj.getBoolean('preserveWhitespaces') : false,
                // We normalize line endings if the template is was inline.
                i18nNormalizeLineEndingsInICUs: isInline,
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
                    var _a = util_1.extractForwardRef(type), typeExpr = _a.expression, forwardRef = _a.forwardRef;
                    if (forwardRef === 2 /* Unwrapped */) {
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
                    var _a = util_1.extractForwardRef(pipe), pipeType = _a.expression, forwardRef = _a.forwardRef;
                    if (forwardRef === 2 /* Unwrapped */) {
                        declarationListEmitMode = 1 /* Closure */;
                    }
                    return pipeType;
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
                    core_1.ChangeDetectionStrategy.Default, animations: metaObj.has('animations') ? metaObj.getOpaque('animations') : null, relativeContextFilePath: this.sourceUrl, i18nUseExternalIds: false, pipes: pipes, directives: directives });
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErVTtJQUMvVSxtREFBc0Y7SUFNdEYsMEZBQTBEO0lBRzFELHNJQUErRDtJQUUvRCwwRkFBeUM7SUFFekM7O09BRUc7SUFDSDtRQUVFLHdDQUNxQixhQUE4QixFQUFVLFNBQXlCLEVBQzFFLElBQVk7WUFESCxrQkFBYSxHQUFiLGFBQWEsQ0FBaUI7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRSxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQUcsQ0FBQztRQUU1QiwrREFBc0IsR0FBdEIsVUFDSSxZQUEwQixFQUMxQixPQUFxRDtZQUN2RCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0MsSUFBTSxHQUFHLEdBQUcsdUNBQTRCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSw0QkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDbEYsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ3hCLENBQUM7UUFFRDs7V0FFRztRQUNLLDBEQUFpQixHQUF6QixVQUEwQixPQUEyRDtZQUVuRixJQUFNLGFBQWEsR0FBRyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4RCxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BELElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxV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QUksVUFBVSxLQUFLLElBQUksRUFBRTtZQUN2QixNQUFNLElBQUkscUNBQWdCLENBQ3RCLHVCQUF1QixDQUFDLFVBQVUsRUFDbEMsMERBQTBELENBQUMsQ0FBQztTQUNqRTtRQUNELElBQU0sU0FBUyxHQUFHLDhCQUF1QixDQUFDLFVBQWtELENBQUMsQ0FBQztRQUM5RixJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUU7WUFDM0IsTUFBTSxJQUFJLHFDQUFnQixDQUN0Qix1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsdUNBQXVDLENBQUMsQ0FBQztTQUNsRjtRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgQ29uc3RhbnRQb29sLCBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSwgREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRywgRm9yd2FyZFJlZkhhbmRsaW5nLCBJbnRlcnBvbGF0aW9uQ29uZmlnLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZSwgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNEZWNsYXJlQ29tcG9uZW50TWV0YWRhdGEsIFIzRGVjbGFyZVVzZWREaXJlY3RpdmVNZXRhZGF0YSwgUjNQYXJ0aWFsRGVjbGFyYXRpb24sIFIzVXNlZERpcmVjdGl2ZU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0NoYW5nZURldGVjdGlvblN0cmF0ZWd5LCBWaWV3RW5jYXBzdWxhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NvcmUnO1xuaW1wb3J0ICogYXMgbyBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvb3V0cHV0L291dHB1dF9hc3QnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSYW5nZX0gZnJvbSAnLi4vLi4vYXN0L2FzdF9ob3N0JztcbmltcG9ydCB7QXN0T2JqZWN0LCBBc3RWYWx1ZX0gZnJvbSAnLi4vLi4vYXN0L2FzdF92YWx1ZSc7XG5pbXBvcnQge0ZhdGFsTGlua2VyRXJyb3J9IGZyb20gJy4uLy4uL2ZhdGFsX2xpbmtlcl9lcnJvcic7XG5pbXBvcnQge0dldFNvdXJjZUZpbGVGbn0gZnJvbSAnLi4vZ2V0X3NvdXJjZV9maWxlJztcblxuaW1wb3J0IHt0b1IzRGlyZWN0aXZlTWV0YX0gZnJvbSAnLi9wYXJ0aWFsX2RpcmVjdGl2ZV9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxMaW5rZXJ9IGZyb20gJy4vcGFydGlhbF9saW5rZXInO1xuaW1wb3J0IHtleHRyYWN0Rm9yd2FyZFJlZn0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBBIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGlzIGRlc2lnbmVkIHRvIHByb2Nlc3MgYMm1ybVuZ0RlY2xhcmVDb21wb25lbnQoKWAgY2FsbCBleHByZXNzaW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMTxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4gaW1wbGVtZW50c1xuICAgIFBhcnRpYWxMaW5rZXI8VEV4cHJlc3Npb24+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGdldFNvdXJjZUZpbGU6IEdldFNvdXJjZUZpbGVGbiwgcHJpdmF0ZSBzb3VyY2VVcmw6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJpdmF0ZSBjb2RlOiBzdHJpbmcpIHt9XG5cbiAgbGlua1BhcnRpYWxEZWNsYXJhdGlvbihcbiAgICAgIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sLFxuICAgICAgbWV0YU9iajogQXN0T2JqZWN0PFIzUGFydGlhbERlY2xhcmF0aW9uLCBURXhwcmVzc2lvbj4pOiBvLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLnRvUjNDb21wb25lbnRNZXRhKG1ldGFPYmopO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgY29uc3RhbnRQb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICByZXR1cm4gZGVmLmV4cHJlc3Npb247XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBmdW5jdGlvbiBkZXJpdmVzIHRoZSBgUjNDb21wb25lbnRNZXRhZGF0YWAgZnJvbSB0aGUgcHJvdmlkZWQgQVNUIG9iamVjdC5cbiAgICovXG4gIHByaXZhdGUgdG9SM0NvbXBvbmVudE1ldGEobWV0YU9iajogQXN0T2JqZWN0PFIzRGVjbGFyZUNvbXBvbmVudE1ldGFkYXRhLCBURXhwcmVzc2lvbj4pOlxuICAgICAgUjNDb21wb25lbnRNZXRhZGF0YSB7XG4gICAgY29uc3QgaW50ZXJwb2xhdGlvbiA9IHBhcnNlSW50ZXJwb2xhdGlvbkNvbmZpZyhtZXRhT2JqKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IG1ldGFPYmouZ2V0VmFsdWUoJ3RlbXBsYXRlJyk7XG4gICAgY29uc3QgaXNJbmxpbmUgPSBtZXRhT2JqLmhhcygnaXNJbmxpbmUnKSA/IG1ldGFPYmouZ2V0Qm9vbGVhbignaXNJbmxpbmUnKSA6IGZhbHNlO1xuICAgIGNvbnN0IHRlbXBsYXRlSW5mbyA9IHRoaXMuZ2V0VGVtcGxhdGVJbmZvKHRlbXBsYXRlU291cmNlLCBpc0lubGluZSk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUodGVtcGxhdGVJbmZvLmNvZGUsIHRlbXBsYXRlSW5mby5zb3VyY2VVcmwsIHtcbiAgICAgIGVzY2FwZWRTdHJpbmc6IHRlbXBsYXRlSW5mby5pc0VzY2FwZWQsXG4gICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnOiBpbnRlcnBvbGF0aW9uLFxuICAgICAgcmFuZ2U6IHRlbXBsYXRlSW5mby5yYW5nZSxcbiAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IGZhbHNlLFxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczpcbiAgICAgICAgICBtZXRhT2JqLmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpID8gbWV0YU9iai5nZXRCb29sZWFuKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykgOiBmYWxzZSxcbiAgICAgIC8vIFdlIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGlzIHdhcyBpbmxpbmUuXG4gICAgICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM6IGlzSW5saW5lLFxuICAgIH0pO1xuICAgIGlmICh0ZW1wbGF0ZS5lcnJvcnMgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGVycm9ycyA9IHRlbXBsYXRlLmVycm9ycy5tYXAoZXJyID0+IGVyci50b1N0cmluZygpKS5qb2luKCdcXG4nKTtcbiAgICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICAgIHRlbXBsYXRlU291cmNlLmV4cHJlc3Npb24sIGBFcnJvcnMgZm91bmQgaW4gdGhlIHRlbXBsYXRlOlxcbiR7ZXJyb3JzfWApO1xuICAgIH1cblxuICAgIGxldCBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSA9IERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkRpcmVjdDtcblxuICAgIGNvbnN0IGNvbGxlY3RVc2VkRGlyZWN0aXZlcyA9XG4gICAgICAgIChkaXJlY3RpdmVzOiBBc3RWYWx1ZTxSM0RlY2xhcmVVc2VkRGlyZWN0aXZlTWV0YWRhdGEsIFRFeHByZXNzaW9uPltdKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRpcmVjdGl2ZXMubWFwKGRpcmVjdGl2ZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmVFeHByID0gZGlyZWN0aXZlLmdldE9iamVjdCgpO1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGRpcmVjdGl2ZUV4cHIuZ2V0VmFsdWUoJ3R5cGUnKTtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gZGlyZWN0aXZlRXhwci5nZXRTdHJpbmcoJ3NlbGVjdG9yJyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHtleHByZXNzaW9uOiB0eXBlRXhwciwgZm9yd2FyZFJlZn0gPSBleHRyYWN0Rm9yd2FyZFJlZih0eXBlKTtcbiAgICAgICAgICAgIGlmIChmb3J3YXJkUmVmID09PSBGb3J3YXJkUmVmSGFuZGxpbmcuVW53cmFwcGVkKSB7XG4gICAgICAgICAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlID0gRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuQ2xvc3VyZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdHlwZTogdHlwZUV4cHIsXG4gICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICAgICAgaW5wdXRzOiBkaXJlY3RpdmVFeHByLmhhcygnaW5wdXRzJykgP1xuICAgICAgICAgICAgICAgICAgZGlyZWN0aXZlRXhwci5nZXRBcnJheSgnaW5wdXRzJykubWFwKGlucHV0ID0+IGlucHV0LmdldFN0cmluZygpKSA6XG4gICAgICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICAgICAgb3V0cHV0czogZGlyZWN0aXZlRXhwci5oYXMoJ291dHB1dHMnKSA/XG4gICAgICAgICAgICAgICAgICBkaXJlY3RpdmVFeHByLmdldEFycmF5KCdvdXRwdXRzJykubWFwKGlucHV0ID0+IGlucHV0LmdldFN0cmluZygpKSA6XG4gICAgICAgICAgICAgICAgICBbXSxcbiAgICAgICAgICAgICAgZXhwb3J0QXM6IGRpcmVjdGl2ZUV4cHIuaGFzKCdleHBvcnRBcycpID9cbiAgICAgICAgICAgICAgICAgIGRpcmVjdGl2ZUV4cHIuZ2V0QXJyYXkoJ2V4cG9ydEFzJykubWFwKGV4cG9ydEFzID0+IGV4cG9ydEFzLmdldFN0cmluZygpKSA6XG4gICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIGxldCBkaXJlY3RpdmVzOiBSM1VzZWREaXJlY3RpdmVNZXRhZGF0YVtdID0gW107XG4gICAgaWYgKG1ldGFPYmouaGFzKCdjb21wb25lbnRzJykpIHtcbiAgICAgIGRpcmVjdGl2ZXMucHVzaCguLi5jb2xsZWN0VXNlZERpcmVjdGl2ZXMobWV0YU9iai5nZXRBcnJheSgnY29tcG9uZW50cycpKSk7XG4gICAgfVxuICAgIGlmIChtZXRhT2JqLmhhcygnZGlyZWN0aXZlcycpKSB7XG4gICAgICBkaXJlY3RpdmVzLnB1c2goLi4uY29sbGVjdFVzZWREaXJlY3RpdmVzKG1ldGFPYmouZ2V0QXJyYXkoJ2RpcmVjdGl2ZXMnKSkpO1xuICAgIH1cblxuICAgIGxldCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBvLkV4cHJlc3Npb24+KCk7XG4gICAgaWYgKG1ldGFPYmouaGFzKCdwaXBlcycpKSB7XG4gICAgICBwaXBlcyA9IG1ldGFPYmouZ2V0T2JqZWN0KCdwaXBlcycpLnRvTWFwKHBpcGUgPT4ge1xuICAgICAgICBjb25zdCB7ZXhwcmVzc2lvbjogcGlwZVR5cGUsIGZvcndhcmRSZWZ9ID0gZXh0cmFjdEZvcndhcmRSZWYocGlwZSk7XG4gICAgICAgIGlmIChmb3J3YXJkUmVmID09PSBGb3J3YXJkUmVmSGFuZGxpbmcuVW53cmFwcGVkKSB7XG4gICAgICAgICAgZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUgPSBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZS5DbG9zdXJlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwaXBlVHlwZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAuLi50b1IzRGlyZWN0aXZlTWV0YShtZXRhT2JqLCB0aGlzLmNvZGUsIHRoaXMuc291cmNlVXJsKSxcbiAgICAgIHZpZXdQcm92aWRlcnM6IG1ldGFPYmouaGFzKCd2aWV3UHJvdmlkZXJzJykgPyBtZXRhT2JqLmdldE9wYXF1ZSgndmlld1Byb3ZpZGVycycpIDogbnVsbCxcbiAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgIG5vZGVzOiB0ZW1wbGF0ZS5ub2RlcyxcbiAgICAgICAgbmdDb250ZW50U2VsZWN0b3JzOiB0ZW1wbGF0ZS5uZ0NvbnRlbnRTZWxlY3RvcnMsXG4gICAgICB9LFxuICAgICAgZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUsXG4gICAgICBzdHlsZXM6IG1ldGFPYmouaGFzKCdzdHlsZXMnKSA/IG1ldGFPYmouZ2V0QXJyYXkoJ3N0eWxlcycpLm1hcChlbnRyeSA9PiBlbnRyeS5nZXRTdHJpbmcoKSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbXSxcbiAgICAgIGVuY2Fwc3VsYXRpb246IG1ldGFPYmouaGFzKCdlbmNhcHN1bGF0aW9uJykgP1xuICAgICAgICAgIHBhcnNlRW5jYXBzdWxhdGlvbihtZXRhT2JqLmdldFZhbHVlKCdlbmNhcHN1bGF0aW9uJykpIDpcbiAgICAgICAgICBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZCxcbiAgICAgIGludGVycG9sYXRpb24sXG4gICAgICBjaGFuZ2VEZXRlY3Rpb246IG1ldGFPYmouaGFzKCdjaGFuZ2VEZXRlY3Rpb24nKSA/XG4gICAgICAgICAgcGFyc2VDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneShtZXRhT2JqLmdldFZhbHVlKCdjaGFuZ2VEZXRlY3Rpb24nKSkgOlxuICAgICAgICAgIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LkRlZmF1bHQsXG4gICAgICBhbmltYXRpb25zOiBtZXRhT2JqLmhhcygnYW5pbWF0aW9ucycpID8gbWV0YU9iai5nZXRPcGFxdWUoJ2FuaW1hdGlvbnMnKSA6IG51bGwsXG4gICAgICByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aDogdGhpcy5zb3VyY2VVcmwsXG4gICAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IGZhbHNlLFxuICAgICAgcGlwZXMsXG4gICAgICBkaXJlY3RpdmVzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSByYW5nZSB0byByZW1vdmUgdGhlIHN0YXJ0IGFuZCBlbmQgY2hhcnMsIHdoaWNoIHNob3VsZCBiZSBxdW90ZXMgYXJvdW5kIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVJbmZvKHRlbXBsYXRlTm9kZTogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+LCBpc0lubGluZTogYm9vbGVhbik6XG4gICAgICBUZW1wbGF0ZUluZm8ge1xuICAgIGNvbnN0IHJhbmdlID0gdGVtcGxhdGVOb2RlLmdldFJhbmdlKCk7XG5cbiAgICBpZiAoIWlzSW5saW5lKSB7XG4gICAgICAvLyBJZiBub3QgbWFya2VkIGFzIGlubGluZSwgdGhlbiB3ZSB0cnkgdG8gZ2V0IHRoZSB0ZW1wbGF0ZSBpbmZvIGZyb20gdGhlIG9yaWdpbmFsIGV4dGVybmFsXG4gICAgICAvLyB0ZW1wbGF0ZSBmaWxlLCB2aWEgc291cmNlLW1hcHBpbmcuXG4gICAgICBjb25zdCBleHRlcm5hbFRlbXBsYXRlID0gdGhpcy50cnlFeHRlcm5hbFRlbXBsYXRlKHJhbmdlKTtcbiAgICAgIGlmIChleHRlcm5hbFRlbXBsYXRlICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBleHRlcm5hbFRlbXBsYXRlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEVpdGhlciB0aGUgdGVtcGxhdGUgaXMgbWFya2VkIGlubGluZSBvciB3ZSBmYWlsZWQgdG8gZmluZCB0aGUgb3JpZ2luYWwgZXh0ZXJuYWwgdGVtcGxhdGUuXG4gICAgLy8gU28ganVzdCB1c2UgdGhlIGxpdGVyYWwgc3RyaW5nIGZyb20gdGhlIHBhcnRpYWxseSBjb21waWxlZCBjb21wb25lbnQgZGVjbGFyYXRpb24uXG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVGcm9tUGFydGlhbENvZGUodGVtcGxhdGVOb2RlLCByYW5nZSk7XG4gIH1cblxuICBwcml2YXRlIHRyeUV4dGVybmFsVGVtcGxhdGUocmFuZ2U6IFJhbmdlKTogVGVtcGxhdGVJbmZvfG51bGwge1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0aGlzLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoc291cmNlRmlsZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zID0gc291cmNlRmlsZS5nZXRPcmlnaW5hbExvY2F0aW9uKHJhbmdlLnN0YXJ0TGluZSwgcmFuZ2Uuc3RhcnRDb2wpO1xuICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpZiB0aGUgb3JpZ2luYWwgbG9jYXRpb24gaXMgaW4gYW4gXCJleHRlcm5hbFwiIHRlbXBsYXRlIGZpbGU6XG4gICAgLy8gKiB0aGUgZmlsZSBpcyBkaWZmZXJlbnQgdG8gdGhlIGN1cnJlbnQgZmlsZVxuICAgIC8vICogdGhlIGZpbGUgZG9lcyBub3QgZW5kIGluIGAuanNgIG9yIGAudHNgICh3ZSBleHBlY3QgaXQgdG8gYmUgc29tZXRoaW5nIGxpa2UgYC5odG1sYCkuXG4gICAgLy8gKiB0aGUgcmFuZ2Ugc3RhcnRzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGVcbiAgICBpZiAocG9zID09PSBudWxsIHx8IHBvcy5maWxlID09PSB0aGlzLnNvdXJjZVVybCB8fCAvXFwuW2p0XXMkLy50ZXN0KHBvcy5maWxlKSB8fFxuICAgICAgICBwb3MubGluZSAhPT0gMCB8fCBwb3MuY29sdW1uICE9PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUNvbnRlbnRzID0gc291cmNlRmlsZS5zb3VyY2VzLmZpbmQoc3JjID0+IHNyYz8uc291cmNlUGF0aCA9PT0gcG9zLmZpbGUpIS5jb250ZW50cztcblxuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiB0ZW1wbGF0ZUNvbnRlbnRzLFxuICAgICAgc291cmNlVXJsOiBwb3MuZmlsZSxcbiAgICAgIHJhbmdlOiB7c3RhcnRQb3M6IDAsIHN0YXJ0TGluZTogMCwgc3RhcnRDb2w6IDAsIGVuZFBvczogdGVtcGxhdGVDb250ZW50cy5sZW5ndGh9LFxuICAgICAgaXNFc2NhcGVkOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUZyb21QYXJ0aWFsQ29kZShcbiAgICAgIHRlbXBsYXRlTm9kZTogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+LFxuICAgICAge3N0YXJ0UG9zLCBlbmRQb3MsIHN0YXJ0TGluZSwgc3RhcnRDb2x9OiBSYW5nZSk6IFRlbXBsYXRlSW5mbyB7XG4gICAgaWYgKCEvW1wiJ2BdLy50ZXN0KHRoaXMuY29kZVtzdGFydFBvc10pIHx8IHRoaXMuY29kZVtzdGFydFBvc10gIT09IHRoaXMuY29kZVtlbmRQb3MgLSAxXSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgICAgdGVtcGxhdGVOb2RlLmV4cHJlc3Npb24sXG4gICAgICAgICAgYEV4cGVjdGVkIHRoZSB0ZW1wbGF0ZSBzdHJpbmcgdG8gYmUgd3JhcHBlZCBpbiBxdW90ZXMgYnV0IGdvdDogJHtcbiAgICAgICAgICAgICAgdGhpcy5jb2RlLnN1YnN0cmluZyhzdGFydFBvcywgZW5kUG9zKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IHRoaXMuY29kZSxcbiAgICAgIHNvdXJjZVVybDogdGhpcy5zb3VyY2VVcmwsXG4gICAgICByYW5nZToge3N0YXJ0UG9zOiBzdGFydFBvcyArIDEsIGVuZFBvczogZW5kUG9zIC0gMSwgc3RhcnRMaW5lLCBzdGFydENvbDogc3RhcnRDb2wgKyAxfSxcbiAgICAgIGlzRXNjYXBlZDogdHJ1ZSxcbiAgICB9O1xuICB9XG59XG5cbmludGVyZmFjZSBUZW1wbGF0ZUluZm8ge1xuICBjb2RlOiBzdHJpbmc7XG4gIHNvdXJjZVVybDogc3RyaW5nO1xuICByYW5nZTogUmFuZ2U7XG4gIGlzRXNjYXBlZDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGFuIGBJbnRlcnBvbGF0aW9uQ29uZmlnYCBmcm9tIHRoZSBjb21wb25lbnQgZGVjbGFyYXRpb24uXG4gKi9cbmZ1bmN0aW9uIHBhcnNlSW50ZXJwb2xhdGlvbkNvbmZpZzxURXhwcmVzc2lvbj4oXG4gICAgbWV0YU9iajogQXN0T2JqZWN0PFIzRGVjbGFyZUNvbXBvbmVudE1ldGFkYXRhLCBURXhwcmVzc2lvbj4pOiBJbnRlcnBvbGF0aW9uQ29uZmlnIHtcbiAgaWYgKCFtZXRhT2JqLmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgcmV0dXJuIERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUc7XG4gIH1cblxuICBjb25zdCBpbnRlcnBvbGF0aW9uRXhwciA9IG1ldGFPYmouZ2V0VmFsdWUoJ2ludGVycG9sYXRpb24nKTtcbiAgY29uc3QgdmFsdWVzID0gaW50ZXJwb2xhdGlvbkV4cHIuZ2V0QXJyYXkoKS5tYXAoZW50cnkgPT4gZW50cnkuZ2V0U3RyaW5nKCkpO1xuICBpZiAodmFsdWVzLmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBpbnRlcnBvbGF0aW9uRXhwci5leHByZXNzaW9uLFxuICAgICAgICAnVW5zdXBwb3J0ZWQgaW50ZXJwb2xhdGlvbiBjb25maWcsIGV4cGVjdGVkIGFuIGFycmF5IGNvbnRhaW5pbmcgZXhhY3RseSB0d28gc3RyaW5ncycpO1xuICB9XG4gIHJldHVybiBJbnRlcnBvbGF0aW9uQ29uZmlnLmZyb21BcnJheSh2YWx1ZXMgYXMgW3N0cmluZywgc3RyaW5nXSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgYFZpZXdFbmNhcHN1bGF0aW9uYCBtb2RlIGZyb20gdGhlIEFTVCB2YWx1ZSdzIHN5bWJvbCBuYW1lLlxuICovXG5mdW5jdGlvbiBwYXJzZUVuY2Fwc3VsYXRpb248VEV4cHJlc3Npb24+KGVuY2Fwc3VsYXRpb246IEFzdFZhbHVlPFZpZXdFbmNhcHN1bGF0aW9uLCBURXhwcmVzc2lvbj4pOlxuICAgIFZpZXdFbmNhcHN1bGF0aW9uIHtcbiAgY29uc3Qgc3ltYm9sTmFtZSA9IGVuY2Fwc3VsYXRpb24uZ2V0U3ltYm9sTmFtZSgpO1xuICBpZiAoc3ltYm9sTmFtZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBlbmNhcHN1bGF0aW9uLmV4cHJlc3Npb24sICdFeHBlY3RlZCBlbmNhcHN1bGF0aW9uIHRvIGhhdmUgYSBzeW1ib2wgbmFtZScpO1xuICB9XG4gIGNvbnN0IGVudW1WYWx1ZSA9IFZpZXdFbmNhcHN1bGF0aW9uW3N5bWJvbE5hbWUgYXMga2V5b2YgdHlwZW9mIFZpZXdFbmNhcHN1bGF0aW9uXTtcbiAgaWYgKGVudW1WYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoZW5jYXBzdWxhdGlvbi5leHByZXNzaW9uLCAnVW5zdXBwb3J0ZWQgZW5jYXBzdWxhdGlvbicpO1xuICB9XG4gIHJldHVybiBlbnVtVmFsdWU7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgYENoYW5nZURldGVjdGlvblN0cmF0ZWd5YCBmcm9tIHRoZSBBU1QgdmFsdWUncyBzeW1ib2wgbmFtZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneTxURXhwcmVzc2lvbj4oXG4gICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3k6IEFzdFZhbHVlPENoYW5nZURldGVjdGlvblN0cmF0ZWd5LCBURXhwcmVzc2lvbj4pOlxuICAgIENoYW5nZURldGVjdGlvblN0cmF0ZWd5IHtcbiAgY29uc3Qgc3ltYm9sTmFtZSA9IGNoYW5nZURldGVjdGlvblN0cmF0ZWd5LmdldFN5bWJvbE5hbWUoKTtcbiAgaWYgKHN5bWJvbE5hbWUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuZXhwcmVzc2lvbixcbiAgICAgICAgJ0V4cGVjdGVkIGNoYW5nZSBkZXRlY3Rpb24gc3RyYXRlZ3kgdG8gaGF2ZSBhIHN5bWJvbCBuYW1lJyk7XG4gIH1cbiAgY29uc3QgZW51bVZhbHVlID0gQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3lbc3ltYm9sTmFtZSBhcyBrZXlvZiB0eXBlb2YgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ldO1xuICBpZiAoZW51bVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgY2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuZXhwcmVzc2lvbiwgJ1Vuc3VwcG9ydGVkIGNoYW5nZSBkZXRlY3Rpb24gc3RyYXRlZ3knKTtcbiAgfVxuICByZXR1cm4gZW51bVZhbHVlO1xufVxuIl19