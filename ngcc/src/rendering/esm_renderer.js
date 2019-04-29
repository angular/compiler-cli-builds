(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/esm_renderer", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/host/ngcc_host", "@angular/compiler-cli/ngcc/src/rendering/renderer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var ngcc_host_1 = require("@angular/compiler-cli/ngcc/src/host/ngcc_host");
    var renderer_1 = require("@angular/compiler-cli/ngcc/src/rendering/renderer");
    var EsmRenderer = /** @class */ (function (_super) {
        tslib_1.__extends(EsmRenderer, _super);
        function EsmRenderer(fs, logger, host, isCore, bundle) {
            return _super.call(this, fs, logger, host, isCore, bundle) || this;
        }
        /**
         *  Add the imports at the top of the file
         */
        EsmRenderer.prototype.addImports = function (output, imports, sf) {
            var insertionPoint = findEndOfImports(sf);
            var renderedImports = imports.map(function (i) { return "import * as " + i.qualifier + " from '" + i.specifier + "';\n"; }).join('');
            output.appendLeft(insertionPoint, renderedImports);
        };
        EsmRenderer.prototype.addExports = function (output, entryPointBasePath, exports) {
            exports.forEach(function (e) {
                var exportFrom = '';
                var isDtsFile = typescript_1.isDtsPath(entryPointBasePath);
                var from = isDtsFile ? e.dtsFrom : e.from;
                if (from) {
                    var basePath = renderer_1.stripExtension(from);
                    var relativePath = './' + path_1.PathSegment.relative(path_1.AbsoluteFsPath.dirname(entryPointBasePath), basePath);
                    exportFrom = entryPointBasePath !== basePath ? " from '" + relativePath + "'" : '';
                }
                // aliases should only be added in dts files as these are lost when rolling up dts file.
                var exportStatement = e.alias && isDtsFile ? e.alias + " as " + e.identifier : e.identifier;
                var exportStr = "\nexport {" + exportStatement + "}" + exportFrom + ";";
                output.append(exportStr);
            });
        };
        EsmRenderer.prototype.addConstants = function (output, constants, file) {
            if (constants === '') {
                return;
            }
            var insertionPoint = findEndOfImports(file);
            // Append the constants to the right of the insertion point, to ensure they get ordered after
            // added imports (those are appended left to the insertion point).
            output.appendRight(insertionPoint, '\n' + constants + '\n');
        };
        /**
         * Add the definitions to each decorated class
         */
        EsmRenderer.prototype.addDefinitions = function (output, compiledClass, definitions) {
            var classSymbol = this.host.getClassSymbol(compiledClass.declaration);
            if (!classSymbol) {
                throw new Error("Compiled class does not have a valid symbol: " + compiledClass.name);
            }
            var insertionPoint = classSymbol.valueDeclaration.getEnd();
            output.appendLeft(insertionPoint, '\n' + definitions);
        };
        /**
         * Remove static decorator properties from classes
         */
        EsmRenderer.prototype.removeDecorators = function (output, decoratorsToRemove) {
            decoratorsToRemove.forEach(function (nodesToRemove, containerNode) {
                if (ts.isArrayLiteralExpression(containerNode)) {
                    var items = containerNode.elements;
                    if (items.length === nodesToRemove.length) {
                        // Remove the entire statement
                        var statement = findStatement(containerNode);
                        if (statement) {
                            output.remove(statement.getFullStart(), statement.getEnd());
                        }
                    }
                    else {
                        nodesToRemove.forEach(function (node) {
                            // remove any trailing comma
                            var end = (output.slice(node.getEnd(), node.getEnd() + 1) === ',') ?
                                node.getEnd() + 1 :
                                node.getEnd();
                            output.remove(node.getFullStart(), end);
                        });
                    }
                }
            });
        };
        EsmRenderer.prototype.rewriteSwitchableDeclarations = function (outputText, sourceFile, declarations) {
            declarations.forEach(function (declaration) {
                var start = declaration.initializer.getStart();
                var end = declaration.initializer.getEnd();
                var replacement = declaration.initializer.text.replace(ngcc_host_1.PRE_R3_MARKER, ngcc_host_1.POST_R3_MARKER);
                outputText.overwrite(start, end, replacement);
            });
        };
        return EsmRenderer;
    }(renderer_1.Renderer));
    exports.EsmRenderer = EsmRenderer;
    function findEndOfImports(sf) {
        var e_1, _a;
        try {
            for (var _b = tslib_1.__values(sf.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                var stmt = _c.value;
                if (!ts.isImportDeclaration(stmt) && !ts.isImportEqualsDeclaration(stmt) &&
                    !ts.isNamespaceImport(stmt)) {
                    return stmt.getStart();
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return 0;
    }
    function findStatement(node) {
        while (node) {
            if (ts.isExpressionStatement(node)) {
                return node;
            }
            node = node.parent;
        }
        return undefined;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtX3JlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3JlbmRlcmluZy9lc21fcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBUUEsK0JBQWlDO0lBQ2pDLDZEQUFvRTtJQUNwRSxrRkFBaUU7SUFJakUsMkVBQW1IO0lBR25ILDhFQUEyRTtJQUUzRTtRQUFpQyx1Q0FBUTtRQUN2QyxxQkFDSSxFQUFjLEVBQUUsTUFBYyxFQUFFLElBQXdCLEVBQUUsTUFBZSxFQUN6RSxNQUF3QjttQkFDMUIsa0JBQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztRQUN6QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxnQ0FBVSxHQUFWLFVBQ0ksTUFBbUIsRUFBRSxPQUFrRCxFQUN2RSxFQUFpQjtZQUNuQixJQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1QyxJQUFNLGVBQWUsR0FDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLGlCQUFlLENBQUMsQ0FBQyxTQUFTLGVBQVUsQ0FBQyxDQUFDLFNBQVMsU0FBTSxFQUFyRCxDQUFxRCxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JGLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxnQ0FBVSxHQUFWLFVBQVcsTUFBbUIsRUFBRSxrQkFBa0MsRUFBRSxPQUFxQjtZQUN2RixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQztnQkFDZixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7Z0JBQ3BCLElBQU0sU0FBUyxHQUFHLHNCQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDaEQs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QkFDcEUsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQy9CLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2lCQUN4QjthQUNGOzs7Ozs7Ozs7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFhO1FBQ2xDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUNwQjtRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtQYXRoU2VnbWVudCwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcbmltcG9ydCB7aXNEdHNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0NvbXBpbGVkQ2xhc3N9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtFeHBvcnRJbmZvfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0LCBQT1NUX1IzX01BUktFUiwgUFJFX1IzX01BUktFUiwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge1JlZHVuZGFudERlY29yYXRvck1hcCwgUmVuZGVyZXIsIHN0cmlwRXh0ZW5zaW9ufSBmcm9tICcuL3JlbmRlcmVyJztcblxuZXhwb3J0IGNsYXNzIEVzbVJlbmRlcmVyIGV4dGVuZHMgUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIGZzOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpIHtcbiAgICBzdXBlcihmcywgbG9nZ2VyLCBob3N0LCBpc0NvcmUsIGJ1bmRsZSk7XG4gIH1cblxuICAvKipcbiAgICogIEFkZCB0aGUgaW1wb3J0cyBhdCB0aGUgdG9wIG9mIHRoZSBmaWxlXG4gICAqL1xuICBhZGRJbXBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czoge3NwZWNpZmllcjogc3RyaW5nOyBxdWFsaWZpZXI6IHN0cmluZzt9W10sXG4gICAgICBzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gZmluZEVuZE9mSW1wb3J0cyhzZik7XG4gICAgY29uc3QgcmVuZGVyZWRJbXBvcnRzID1cbiAgICAgICAgaW1wb3J0cy5tYXAoaSA9PiBgaW1wb3J0ICogYXMgJHtpLnF1YWxpZmllcn0gZnJvbSAnJHtpLnNwZWNpZmllcn0nO1xcbmApLmpvaW4oJycpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCByZW5kZXJlZEltcG9ydHMpO1xuICB9XG5cbiAgYWRkRXhwb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBlbnRyeVBvaW50QmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCBleHBvcnRzOiBFeHBvcnRJbmZvW10pOiB2b2lkIHtcbiAgICBleHBvcnRzLmZvckVhY2goZSA9PiB7XG4gICAgICBsZXQgZXhwb3J0RnJvbSA9ICcnO1xuICAgICAgY29uc3QgaXNEdHNGaWxlID0gaXNEdHNQYXRoKGVudHJ5UG9pbnRCYXNlUGF0aCk7XG4gICAgICBjb25zdCBmcm9tID0gaXNEdHNGaWxlID8gZS5kdHNGcm9tIDogZS5mcm9tO1xuXG4gICAgICBpZiAoZnJvbSkge1xuICAgICAgICBjb25zdCBiYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKGZyb20pO1xuICAgICAgICBjb25zdCByZWxhdGl2ZVBhdGggPVxuICAgICAgICAgICAgJy4vJyArIFBhdGhTZWdtZW50LnJlbGF0aXZlKEFic29sdXRlRnNQYXRoLmRpcm5hbWUoZW50cnlQb2ludEJhc2VQYXRoKSwgYmFzZVBhdGgpO1xuICAgICAgICBleHBvcnRGcm9tID0gZW50cnlQb2ludEJhc2VQYXRoICE9PSBiYXNlUGF0aCA/IGAgZnJvbSAnJHtyZWxhdGl2ZVBhdGh9J2AgOiAnJztcbiAgICAgIH1cblxuICAgICAgLy8gYWxpYXNlcyBzaG91bGQgb25seSBiZSBhZGRlZCBpbiBkdHMgZmlsZXMgYXMgdGhlc2UgYXJlIGxvc3Qgd2hlbiByb2xsaW5nIHVwIGR0cyBmaWxlLlxuICAgICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gZS5hbGlhcyAmJiBpc0R0c0ZpbGUgPyBgJHtlLmFsaWFzfSBhcyAke2UuaWRlbnRpZmllcn1gIDogZS5pZGVudGlmaWVyO1xuICAgICAgY29uc3QgZXhwb3J0U3RyID0gYFxcbmV4cG9ydCB7JHtleHBvcnRTdGF0ZW1lbnR9fSR7ZXhwb3J0RnJvbX07YDtcbiAgICAgIG91dHB1dC5hcHBlbmQoZXhwb3J0U3RyKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFkZENvbnN0YW50cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb25zdGFudHM6IHN0cmluZywgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmIChjb25zdGFudHMgPT09ICcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gZmluZEVuZE9mSW1wb3J0cyhmaWxlKTtcblxuICAgIC8vIEFwcGVuZCB0aGUgY29uc3RhbnRzIHRvIHRoZSByaWdodCBvZiB0aGUgaW5zZXJ0aW9uIHBvaW50LCB0byBlbnN1cmUgdGhleSBnZXQgb3JkZXJlZCBhZnRlclxuICAgIC8vIGFkZGVkIGltcG9ydHMgKHRob3NlIGFyZSBhcHBlbmRlZCBsZWZ0IHRvIHRoZSBpbnNlcnRpb24gcG9pbnQpLlxuICAgIG91dHB1dC5hcHBlbmRSaWdodChpbnNlcnRpb25Qb2ludCwgJ1xcbicgKyBjb25zdGFudHMgKyAnXFxuJyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBkZWZpbml0aW9ucyB0byBlYWNoIGRlY29yYXRlZCBjbGFzc1xuICAgKi9cbiAgYWRkRGVmaW5pdGlvbnMob3V0cHV0OiBNYWdpY1N0cmluZywgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5ob3N0LmdldENsYXNzU3ltYm9sKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcGlsZWQgY2xhc3MgZG9lcyBub3QgaGF2ZSBhIHZhbGlkIHN5bWJvbDogJHtjb21waWxlZENsYXNzLm5hbWV9YCk7XG4gICAgfVxuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhLmdldEVuZCgpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGRlZmluaXRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgc3RhdGljIGRlY29yYXRvciBwcm9wZXJ0aWVzIGZyb20gY2xhc3Nlc1xuICAgKi9cbiAgcmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBkZWNvcmF0b3JzVG9SZW1vdmU6IFJlZHVuZGFudERlY29yYXRvck1hcCk6IHZvaWQge1xuICAgIGRlY29yYXRvcnNUb1JlbW92ZS5mb3JFYWNoKChub2Rlc1RvUmVtb3ZlLCBjb250YWluZXJOb2RlKSA9PiB7XG4gICAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGNvbnRhaW5lck5vZGUpKSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gY29udGFpbmVyTm9kZS5lbGVtZW50cztcbiAgICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA9PT0gbm9kZXNUb1JlbW92ZS5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGVudGlyZSBzdGF0ZW1lbnRcbiAgICAgICAgICBjb25zdCBzdGF0ZW1lbnQgPSBmaW5kU3RhdGVtZW50KGNvbnRhaW5lck5vZGUpO1xuICAgICAgICAgIGlmIChzdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgIG91dHB1dC5yZW1vdmUoc3RhdGVtZW50LmdldEZ1bGxTdGFydCgpLCBzdGF0ZW1lbnQuZ2V0RW5kKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBub2Rlc1RvUmVtb3ZlLmZvckVhY2gobm9kZSA9PiB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYW55IHRyYWlsaW5nIGNvbW1hXG4gICAgICAgICAgICBjb25zdCBlbmQgPSAob3V0cHV0LnNsaWNlKG5vZGUuZ2V0RW5kKCksIG5vZGUuZ2V0RW5kKCkgKyAxKSA9PT0gJywnKSA/XG4gICAgICAgICAgICAgICAgbm9kZS5nZXRFbmQoKSArIDEgOlxuICAgICAgICAgICAgICAgIG5vZGUuZ2V0RW5kKCk7XG4gICAgICAgICAgICBvdXRwdXQucmVtb3ZlKG5vZGUuZ2V0RnVsbFN0YXJ0KCksIGVuZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJld3JpdGVTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKFxuICAgICAgb3V0cHV0VGV4dDogTWFnaWNTdHJpbmcsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgICBkZWNsYXJhdGlvbnM6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10pOiB2b2lkIHtcbiAgICBkZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICBjb25zdCBzdGFydCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyLmdldFN0YXJ0KCk7XG4gICAgICBjb25zdCBlbmQgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplci5nZXRFbmQoKTtcbiAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIudGV4dC5yZXBsYWNlKFBSRV9SM19NQVJLRVIsIFBPU1RfUjNfTUFSS0VSKTtcbiAgICAgIG91dHB1dFRleHQub3ZlcndyaXRlKHN0YXJ0LCBlbmQsIHJlcGxhY2VtZW50KTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kRW5kT2ZJbXBvcnRzKHNmOiB0cy5Tb3VyY2VGaWxlKTogbnVtYmVyIHtcbiAgZm9yIChjb25zdCBzdG10IG9mIHNmLnN0YXRlbWVudHMpIHtcbiAgICBpZiAoIXRzLmlzSW1wb3J0RGVjbGFyYXRpb24oc3RtdCkgJiYgIXRzLmlzSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24oc3RtdCkgJiZcbiAgICAgICAgIXRzLmlzTmFtZXNwYWNlSW1wb3J0KHN0bXQpKSB7XG4gICAgICByZXR1cm4gc3RtdC5nZXRTdGFydCgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBmaW5kU3RhdGVtZW50KG5vZGU6IHRzLk5vZGUpIHtcbiAgd2hpbGUgKG5vZGUpIHtcbiAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4iXX0=