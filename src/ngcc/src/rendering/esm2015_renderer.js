(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngcc/src/host/ngcc_host", "@angular/compiler-cli/src/ngcc/src/rendering/renderer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var ngcc_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/ngcc_host");
    var renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/renderer");
    var Esm2015Renderer = /** @class */ (function (_super) {
        tslib_1.__extends(Esm2015Renderer, _super);
        function Esm2015Renderer() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         *  Add the imports at the top of the file
         */
        Esm2015Renderer.prototype.addImports = function (output, imports) {
            // The imports get inserted at the very top of the file.
            imports.forEach(function (i) { output.appendLeft(0, "import * as " + i.as + " from '" + i.name + "';\n"); });
        };
        Esm2015Renderer.prototype.addConstants = function (output, constants, file) {
            if (constants === '') {
                return;
            }
            var insertionPoint = file.statements.reduce(function (prev, stmt) {
                if (ts.isImportDeclaration(stmt) || ts.isImportEqualsDeclaration(stmt) ||
                    ts.isNamespaceImport(stmt)) {
                    return stmt.getEnd();
                }
                return prev;
            }, 0);
            output.appendLeft(insertionPoint, '\n' + constants + '\n');
        };
        /**
         * Add the definitions to each decorated class
         */
        Esm2015Renderer.prototype.addDefinitions = function (output, analyzedClass, definitions) {
            var classSymbol = this.host.getClassSymbol(analyzedClass.declaration);
            if (!classSymbol) {
                throw new Error("Analyzed class does not have a valid symbol: " + analyzedClass.name);
            }
            var insertionPoint = classSymbol.valueDeclaration.getEnd();
            output.appendLeft(insertionPoint, '\n' + definitions);
        };
        /**
         * Remove static decorator properties from classes
         */
        Esm2015Renderer.prototype.removeDecorators = function (output, decoratorsToRemove) {
            decoratorsToRemove.forEach(function (nodesToRemove, containerNode) {
                if (ts.isArrayLiteralExpression(containerNode)) {
                    var items = containerNode.elements;
                    if (items.length === nodesToRemove.length) {
                        // remove any trailing semi-colon
                        var end = (output.slice(containerNode.getEnd(), containerNode.getEnd() + 1) === ';') ?
                            containerNode.getEnd() + 1 :
                            containerNode.getEnd();
                        output.remove(containerNode.parent.getFullStart(), end);
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
        Esm2015Renderer.prototype.rewriteSwitchableDeclarations = function (outputText, sourceFile) {
            var declarations = this.host.getSwitchableDeclarations(sourceFile);
            declarations.forEach(function (declaration) {
                var start = declaration.initializer.getStart();
                var end = declaration.initializer.getEnd();
                var replacement = declaration.initializer.text.replace(ngcc_host_1.PRE_NGCC_MARKER, ngcc_host_1.POST_NGCC_MARKER);
                outputText.overwrite(start, end, replacement);
            });
        };
        return Esm2015Renderer;
    }(renderer_1.Renderer));
    exports.Esm2015Renderer = Esm2015Renderer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbTIwMTVfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLCtFQUFvRTtJQUVwRSxrRkFBb0M7SUFFcEM7UUFBcUMsMkNBQVE7UUFBN0M7O1FBc0VBLENBQUM7UUFyRUM7O1dBRUc7UUFDSCxvQ0FBVSxHQUFWLFVBQVcsTUFBbUIsRUFBRSxPQUFzQztZQUNwRSx3REFBd0Q7WUFDeEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUMsSUFBTSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxpQkFBZSxDQUFDLENBQUMsRUFBRSxlQUFVLENBQUMsQ0FBQyxJQUFJLFNBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0YsQ0FBQztRQUVELHNDQUFZLEdBQVosVUFBYSxNQUFtQixFQUFFLFNBQWlCLEVBQUUsSUFBbUI7WUFDdEUsSUFBSSxTQUFTLEtBQUssRUFBRSxFQUFFO2dCQUNwQixPQUFPO2FBQ1I7WUFDRCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFDLElBQUksRUFBRSxJQUFJO2dCQUN2RCxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDO29CQUNsRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzlCLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2lCQUN0QjtnQkFDRCxPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNO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LENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNILHNCQUFDO0lBQUQsQ0FBQyxBQXRFRCxDQUFxQyxtQkFBUSxHQXNFNUM7SUF0RVksMENBQWUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0IHtQT1NUX05HQ0NfTUFSS0VSLCBQUkVfTkdDQ19NQVJLRVJ9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7QW5hbHl6ZWRDbGFzc30gZnJvbSAnLi4vYW5hbHl6ZXInO1xuaW1wb3J0IHtSZW5kZXJlcn0gZnJvbSAnLi9yZW5kZXJlcic7XG5cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVuZGVyZXIgZXh0ZW5kcyBSZW5kZXJlciB7XG4gIC8qKlxuICAgKiAgQWRkIHRoZSBpbXBvcnRzIGF0IHRoZSB0b3Agb2YgdGhlIGZpbGVcbiAgICovXG4gIGFkZEltcG9ydHMob3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czoge25hbWU6IHN0cmluZzsgYXM6IHN0cmluZzt9W10pOiB2b2lkIHtcbiAgICAvLyBUaGUgaW1wb3J0cyBnZXQgaW5zZXJ0ZWQgYXQgdGhlIHZlcnkgdG9wIG9mIHRoZSBmaWxlLlxuICAgIGltcG9ydHMuZm9yRWFjaChpID0+IHsgb3V0cHV0LmFwcGVuZExlZnQoMCwgYGltcG9ydCAqIGFzICR7aS5hc30gZnJvbSAnJHtpLm5hbWV9JztcXG5gKTsgfSk7XG4gIH1cblxuICBhZGRDb25zdGFudHMob3V0cHV0OiBNYWdpY1N0cmluZywgY29uc3RhbnRzOiBzdHJpbmcsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoY29uc3RhbnRzID09PSAnJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IGZpbGUuc3RhdGVtZW50cy5yZWR1Y2UoKHByZXYsIHN0bXQpID0+IHtcbiAgICAgIGlmICh0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpIHx8IHRzLmlzSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24oc3RtdCkgfHxcbiAgICAgICAgICB0cy5pc05hbWVzcGFjZUltcG9ydChzdG10KSkge1xuICAgICAgICByZXR1cm4gc3RtdC5nZXRFbmQoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGNvbnN0YW50cyArICdcXG4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGRlZmluaXRpb25zIHRvIGVhY2ggZGVjb3JhdGVkIGNsYXNzXG4gICAqL1xuICBhZGREZWZpbml0aW9ucyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBhbmFseXplZENsYXNzOiBBbmFseXplZENsYXNzLCBkZWZpbml0aW9uczogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmhvc3QuZ2V0Q2xhc3NTeW1ib2woYW5hbHl6ZWRDbGFzcy5kZWNsYXJhdGlvbik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBbmFseXplZCBjbGFzcyBkb2VzIG5vdCBoYXZlIGEgdmFsaWQgc3ltYm9sOiAke2FuYWx5emVkQ2xhc3MubmFtZX1gKTtcbiAgICB9XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uICEuZ2V0RW5kKCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5zZXJ0aW9uUG9pbnQsICdcXG4nICsgZGVmaW5pdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBzdGF0aWMgZGVjb3JhdG9yIHByb3BlcnRpZXMgZnJvbSBjbGFzc2VzXG4gICAqL1xuICByZW1vdmVEZWNvcmF0b3JzKG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pOiB2b2lkIHtcbiAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZm9yRWFjaCgobm9kZXNUb1JlbW92ZSwgY29udGFpbmVyTm9kZSkgPT4ge1xuICAgICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihjb250YWluZXJOb2RlKSkge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGNvbnRhaW5lck5vZGUuZWxlbWVudHM7XG4gICAgICAgIGlmIChpdGVtcy5sZW5ndGggPT09IG5vZGVzVG9SZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gcmVtb3ZlIGFueSB0cmFpbGluZyBzZW1pLWNvbG9uXG4gICAgICAgICAgY29uc3QgZW5kID0gKG91dHB1dC5zbGljZShjb250YWluZXJOb2RlLmdldEVuZCgpLCBjb250YWluZXJOb2RlLmdldEVuZCgpICsgMSkgPT09ICc7JykgP1xuICAgICAgICAgICAgICBjb250YWluZXJOb2RlLmdldEVuZCgpICsgMSA6XG4gICAgICAgICAgICAgIGNvbnRhaW5lck5vZGUuZ2V0RW5kKCk7XG4gICAgICAgICAgb3V0cHV0LnJlbW92ZShjb250YWluZXJOb2RlLnBhcmVudCAhLmdldEZ1bGxTdGFydCgpLCBlbmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5vZGVzVG9SZW1vdmUuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBhbnkgdHJhaWxpbmcgY29tbWFcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IChvdXRwdXQuc2xpY2Uobm9kZS5nZXRFbmQoKSwgbm9kZS5nZXRFbmQoKSArIDEpID09PSAnLCcpID9cbiAgICAgICAgICAgICAgICBub2RlLmdldEVuZCgpICsgMSA6XG4gICAgICAgICAgICAgICAgbm9kZS5nZXRFbmQoKTtcbiAgICAgICAgICAgIG91dHB1dC5yZW1vdmUobm9kZS5nZXRGdWxsU3RhcnQoKSwgZW5kKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmV3cml0ZVN3aXRjaGFibGVEZWNsYXJhdGlvbnMob3V0cHV0VGV4dDogTWFnaWNTdHJpbmcsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0U3dpdGNoYWJsZURlY2xhcmF0aW9ucyhzb3VyY2VGaWxlKTtcbiAgICBkZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICBjb25zdCBzdGFydCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyLmdldFN0YXJ0KCk7XG4gICAgICBjb25zdCBlbmQgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplci5nZXRFbmQoKTtcbiAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIudGV4dC5yZXBsYWNlKFBSRV9OR0NDX01BUktFUiwgUE9TVF9OR0NDX01BUktFUik7XG4gICAgICBvdXRwdXRUZXh0Lm92ZXJ3cml0ZShzdGFydCwgZW5kLCByZXBsYWNlbWVudCk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==