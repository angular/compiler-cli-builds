"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var codegen_1 = require('./src/codegen');
exports.CodeGenerator = codegen_1.CodeGenerator;
var reflector_host_1 = require('./src/reflector_host');
exports.NodeReflectorHost = reflector_host_1.NodeReflectorHost;
__export(require('tsc-wrapped'));
//# sourceMappingURL=index.js.map