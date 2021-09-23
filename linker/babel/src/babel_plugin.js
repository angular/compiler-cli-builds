(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/babel/src/babel_plugin", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/logging", "@angular/compiler-cli/linker/babel/src/es2015_linker_plugin"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultLinkerPlugin = void 0;
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var logging_1 = require("@angular/compiler-cli/src/ngtsc/logging");
    var es2015_linker_plugin_1 = require("@angular/compiler-cli/linker/babel/src/es2015_linker_plugin");
    /**
     * This is the Babel plugin definition that is provided as a default export from the package, such
     * that the plugin can be used using the module specifier of the package. This is the recommended
     * way of integrating the Angular Linker into a build pipeline other than the Angular CLI.
     *
     * When the module specifier `@angular/compiler-cli/linker/babel` is used as a plugin in a Babel
     * configuration, Babel invokes this function (by means of the default export) to create the plugin
     * instance according to the provided options.
     *
     * The linker plugin that is created uses the native NodeJS filesystem APIs to interact with the
     * filesystem. Any logging output is printed to the console.
     *
     * @param api Provides access to the Babel environment that is configuring this plugin.
     * @param options The plugin options that have been configured.
     */
    function defaultLinkerPlugin(api, options) {
        api.assertVersion(7);
        return (0, es2015_linker_plugin_1.createEs2015LinkerPlugin)((0, tslib_1.__assign)((0, tslib_1.__assign)({}, options), { fileSystem: new file_system_1.NodeJSFileSystem(), logger: new logging_1.ConsoleLogger(logging_1.LogLevel.info) }));
    }
    exports.defaultLinkerPlugin = defaultLinkerPlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFiZWxfcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9iYWJlbC9zcmMvYmFiZWxfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFTQSwyRUFBZ0U7SUFDaEUsbUVBQW1FO0lBR25FLG9HQUFnRTtJQUVoRTs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLEdBQWMsRUFBRSxPQUErQjtRQUNqRixHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJCLE9BQU8sSUFBQSwrQ0FBd0Isa0RBQzFCLE9BQU8sS0FDVixVQUFVLEVBQUUsSUFBSSw4QkFBZ0IsRUFBRSxFQUNsQyxNQUFNLEVBQUUsSUFBSSx1QkFBYSxDQUFDLGtCQUFRLENBQUMsSUFBSSxDQUFDLElBQ3hDLENBQUM7SUFDTCxDQUFDO0lBUkQsa0RBUUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uZmlnQVBJLCBQbHVnaW5PYmp9IGZyb20gJ0BiYWJlbC9jb3JlJztcblxuaW1wb3J0IHtOb2RlSlNGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2xvZ2dpbmcnO1xuaW1wb3J0IHtMaW5rZXJPcHRpb25zfSBmcm9tICcuLi8uLi9zcmMvZmlsZV9saW5rZXIvbGlua2VyX29wdGlvbnMnO1xuXG5pbXBvcnQge2NyZWF0ZUVzMjAxNUxpbmtlclBsdWdpbn0gZnJvbSAnLi9lczIwMTVfbGlua2VyX3BsdWdpbic7XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgQmFiZWwgcGx1Z2luIGRlZmluaXRpb24gdGhhdCBpcyBwcm92aWRlZCBhcyBhIGRlZmF1bHQgZXhwb3J0IGZyb20gdGhlIHBhY2thZ2UsIHN1Y2hcbiAqIHRoYXQgdGhlIHBsdWdpbiBjYW4gYmUgdXNlZCB1c2luZyB0aGUgbW9kdWxlIHNwZWNpZmllciBvZiB0aGUgcGFja2FnZS4gVGhpcyBpcyB0aGUgcmVjb21tZW5kZWRcbiAqIHdheSBvZiBpbnRlZ3JhdGluZyB0aGUgQW5ndWxhciBMaW5rZXIgaW50byBhIGJ1aWxkIHBpcGVsaW5lIG90aGVyIHRoYW4gdGhlIEFuZ3VsYXIgQ0xJLlxuICpcbiAqIFdoZW4gdGhlIG1vZHVsZSBzcGVjaWZpZXIgYEBhbmd1bGFyL2NvbXBpbGVyLWNsaS9saW5rZXIvYmFiZWxgIGlzIHVzZWQgYXMgYSBwbHVnaW4gaW4gYSBCYWJlbFxuICogY29uZmlndXJhdGlvbiwgQmFiZWwgaW52b2tlcyB0aGlzIGZ1bmN0aW9uIChieSBtZWFucyBvZiB0aGUgZGVmYXVsdCBleHBvcnQpIHRvIGNyZWF0ZSB0aGUgcGx1Z2luXG4gKiBpbnN0YW5jZSBhY2NvcmRpbmcgdG8gdGhlIHByb3ZpZGVkIG9wdGlvbnMuXG4gKlxuICogVGhlIGxpbmtlciBwbHVnaW4gdGhhdCBpcyBjcmVhdGVkIHVzZXMgdGhlIG5hdGl2ZSBOb2RlSlMgZmlsZXN5c3RlbSBBUElzIHRvIGludGVyYWN0IHdpdGggdGhlXG4gKiBmaWxlc3lzdGVtLiBBbnkgbG9nZ2luZyBvdXRwdXQgaXMgcHJpbnRlZCB0byB0aGUgY29uc29sZS5cbiAqXG4gKiBAcGFyYW0gYXBpIFByb3ZpZGVzIGFjY2VzcyB0byB0aGUgQmFiZWwgZW52aXJvbm1lbnQgdGhhdCBpcyBjb25maWd1cmluZyB0aGlzIHBsdWdpbi5cbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBwbHVnaW4gb3B0aW9ucyB0aGF0IGhhdmUgYmVlbiBjb25maWd1cmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdExpbmtlclBsdWdpbihhcGk6IENvbmZpZ0FQSSwgb3B0aW9uczogUGFydGlhbDxMaW5rZXJPcHRpb25zPik6IFBsdWdpbk9iaiB7XG4gIGFwaS5hc3NlcnRWZXJzaW9uKDcpO1xuXG4gIHJldHVybiBjcmVhdGVFczIwMTVMaW5rZXJQbHVnaW4oe1xuICAgIC4uLm9wdGlvbnMsXG4gICAgZmlsZVN5c3RlbTogbmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSxcbiAgICBsb2dnZXI6IG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsLmluZm8pLFxuICB9KTtcbn1cbiJdfQ==