(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/linker_environment", ["require", "exports", "@angular/compiler-cli/linker/src/file_linker/linker_options", "@angular/compiler-cli/linker/src/file_linker/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LinkerEnvironment = void 0;
    var linker_options_1 = require("@angular/compiler-cli/linker/src/file_linker/linker_options");
    var translator_1 = require("@angular/compiler-cli/linker/src/file_linker/translator");
    var LinkerEnvironment = /** @class */ (function () {
        function LinkerEnvironment(host, factory, options) {
            this.host = host;
            this.factory = factory;
            this.options = options;
            this.translator = new translator_1.Translator(this.factory);
        }
        LinkerEnvironment.create = function (host, factory, options) {
            var _a, _b, _c;
            return new LinkerEnvironment(host, factory, {
                enableI18nLegacyMessageIdFormat: (_a = options.enableI18nLegacyMessageIdFormat) !== null && _a !== void 0 ? _a : linker_options_1.DEFAULT_LINKER_OPTIONS.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: (_b = options.i18nNormalizeLineEndingsInICUs) !== null && _b !== void 0 ? _b : linker_options_1.DEFAULT_LINKER_OPTIONS.i18nNormalizeLineEndingsInICUs,
                i18nUseExternalIds: (_c = options.i18nUseExternalIds) !== null && _c !== void 0 ? _c : linker_options_1.DEFAULT_LINKER_OPTIONS.i18nUseExternalIds,
            });
        };
        return LinkerEnvironment;
    }());
    exports.LinkerEnvironment = LinkerEnvironment;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyX2Vudmlyb25tZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9zcmMvZmlsZV9saW5rZXIvbGlua2VyX2Vudmlyb25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVVBLDhGQUF1RTtJQUN2RSxzRkFBd0M7SUFFeEM7UUFFRSwyQkFDYSxJQUEwQixFQUFXLE9BQTRDLEVBQ2pGLE9BQXNCO1lBRHRCLFNBQUksR0FBSixJQUFJLENBQXNCO1lBQVcsWUFBTyxHQUFQLE9BQU8sQ0FBcUM7WUFDakYsWUFBTyxHQUFQLE9BQU8sQ0FBZTtZQUgxQixlQUFVLEdBQUcsSUFBSSx1QkFBVSxDQUEwQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFHdEMsQ0FBQztRQUVoQyx3QkFBTSxHQUFiLFVBQ0ksSUFBMEIsRUFBRSxPQUE0QyxFQUN4RSxPQUErQjs7WUFDakMsT0FBTyxJQUFJLGlCQUFpQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQzFDLCtCQUErQixRQUFFLE9BQU8sQ0FBQywrQkFBK0IsbUNBQ3BFLHVDQUFzQixDQUFDLCtCQUErQjtnQkFDMUQsOEJBQThCLFFBQUUsT0FBTyxDQUFDLDhCQUE4QixtQ0FDbEUsdUNBQXNCLENBQUMsOEJBQThCO2dCQUN6RCxrQkFBa0IsUUFBRSxPQUFPLENBQUMsa0JBQWtCLG1DQUFJLHVDQUFzQixDQUFDLGtCQUFrQjthQUM1RixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBakJELElBaUJDO0lBakJZLDhDQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBc3RGYWN0b3J5fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge0FzdEhvc3R9IGZyb20gJy4uL2FzdC9hc3RfaG9zdCc7XG5pbXBvcnQge0RFRkFVTFRfTElOS0VSX09QVElPTlMsIExpbmtlck9wdGlvbnN9IGZyb20gJy4vbGlua2VyX29wdGlvbnMnO1xuaW1wb3J0IHtUcmFuc2xhdG9yfSBmcm9tICcuL3RyYW5zbGF0b3InO1xuXG5leHBvcnQgY2xhc3MgTGlua2VyRW52aXJvbm1lbnQ8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+IHtcbiAgcmVhZG9ubHkgdHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPih0aGlzLmZhY3RvcnkpO1xuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgaG9zdDogQXN0SG9zdDxURXhwcmVzc2lvbj4sIHJlYWRvbmx5IGZhY3Rvcnk6IEFzdEZhY3Rvcnk8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+LFxuICAgICAgcmVhZG9ubHkgb3B0aW9uczogTGlua2VyT3B0aW9ucykge31cblxuICBzdGF0aWMgY3JlYXRlPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPihcbiAgICAgIGhvc3Q6IEFzdEhvc3Q8VEV4cHJlc3Npb24+LCBmYWN0b3J5OiBBc3RGYWN0b3J5PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPixcbiAgICAgIG9wdGlvbnM6IFBhcnRpYWw8TGlua2VyT3B0aW9ucz4pOiBMaW5rZXJFbnZpcm9ubWVudDxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4ge1xuICAgIHJldHVybiBuZXcgTGlua2VyRW52aXJvbm1lbnQoaG9zdCwgZmFjdG9yeSwge1xuICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogb3B0aW9ucy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID8/XG4gICAgICAgICAgREVGQVVMVF9MSU5LRVJfT1BUSU9OUy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzOiBvcHRpb25zLmkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyA/P1xuICAgICAgICAgIERFRkFVTFRfTElOS0VSX09QVElPTlMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLFxuICAgICAgaTE4blVzZUV4dGVybmFsSWRzOiBvcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyA/PyBERUZBVUxUX0xJTktFUl9PUFRJT05TLmkxOG5Vc2VFeHRlcm5hbElkcyxcbiAgICB9KTtcbiAgfVxufVxuIl19