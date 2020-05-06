(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block"], factory);
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
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var environment_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/environment");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    /**
     * An `Environment` representing the single type-checking file into which most (if not all) Type
     * Check Blocks (TCBs) will be generated.
     *
     * The `TypeCheckFile` hosts multiple TCBs and allows the sharing of declarations (e.g. type
     * constructors) between them. Rather than return such declarations via `getPreludeStatements()`, it
     * hoists them to the top of the generated `ts.SourceFile`.
     */
    var TypeCheckFile = /** @class */ (function (_super) {
        tslib_1.__extends(TypeCheckFile, _super);
        function TypeCheckFile(fileName, config, refEmitter, reflector) {
            var _this = _super.call(this, config, new translator_1.ImportManager(new imports_1.NoopImportRewriter(), 'i'), refEmitter, reflector, ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest, true)) || this;
            _this.fileName = fileName;
            _this.nextTcbId = 1;
            _this.tcbStatements = [];
            return _this;
        }
        TypeCheckFile.prototype.addTypeCheckBlock = function (ref, meta, domSchemaChecker, oobRecorder) {
            var fnId = ts.createIdentifier("_tcb" + this.nextTcbId++);
            var fn = type_check_block_1.generateTypeCheckBlock(this, ref, fnId, meta, domSchemaChecker, oobRecorder);
            this.tcbStatements.push(fn);
        };
        TypeCheckFile.prototype.render = function () {
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
            var source = this.importManager.getAllImports(this.fileName)
                .map(function (i) { return "import * as " + i.qualifier + " from '" + i.specifier + "';"; })
                .join('\n') +
                '\n\n';
            var printer = ts.createPrinter();
            source += '\n';
            try {
                for (var _e = tslib_1.__values(this.helperStatements), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var stmt = _f.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var _g = tslib_1.__values(this.pipeInstStatements), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var stmt = _h.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                for (var _j = tslib_1.__values(this.typeCtorStatements), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var stmt = _k.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                }
                finally { if (e_3) throw e_3.error; }
            }
            source += '\n';
            try {
                for (var _l = tslib_1.__values(this.tcbStatements), _m = _l.next(); !_m.done; _m = _l.next()) {
                    var stmt = _m.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                }
                finally { if (e_4) throw e_4.error; }
            }
            // Ensure the template type-checking file is an ES module. Otherwise, it's interpreted as some
            // kind of global namespace in TS, which forces a full re-typecheck of the user's program that
            // is somehow more expensive than the initial parse.
            source += '\nexport const IS_A_MODULE = true;\n';
            return source;
        };
        TypeCheckFile.prototype.getPreludeStatements = function () {
            return [];
        };
        return TypeCheckFile;
    }(environment_1.Environment));
    exports.TypeCheckFile = TypeCheckFile;
    function typeCheckFilePath(rootDirs) {
        var shortest = rootDirs.concat([]).sort(function (a, b) { return a.length - b.length; })[0];
        return file_system_1.join(shortest, '__ng_typecheck__.ts');
    }
    exports.typeCheckFilePath = typeCheckFilePath;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3R5cGVfY2hlY2tfZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFFakMsMkVBQXVEO0lBQ3ZELG1FQUE4RTtJQUU5RSx5RUFBK0M7SUFJL0MseUZBQTBDO0lBRTFDLG1HQUEwRDtJQUkxRDs7Ozs7OztPQU9HO0lBQ0g7UUFBbUMseUNBQVc7UUFJNUMsdUJBQ2EsUUFBd0IsRUFBRSxNQUEwQixFQUFFLFVBQTRCLEVBQzNGLFNBQXlCO1lBRjdCLFlBR0Usa0JBQ0ksTUFBTSxFQUFFLElBQUksMEJBQWEsQ0FBQyxJQUFJLDRCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFDL0UsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsU0FDckU7WUFMWSxjQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUo3QixlQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsbUJBQWEsR0FBbUIsRUFBRSxDQUFDOztRQVEzQyxDQUFDO1FBRUQseUNBQWlCLEdBQWpCLFVBQ0ksR0FBcUQsRUFBRSxJQUE0QixFQUNuRixnQkFBa0MsRUFBRSxXQUF3QztZQUM5RSxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsU0FBTyxJQUFJLENBQUMsU0FBUyxFQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFNLEVBQUUsR0FBRyx5Q0FBc0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELDhCQUFNLEdBQU47O1lBQ0UsSUFBSSxNQUFNLEdBQVcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztpQkFDMUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsaUJBQWUsQ0FBQyxDQUFDLFNBQVMsZUFBVSxDQUFDLENBQUMsU0FBUyxPQUFJLEVBQW5ELENBQW1ELENBQUM7aUJBQzdELElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ2hDLE1BQU0sQ0FBQztZQUNYLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUksSUFBSSxDQUFDOztnQkFDZixLQUFtQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLGdCQUFnQixDQUFBLGdCQUFBLDRCQUFFO29CQUFyQyxJQUFNLElBQUksV0FBQTtvQkFDYixNQUFNLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQztpQkFDckY7Ozs7Ozs7Ozs7Z0JBQ0QsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxrQkFBa0IsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBdkMsSUFBTSxJQUFJLFdBQUE7b0JBQ2IsTUFBTSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUM7aUJBQ3JGOzs7Ozs7Ozs7O2dCQUNELEtBQW1CLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsa0JBQWtCLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXZDLElBQU0sSUFBSSxXQUFBO29CQUNiLE1BQU0sSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDO2lCQUNyRjs7Ozs7Ozs7O1lBQ0QsTUFBTSxJQUFJLElBQUksQ0FBQzs7Z0JBQ2YsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxhQUFhLENBQUEsZ0JBQUEsNEJBQUU7b0JBQWxDLElBQU0sSUFBSSxXQUFBO29CQUNiLE1BQU0sSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDO2lCQUNyRjs7Ozs7Ozs7O1lBRUQsOEZBQThGO1lBQzlGLDhGQUE4RjtZQUM5RixvREFBb0Q7WUFDcEQsTUFBTSxJQUFJLHNDQUFzQyxDQUFDO1lBRWpELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRCw0Q0FBb0IsR0FBcEI7WUFDRSxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUFwREQsQ0FBbUMseUJBQVcsR0FvRDdDO0lBcERZLHNDQUFhO0lBc0QxQixTQUFnQixpQkFBaUIsQ0FBQyxRQUEwQjtRQUMxRCxJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQW5CLENBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RSxPQUFPLGtCQUFJLENBQUMsUUFBUSxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUhELDhDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGpvaW59IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Tm9vcEltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge1R5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja2luZ0NvbmZpZ30gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyfSBmcm9tICcuL29vYic7XG5pbXBvcnQge2dlbmVyYXRlVHlwZUNoZWNrQmxvY2t9IGZyb20gJy4vdHlwZV9jaGVja19ibG9jayc7XG5cblxuXG4vKipcbiAqIEFuIGBFbnZpcm9ubWVudGAgcmVwcmVzZW50aW5nIHRoZSBzaW5nbGUgdHlwZS1jaGVja2luZyBmaWxlIGludG8gd2hpY2ggbW9zdCAoaWYgbm90IGFsbCkgVHlwZVxuICogQ2hlY2sgQmxvY2tzIChUQ0JzKSB3aWxsIGJlIGdlbmVyYXRlZC5cbiAqXG4gKiBUaGUgYFR5cGVDaGVja0ZpbGVgIGhvc3RzIG11bHRpcGxlIFRDQnMgYW5kIGFsbG93cyB0aGUgc2hhcmluZyBvZiBkZWNsYXJhdGlvbnMgKGUuZy4gdHlwZVxuICogY29uc3RydWN0b3JzKSBiZXR3ZWVuIHRoZW0uIFJhdGhlciB0aGFuIHJldHVybiBzdWNoIGRlY2xhcmF0aW9ucyB2aWEgYGdldFByZWx1ZGVTdGF0ZW1lbnRzKClgLCBpdFxuICogaG9pc3RzIHRoZW0gdG8gdGhlIHRvcCBvZiB0aGUgZ2VuZXJhdGVkIGB0cy5Tb3VyY2VGaWxlYC5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVDaGVja0ZpbGUgZXh0ZW5kcyBFbnZpcm9ubWVudCB7XG4gIHByaXZhdGUgbmV4dFRjYklkID0gMTtcbiAgcHJpdmF0ZSB0Y2JTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZmlsZU5hbWU6IEFic29sdXRlRnNQYXRoLCBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZywgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpIHtcbiAgICBzdXBlcihcbiAgICAgICAgY29uZmlnLCBuZXcgSW1wb3J0TWFuYWdlcihuZXcgTm9vcEltcG9ydFJld3JpdGVyKCksICdpJyksIHJlZkVtaXR0ZXIsIHJlZmxlY3RvcixcbiAgICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShmaWxlTmFtZSwgJycsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpKTtcbiAgfVxuXG4gIGFkZFR5cGVDaGVja0Jsb2NrKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sIG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsXG4gICAgICBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLCBvb2JSZWNvcmRlcjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyKTogdm9pZCB7XG4gICAgY29uc3QgZm5JZCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoYF90Y2Ike3RoaXMubmV4dFRjYklkKyt9YCk7XG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKHRoaXMsIHJlZiwgZm5JZCwgbWV0YSwgZG9tU2NoZW1hQ2hlY2tlciwgb29iUmVjb3JkZXIpO1xuICAgIHRoaXMudGNiU3RhdGVtZW50cy5wdXNoKGZuKTtcbiAgfVxuXG4gIHJlbmRlcigpOiBzdHJpbmcge1xuICAgIGxldCBzb3VyY2U6IHN0cmluZyA9IHRoaXMuaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKHRoaXMuZmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaSA9PiBgaW1wb3J0ICogYXMgJHtpLnF1YWxpZmllcn0gZnJvbSAnJHtpLnNwZWNpZmllcn0nO2ApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKSArXG4gICAgICAgICdcXG5cXG4nO1xuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gICAgc291cmNlICs9ICdcXG4nO1xuICAgIGZvciAoY29uc3Qgc3RtdCBvZiB0aGlzLmhlbHBlclN0YXRlbWVudHMpIHtcbiAgICAgIHNvdXJjZSArPSBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RtdCwgdGhpcy5jb250ZXh0RmlsZSkgKyAnXFxuJztcbiAgICB9XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHRoaXMucGlwZUluc3RTdGF0ZW1lbnRzKSB7XG4gICAgICBzb3VyY2UgKz0gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0bXQsIHRoaXMuY29udGV4dEZpbGUpICsgJ1xcbic7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3RtdCBvZiB0aGlzLnR5cGVDdG9yU3RhdGVtZW50cykge1xuICAgICAgc291cmNlICs9IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCB0aGlzLmNvbnRleHRGaWxlKSArICdcXG4nO1xuICAgIH1cbiAgICBzb3VyY2UgKz0gJ1xcbic7XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHRoaXMudGNiU3RhdGVtZW50cykge1xuICAgICAgc291cmNlICs9IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCB0aGlzLmNvbnRleHRGaWxlKSArICdcXG4nO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBmaWxlIGlzIGFuIEVTIG1vZHVsZS4gT3RoZXJ3aXNlLCBpdCdzIGludGVycHJldGVkIGFzIHNvbWVcbiAgICAvLyBraW5kIG9mIGdsb2JhbCBuYW1lc3BhY2UgaW4gVFMsIHdoaWNoIGZvcmNlcyBhIGZ1bGwgcmUtdHlwZWNoZWNrIG9mIHRoZSB1c2VyJ3MgcHJvZ3JhbSB0aGF0XG4gICAgLy8gaXMgc29tZWhvdyBtb3JlIGV4cGVuc2l2ZSB0aGFuIHRoZSBpbml0aWFsIHBhcnNlLlxuICAgIHNvdXJjZSArPSAnXFxuZXhwb3J0IGNvbnN0IElTX0FfTU9EVUxFID0gdHJ1ZTtcXG4nO1xuXG4gICAgcmV0dXJuIHNvdXJjZTtcbiAgfVxuXG4gIGdldFByZWx1ZGVTdGF0ZW1lbnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0ZpbGVQYXRoKHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdKTogQWJzb2x1dGVGc1BhdGgge1xuICBjb25zdCBzaG9ydGVzdCA9IHJvb3REaXJzLmNvbmNhdChbXSkuc29ydCgoYSwgYikgPT4gYS5sZW5ndGggLSBiLmxlbmd0aClbMF07XG4gIHJldHVybiBqb2luKHNob3J0ZXN0LCAnX19uZ190eXBlY2hlY2tfXy50cycpO1xufVxuIl19