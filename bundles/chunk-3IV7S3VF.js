
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  __require
} from "./chunk-5VGHS4A4.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/util.mjs
var TS_DTS_JS_EXTENSION = /(?:\.d)?\.ts$|\.js$/;
function normalizeSeparators(path) {
  return path.replace(/\\/g, "/");
}
function stripExtension(path) {
  return path.replace(TS_DTS_JS_EXTENSION, "");
}
function getSourceFileOrError(program, fileName) {
  const sf = program.getSourceFile(fileName);
  if (sf === void 0) {
    throw new Error(`Program does not contain "${fileName}" - available files are ${program.getSourceFiles().map((sf2) => sf2.fileName).join(", ")}`);
  }
  return sf;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/invalid_file_system.mjs
var InvalidFileSystem = class {
  exists(path) {
    throw makeError();
  }
  readFile(path) {
    throw makeError();
  }
  readFileBuffer(path) {
    throw makeError();
  }
  writeFile(path, data, exclusive) {
    throw makeError();
  }
  removeFile(path) {
    throw makeError();
  }
  symlink(target, path) {
    throw makeError();
  }
  readdir(path) {
    throw makeError();
  }
  lstat(path) {
    throw makeError();
  }
  stat(path) {
    throw makeError();
  }
  pwd() {
    throw makeError();
  }
  chdir(path) {
    throw makeError();
  }
  extname(path) {
    throw makeError();
  }
  copyFile(from, to) {
    throw makeError();
  }
  moveFile(from, to) {
    throw makeError();
  }
  ensureDir(path) {
    throw makeError();
  }
  removeDeep(path) {
    throw makeError();
  }
  isCaseSensitive() {
    throw makeError();
  }
  resolve(...paths) {
    throw makeError();
  }
  dirname(file) {
    throw makeError();
  }
  join(basePath, ...paths) {
    throw makeError();
  }
  isRoot(path) {
    throw makeError();
  }
  isRooted(path) {
    throw makeError();
  }
  relative(from, to) {
    throw makeError();
  }
  basename(filePath, extension) {
    throw makeError();
  }
  realpath(filePath) {
    throw makeError();
  }
  getDefaultLibLocation() {
    throw makeError();
  }
  normalize(path) {
    throw makeError();
  }
};
function makeError() {
  return new Error("FileSystem has not been configured. Please call `setFileSystem()` before calling this method.");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/helpers.mjs
var fs = new InvalidFileSystem();
function getFileSystem() {
  return fs;
}
function setFileSystem(fileSystem) {
  fs = fileSystem;
}
function absoluteFrom(path) {
  if (!fs.isRooted(path)) {
    throw new Error(`Internal Error: absoluteFrom(${path}): path is not absolute`);
  }
  return fs.resolve(path);
}
var ABSOLUTE_PATH = Symbol("AbsolutePath");
function absoluteFromSourceFile(sf) {
  const sfWithPatch = sf;
  if (sfWithPatch[ABSOLUTE_PATH] === void 0) {
    sfWithPatch[ABSOLUTE_PATH] = fs.resolve(sfWithPatch.fileName);
  }
  return sfWithPatch[ABSOLUTE_PATH];
}
function relativeFrom(path) {
  const normalized = normalizeSeparators(path);
  if (fs.isRooted(normalized)) {
    throw new Error(`Internal Error: relativeFrom(${path}): path is not relative`);
  }
  return normalized;
}
function dirname(file) {
  return fs.dirname(file);
}
function join(basePath, ...paths) {
  return fs.join(basePath, ...paths);
}
function resolve(basePath, ...paths) {
  return fs.resolve(basePath, ...paths);
}
function isRoot(path) {
  return fs.isRoot(path);
}
function isRooted(path) {
  return fs.isRooted(path);
}
function relative(from, to) {
  return fs.relative(from, to);
}
function basename(filePath, extension) {
  return fs.basename(filePath, extension);
}
function isLocalRelativePath(relativePath) {
  return !isRooted(relativePath) && !relativePath.startsWith("..");
}
function toRelativeImport(relativePath) {
  return isLocalRelativePath(relativePath) ? `./${relativePath}` : relativePath;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/compiler_host.mjs
import {
  EOL
} from "os";
import ts from "typescript";
var NgtscCompilerHost = class {
  constructor(fs3, options = {}) {
    this.fs = fs3;
    this.options = options;
  }
  getSourceFile(fileName, languageVersion) {
    const text = this.readFile(fileName);
    return text !== void 0 ? ts.createSourceFile(fileName, text, languageVersion, true) : void 0;
  }
  getDefaultLibFileName(options) {
    return this.fs.join(this.getDefaultLibLocation(), ts.getDefaultLibFileName(options));
  }
  getDefaultLibLocation() {
    return this.fs.getDefaultLibLocation();
  }
  writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles) {
    const path = absoluteFrom(fileName);
    this.fs.ensureDir(this.fs.dirname(path));
    this.fs.writeFile(path, data);
  }
  getCurrentDirectory() {
    return this.fs.pwd();
  }
  getCanonicalFileName(fileName) {
    return this.useCaseSensitiveFileNames() ? fileName : fileName.toLowerCase();
  }
  useCaseSensitiveFileNames() {
    return this.fs.isCaseSensitive();
  }
  getNewLine() {
    switch (this.options.newLine) {
      case ts.NewLineKind.CarriageReturnLineFeed:
        return "\r\n";
      case ts.NewLineKind.LineFeed:
        return "\n";
      default:
        return EOL;
    }
  }
  fileExists(fileName) {
    const absPath = this.fs.resolve(fileName);
    return this.fs.exists(absPath) && this.fs.stat(absPath).isFile();
  }
  readFile(fileName) {
    const absPath = this.fs.resolve(fileName);
    if (!this.fileExists(absPath)) {
      return void 0;
    }
    return this.fs.readFile(absPath);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/logical.mjs
var LogicalProjectPath = {
  relativePathBetween: function(from, to) {
    const relativePath = relative(dirname(resolve(from)), resolve(to));
    return toRelativeImport(relativePath);
  }
};
var LogicalFileSystem = class {
  constructor(rootDirs, compilerHost) {
    this.compilerHost = compilerHost;
    this.cache = new Map();
    this.rootDirs = rootDirs.concat([]).sort((a, b) => b.length - a.length);
    this.canonicalRootDirs = this.rootDirs.map((dir) => this.compilerHost.getCanonicalFileName(dir));
  }
  logicalPathOfSf(sf) {
    return this.logicalPathOfFile(absoluteFrom(sf.fileName));
  }
  logicalPathOfFile(physicalFile) {
    const canonicalFilePath = this.compilerHost.getCanonicalFileName(physicalFile);
    if (!this.cache.has(canonicalFilePath)) {
      let logicalFile = null;
      for (let i = 0; i < this.rootDirs.length; i++) {
        const rootDir = this.rootDirs[i];
        const canonicalRootDir = this.canonicalRootDirs[i];
        if (isWithinBasePath(canonicalRootDir, canonicalFilePath)) {
          logicalFile = this.createLogicalProjectPath(physicalFile, rootDir);
          if (logicalFile.indexOf("/node_modules/") !== -1) {
            logicalFile = null;
          } else {
            break;
          }
        }
      }
      this.cache.set(canonicalFilePath, logicalFile);
    }
    return this.cache.get(canonicalFilePath);
  }
  createLogicalProjectPath(file, rootDir) {
    const logicalPath = stripExtension(file.substr(rootDir.length));
    return logicalPath.startsWith("/") ? logicalPath : "/" + logicalPath;
  }
};
function isWithinBasePath(base, path) {
  return isLocalRelativePath(relative(base, path));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/file_system/src/node_js_file_system.mjs
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "fs";
import module from "module";
import {
  basename as basename2,
  dirname as dirname2,
  extname,
  isAbsolute,
  join as join2,
  relative as relative2,
  resolve as resolve2
} from "path";
import { fileURLToPath } from "url";
var NodeJSPathManipulation = class {
  pwd() {
    return this.normalize(process.cwd());
  }
  chdir(dir) {
    process.chdir(dir);
  }
  resolve(...paths) {
    return this.normalize(resolve2(...paths));
  }
  dirname(file) {
    return this.normalize(dirname2(file));
  }
  join(basePath, ...paths) {
    return this.normalize(join2(basePath, ...paths));
  }
  isRoot(path) {
    return this.dirname(path) === this.normalize(path);
  }
  isRooted(path) {
    return isAbsolute(path);
  }
  relative(from, to) {
    return this.normalize(relative2(from, to));
  }
  basename(filePath, extension) {
    return basename2(filePath, extension);
  }
  extname(path) {
    return extname(path);
  }
  normalize(path) {
    return path.replace(/\\/g, "/");
  }
};
var isCommonJS = typeof __filename !== "undefined";
var currentFileUrl = isCommonJS ? null : __ESM_IMPORT_META_URL__;
var currentFileName = isCommonJS ? __filename : fileURLToPath(currentFileUrl);
var NodeJSReadonlyFileSystem = class extends NodeJSPathManipulation {
  constructor() {
    super(...arguments);
    this._caseSensitive = void 0;
  }
  isCaseSensitive() {
    if (this._caseSensitive === void 0) {
      this._caseSensitive = !existsSync(this.normalize(toggleCase(currentFileName)));
    }
    return this._caseSensitive;
  }
  exists(path) {
    return existsSync(path);
  }
  readFile(path) {
    return readFileSync(path, "utf8");
  }
  readFileBuffer(path) {
    return readFileSync(path);
  }
  readdir(path) {
    return readdirSync(path);
  }
  lstat(path) {
    return lstatSync(path);
  }
  stat(path) {
    return statSync(path);
  }
  realpath(path) {
    return this.resolve(realpathSync(path));
  }
  getDefaultLibLocation() {
    const requireFn = isCommonJS ? __require : module.createRequire(currentFileUrl);
    return this.resolve(requireFn.resolve("typescript"), "..");
  }
};
var NodeJSFileSystem = class extends NodeJSReadonlyFileSystem {
  writeFile(path, data, exclusive = false) {
    writeFileSync(path, data, exclusive ? { flag: "wx" } : void 0);
  }
  removeFile(path) {
    unlinkSync(path);
  }
  symlink(target, path) {
    symlinkSync(target, path);
  }
  copyFile(from, to) {
    copyFileSync(from, to);
  }
  moveFile(from, to) {
    renameSync(from, to);
  }
  ensureDir(path) {
    const parents = [];
    while (!this.isRoot(path) && !this.exists(path)) {
      parents.push(path);
      path = this.dirname(path);
    }
    while (parents.length) {
      this.safeMkdir(parents.pop());
    }
  }
  removeDeep(path) {
    rmdirSync(path, { recursive: true });
  }
  safeMkdir(path) {
    try {
      mkdirSync(path);
    } catch (err) {
      if (!this.exists(path) || !this.stat(path).isDirectory()) {
        throw err;
      }
    }
  }
};
function toggleCase(str) {
  return str.replace(/\w/g, (ch) => ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase());
}

export {
  stripExtension,
  getSourceFileOrError,
  getFileSystem,
  setFileSystem,
  absoluteFrom,
  absoluteFromSourceFile,
  relativeFrom,
  dirname,
  join,
  resolve,
  isRoot,
  isRooted,
  relative,
  basename,
  isLocalRelativePath,
  toRelativeImport,
  NgtscCompilerHost,
  LogicalProjectPath,
  LogicalFileSystem,
  NodeJSFileSystem
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=chunk-3IV7S3VF.js.map
