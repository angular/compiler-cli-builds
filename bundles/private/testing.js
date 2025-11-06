
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import "../chunk-M4UYXMUT.js";
import {
  ImportedSymbolsTracker,
  TypeScriptReflectionHost,
  getInitializerApiJitTransform
} from "../chunk-TVCGUMCI.js";
import "../chunk-LS5RJ5CS.js";
import {
  LogLevel
} from "../chunk-6HOSNZU5.js";
import {
  InvalidFileSystem,
  absoluteFrom,
  basename,
  dirname,
  resolve,
  setFileSystem
} from "../chunk-GWZQLAGK.js";
import {
  NodeJSFileSystem
} from "../chunk-XYYEESKY.js";
import "../chunk-G7GFT6BU.js";

// packages/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system.js
var MockFileSystem = class {
  _isCaseSensitive;
  _fileTree = {};
  _cwd;
  constructor(_isCaseSensitive = false, cwd = "/") {
    this._isCaseSensitive = _isCaseSensitive;
    this._cwd = this.normalize(cwd);
  }
  isCaseSensitive() {
    return this._isCaseSensitive;
  }
  exists(path2) {
    return this.findFromPath(path2).entity !== null;
  }
  readFile(path2) {
    const { entity } = this.findFromPath(path2);
    if (isFile(entity)) {
      if (entity instanceof Uint8Array) {
        return new TextDecoder().decode(entity);
      }
      return entity.toString();
    } else {
      throw new MockFileSystemError("ENOENT", path2, `File "${path2}" does not exist.`);
    }
  }
  readFileBuffer(path2) {
    const { entity } = this.findFromPath(path2);
    if (isFile(entity)) {
      if (entity instanceof Uint8Array) {
        return entity;
      }
      const encoder = new TextEncoder();
      return encoder.encode(entity);
    } else {
      throw new MockFileSystemError("ENOENT", path2, `File "${path2}" does not exist.`);
    }
  }
  writeFile(path2, data, exclusive = false) {
    const [folderPath, basename2] = this.splitIntoFolderAndFile(path2);
    const { entity } = this.findFromPath(folderPath);
    if (entity === null || !isFolder(entity)) {
      throw new MockFileSystemError("ENOENT", path2, `Unable to write file "${path2}". The containing folder does not exist.`);
    }
    if (exclusive && entity[basename2] !== void 0) {
      throw new MockFileSystemError("EEXIST", path2, `Unable to exclusively write file "${path2}". The file already exists.`);
    }
    entity[basename2] = data;
  }
  removeFile(path2) {
    const [folderPath, basename2] = this.splitIntoFolderAndFile(path2);
    const { entity } = this.findFromPath(folderPath);
    if (entity === null || !isFolder(entity)) {
      throw new MockFileSystemError("ENOENT", path2, `Unable to remove file "${path2}". The containing folder does not exist.`);
    }
    if (isFolder(entity[basename2])) {
      throw new MockFileSystemError("EISDIR", path2, `Unable to remove file "${path2}". The path to remove is a folder.`);
    }
    delete entity[basename2];
  }
  symlink(target, path2) {
    const [folderPath, basename2] = this.splitIntoFolderAndFile(path2);
    const { entity } = this.findFromPath(folderPath);
    if (entity === null || !isFolder(entity)) {
      throw new MockFileSystemError("ENOENT", path2, `Unable to create symlink at "${path2}". The containing folder does not exist.`);
    }
    entity[basename2] = new SymLink(target);
  }
  readdir(path2) {
    const { entity } = this.findFromPath(path2);
    if (entity === null) {
      throw new MockFileSystemError("ENOENT", path2, `Unable to read directory "${path2}". It does not exist.`);
    }
    if (isFile(entity)) {
      throw new MockFileSystemError("ENOTDIR", path2, `Unable to read directory "${path2}". It is a file.`);
    }
    return Object.keys(entity);
  }
  lstat(path2) {
    const { entity } = this.findFromPath(path2);
    if (entity === null) {
      throw new MockFileSystemError("ENOENT", path2, `File "${path2}" does not exist.`);
    }
    return new MockFileStats(entity);
  }
  stat(path2) {
    const { entity } = this.findFromPath(path2, { followSymLinks: true });
    if (entity === null) {
      throw new MockFileSystemError("ENOENT", path2, `File "${path2}" does not exist.`);
    }
    return new MockFileStats(entity);
  }
  copyFile(from, to) {
    this.writeFile(to, this.readFile(from));
  }
  moveFile(from, to) {
    this.writeFile(to, this.readFile(from));
    const result = this.findFromPath(dirname(from));
    const folder = result.entity;
    const name = basename(from);
    delete folder[name];
  }
  ensureDir(path2) {
    const segments = this.splitPath(path2).map((segment) => this.getCanonicalPath(segment));
    segments[0] = "";
    if (segments.length > 1 && segments[segments.length - 1] === "") {
      segments.pop();
    }
    let current = this._fileTree;
    for (const segment of segments) {
      if (isFile(current[segment])) {
        throw new Error(`Folder already exists as a file.`);
      }
      if (!current[segment]) {
        current[segment] = {};
      }
      current = current[segment];
    }
    return current;
  }
  removeDeep(path2) {
    const [folderPath, basename2] = this.splitIntoFolderAndFile(path2);
    const { entity } = this.findFromPath(folderPath);
    if (entity === null || !isFolder(entity)) {
      throw new MockFileSystemError("ENOENT", path2, `Unable to remove folder "${path2}". The containing folder does not exist.`);
    }
    delete entity[basename2];
  }
  isRoot(path2) {
    return this.dirname(path2) === path2;
  }
  extname(path2) {
    const match = /.+(\.[^.]*)$/.exec(path2);
    return match !== null ? match[1] : "";
  }
  realpath(filePath) {
    const result = this.findFromPath(filePath, { followSymLinks: true });
    if (result.entity === null) {
      throw new MockFileSystemError("ENOENT", filePath, `Unable to find the real path of "${filePath}". It does not exist.`);
    } else {
      return result.path;
    }
  }
  pwd() {
    return this._cwd;
  }
  chdir(path2) {
    this._cwd = this.normalize(path2);
  }
  getDefaultLibLocation() {
    let path2 = "node_modules/typescript/lib";
    let resolvedPath = this.resolve(path2);
    const topLevelNodeModules = this.resolve("/" + path2);
    while (resolvedPath !== topLevelNodeModules) {
      if (this.exists(resolvedPath)) {
        return resolvedPath;
      }
      path2 = "../" + path2;
      resolvedPath = this.resolve(path2);
    }
    return topLevelNodeModules;
  }
  dump() {
    const { entity } = this.findFromPath(this.resolve("/"));
    if (entity === null || !isFolder(entity)) {
      return {};
    }
    return this.cloneFolder(entity);
  }
  init(folder) {
    this.mount(this.resolve("/"), folder);
  }
  mount(path2, folder) {
    if (this.exists(path2)) {
      throw new Error(`Unable to mount in '${path2}' as it already exists.`);
    }
    const mountFolder = this.ensureDir(path2);
    this.copyInto(folder, mountFolder);
  }
  cloneFolder(folder) {
    const clone = {};
    this.copyInto(folder, clone);
    return clone;
  }
  copyInto(from, to) {
    for (const path2 in from) {
      const item = from[path2];
      const canonicalPath = this.getCanonicalPath(path2);
      if (isSymLink(item)) {
        to[canonicalPath] = new SymLink(this.getCanonicalPath(item.path));
      } else if (isFolder(item)) {
        to[canonicalPath] = this.cloneFolder(item);
      } else {
        to[canonicalPath] = from[path2];
      }
    }
  }
  findFromPath(path2, options) {
    const followSymLinks = !!options && options.followSymLinks;
    const segments = this.splitPath(path2);
    if (segments.length > 1 && segments[segments.length - 1] === "") {
      segments.pop();
    }
    segments[0] = "";
    let current = this._fileTree;
    while (segments.length) {
      current = current[this.getCanonicalPath(segments.shift())];
      if (current === void 0) {
        return { path: path2, entity: null };
      }
      if (segments.length > 0) {
        if (isFile(current)) {
          current = null;
          break;
        }
        if (isSymLink(current)) {
          return this.findFromPath(resolve(current.path, ...segments), { followSymLinks });
        }
      }
      if (isFile(current)) {
        break;
      }
      if (isSymLink(current)) {
        if (followSymLinks) {
          return this.findFromPath(resolve(current.path, ...segments), { followSymLinks });
        } else {
          break;
        }
      }
    }
    return { path: path2, entity: current };
  }
  splitIntoFolderAndFile(path2) {
    const segments = this.splitPath(this.getCanonicalPath(path2));
    const file = segments.pop();
    return [path2.substring(0, path2.length - file.length - 1), file];
  }
  getCanonicalPath(p3) {
    return this.isCaseSensitive() ? p3 : p3.toLowerCase();
  }
};
var SymLink = class {
  path;
  constructor(path2) {
    this.path = path2;
  }
};
var MockFileStats = class {
  entity;
  constructor(entity) {
    this.entity = entity;
  }
  isFile() {
    return isFile(this.entity);
  }
  isDirectory() {
    return isFolder(this.entity);
  }
  isSymbolicLink() {
    return isSymLink(this.entity);
  }
};
var MockFileSystemError = class extends Error {
  code;
  path;
  constructor(code, path2, message) {
    super(message);
    this.code = code;
    this.path = path2;
  }
};
function isFile(item) {
  return item instanceof Uint8Array || typeof item === "string";
}
function isSymLink(item) {
  return item instanceof SymLink;
}
function isFolder(item) {
  return item !== null && !isFile(item) && !isSymLink(item);
}

// packages/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_native.js
import * as os from "os";
var isWindows = os.platform?.() === "win32";
var MockFileSystemNative = class extends MockFileSystem {
  constructor(cwd = "/") {
    super(void 0, cwd);
  }
  // Delegate to the real NodeJSFileSystem for these path related methods
  resolve(...paths) {
    return NodeJSFileSystem.prototype.resolve.call(this, this.pwd(), ...paths);
  }
  dirname(file) {
    return NodeJSFileSystem.prototype.dirname.call(this, file);
  }
  join(basePath, ...paths) {
    return NodeJSFileSystem.prototype.join.call(this, basePath, ...paths);
  }
  relative(from, to) {
    return NodeJSFileSystem.prototype.relative.call(this, from, to);
  }
  basename(filePath, extension) {
    return NodeJSFileSystem.prototype.basename.call(this, filePath, extension);
  }
  isCaseSensitive() {
    return NodeJSFileSystem.prototype.isCaseSensitive.call(this);
  }
  isRooted(path2) {
    return NodeJSFileSystem.prototype.isRooted.call(this, path2);
  }
  isRoot(path2) {
    return NodeJSFileSystem.prototype.isRoot.call(this, path2);
  }
  normalize(path2) {
    if (isWindows) {
      path2 = path2.replace(/^[\/\\]/i, "C:/");
    }
    return NodeJSFileSystem.prototype.normalize.call(this, path2);
  }
  splitPath(path2) {
    return path2.split(/[\\\/]/);
  }
};

// packages/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_posix.js
import * as p from "path";
var MockFileSystemPosix = class extends MockFileSystem {
  resolve(...paths) {
    const resolved = p.posix.resolve(this.pwd(), ...paths);
    return this.normalize(resolved);
  }
  dirname(file) {
    return this.normalize(p.posix.dirname(file));
  }
  join(basePath, ...paths) {
    return this.normalize(p.posix.join(basePath, ...paths));
  }
  relative(from, to) {
    return this.normalize(p.posix.relative(from, to));
  }
  basename(filePath, extension) {
    return p.posix.basename(filePath, extension);
  }
  isRooted(path2) {
    return path2.startsWith("/");
  }
  splitPath(path2) {
    return path2.split("/");
  }
  normalize(path2) {
    return path2.replace(/^[a-z]:\//i, "/").replace(/\\/g, "/");
  }
};

// packages/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_windows.js
import * as p2 from "path";
var MockFileSystemWindows = class extends MockFileSystem {
  resolve(...paths) {
    const resolved = p2.win32.resolve(this.pwd(), ...paths);
    return this.normalize(resolved);
  }
  dirname(path2) {
    return this.normalize(p2.win32.dirname(path2));
  }
  join(basePath, ...paths) {
    return this.normalize(p2.win32.join(basePath, ...paths));
  }
  relative(from, to) {
    return this.normalize(p2.win32.relative(from, to));
  }
  basename(filePath, extension) {
    return p2.win32.basename(filePath, extension);
  }
  isRooted(path2) {
    return /^([A-Z]:)?([\\\/]|$)/i.test(path2);
  }
  splitPath(path2) {
    return path2.split(/[\\\/]/);
  }
  normalize(path2) {
    return path2.replace(/^[\/\\]/i, "C:/").replace(/\\/g, "/");
  }
};

// packages/compiler-cli/src/ngtsc/file_system/testing/src/test_helper.js
import ts from "typescript";
var FS_NATIVE = "Native";
var FS_OS_X = "OS/X";
var FS_UNIX = "Unix";
var FS_WINDOWS = "Windows";
var FS_ALL = [FS_OS_X, FS_WINDOWS, FS_UNIX, FS_NATIVE];
function runInEachFileSystemFn(callback) {
  FS_ALL.forEach((os2) => runInFileSystem(os2, callback, false));
}
function runInFileSystem(os2, callback, error) {
  describe(`<<FileSystem: ${os2}>>`, () => {
    beforeEach(() => initMockFileSystem(os2));
    afterEach(() => setFileSystem(new InvalidFileSystem()));
    callback(os2);
    if (error) {
      afterAll(() => {
        throw new Error(`runInFileSystem limited to ${os2}, cannot pass`);
      });
    }
  });
}
var runInEachFileSystem = runInEachFileSystemFn;
runInEachFileSystem.native = (callback) => runInFileSystem(FS_NATIVE, callback, true);
runInEachFileSystem.osX = (callback) => runInFileSystem(FS_OS_X, callback, true);
runInEachFileSystem.unix = (callback) => runInFileSystem(FS_UNIX, callback, true);
runInEachFileSystem.windows = (callback) => runInFileSystem(FS_WINDOWS, callback, true);
function initMockFileSystem(os2, cwd) {
  const fs2 = createMockFileSystem(os2, cwd);
  setFileSystem(fs2);
  monkeyPatchTypeScript(fs2);
  return fs2;
}
function createMockFileSystem(os2, cwd) {
  switch (os2) {
    case "OS/X":
      return new MockFileSystemPosix(
        /* isCaseSensitive */
        false,
        cwd
      );
    case "Unix":
      return new MockFileSystemPosix(
        /* isCaseSensitive */
        true,
        cwd
      );
    case "Windows":
      return new MockFileSystemWindows(
        /* isCaseSensitive*/
        false,
        cwd
      );
    case "Native":
      return new MockFileSystemNative(cwd);
    default:
      throw new Error("FileSystem not supported");
  }
}
function monkeyPatchTypeScript(fs2) {
  ts.sys.fileExists = (path2) => {
    const absPath = fs2.resolve(path2);
    return fs2.exists(absPath) && fs2.stat(absPath).isFile();
  };
  ts.sys.getCurrentDirectory = () => fs2.pwd();
  ts.sys.getDirectories = getDirectories;
  ts.sys.readFile = fs2.readFile.bind(fs2);
  ts.sys.resolvePath = fs2.resolve.bind(fs2);
  ts.sys.writeFile = fs2.writeFile.bind(fs2);
  ts.sys.directoryExists = directoryExists;
  ts.sys.readDirectory = readDirectory;
  function getDirectories(path2) {
    return fs2.readdir(absoluteFrom(path2)).filter((p3) => fs2.stat(fs2.resolve(path2, p3)).isDirectory());
  }
  function getFileSystemEntries(path2) {
    const files = [];
    const directories = [];
    const absPath = fs2.resolve(path2);
    const entries = fs2.readdir(absPath);
    for (const entry of entries) {
      if (entry == "." || entry === "..") {
        continue;
      }
      const absPath2 = fs2.resolve(path2, entry);
      const stat = fs2.stat(absPath2);
      if (stat.isDirectory()) {
        directories.push(absPath2);
      } else if (stat.isFile()) {
        files.push(absPath2);
      }
    }
    return { files, directories };
  }
  function realPath(path2) {
    return fs2.realpath(fs2.resolve(path2));
  }
  function directoryExists(path2) {
    const absPath = fs2.resolve(path2);
    return fs2.exists(absPath) && fs2.stat(absPath).isDirectory();
  }
  const tsMatchFiles = ts.matchFiles;
  function readDirectory(path2, extensions, excludes, includes, depth) {
    return tsMatchFiles(path2, extensions, excludes, includes, fs2.isCaseSensitive(), fs2.pwd(), depth, getFileSystemEntries, realPath, directoryExists);
  }
}

// packages/compiler-cli/src/ngtsc/logging/testing/src/mock_logger.js
var MockLogger = class {
  level;
  constructor(level = LogLevel.info) {
    this.level = level;
  }
  logs = {
    debug: [],
    info: [],
    warn: [],
    error: []
  };
  debug(...args) {
    this.logs.debug.push(args);
  }
  info(...args) {
    this.logs.info.push(args);
  }
  warn(...args) {
    this.logs.warn.push(args);
  }
  error(...args) {
    this.logs.error.push(args);
  }
};

// packages/compiler-cli/src/ngtsc/testing/src/utils.js
import ts3 from "typescript";

// packages/compiler-cli/src/ngtsc/testing/src/cached_source_files.js
import ts2 from "typescript";
var sourceFileCache = /* @__PURE__ */ new Map();
function getCachedSourceFile(fileName, load) {
  if (!/^lib\..+\.d\.ts$/.test(basename(fileName)) && !/\/node_modules\/(@angular|rxjs)\//.test(fileName)) {
    return null;
  }
  const content = load();
  if (content === void 0) {
    return null;
  }
  if (!sourceFileCache.has(fileName) || sourceFileCache.get(fileName).text !== content) {
    const sf = ts2.createSourceFile(fileName, content, ts2.ScriptTarget.ES2015);
    sourceFileCache.set(fileName, sf);
  }
  return sourceFileCache.get(fileName);
}

// packages/compiler-cli/src/ngtsc/testing/src/utils.js
var TsStructureIsReused;
(function(TsStructureIsReused2) {
  TsStructureIsReused2[TsStructureIsReused2["Not"] = 0] = "Not";
  TsStructureIsReused2[TsStructureIsReused2["SafeModules"] = 1] = "SafeModules";
  TsStructureIsReused2[TsStructureIsReused2["Completely"] = 2] = "Completely";
})(TsStructureIsReused || (TsStructureIsReused = {}));

// packages/compiler-cli/src/ngtsc/testing/src/mock_file_loading.js
import { readdirSync as readdirSync2, readFileSync as readFileSync2, statSync } from "fs";
import { resolve as resolve3 } from "path";

// packages/compiler-cli/src/ngtsc/testing/src/runfile_helpers.js
import * as fs from "fs";
import * as path from "path";
function getAngularPackagesFromRunfiles() {
  const runfilesManifestPath = process.env["RUNFILES_MANIFEST_FILE"];
  if (!runfilesManifestPath) {
    const packageRunfilesDir = path.join(process.env["RUNFILES"], "_main/packages");
    return fs.readdirSync(packageRunfilesDir).map((name) => ({ name, pkgPath: path.join(packageRunfilesDir, name, "npm_package/") })).filter(({ pkgPath }) => fs.existsSync(pkgPath));
  }
  return fs.readFileSync(runfilesManifestPath, "utf8").split("\n").map((mapping) => mapping.split(" ")).filter(([runfilePath]) => runfilePath.match(/^_main\/packages\/[\w-]+\/npm_package$/)).map(([runfilePath, realPath]) => ({
    name: path.relative("_main/packages", runfilePath).split(path.sep)[0],
    pkgPath: realPath
  }));
}
function resolveFromRunfiles(manifestPath) {
  return path.resolve(process.env["RUNFILES"], manifestPath);
}

// packages/compiler-cli/src/ngtsc/testing/src/mock_file_loading.js
var CachedFolder = class {
  loader;
  folder = null;
  constructor(loader) {
    this.loader = loader;
  }
  get() {
    if (this.folder === null) {
      this.folder = this.loader();
    }
    return this.folder;
  }
};
var typescriptFolder = new CachedFolder(() => loadFolder(resolveFromRunfiles("_main/node_modules/typescript")));
var angularFolder = new CachedFolder(loadAngularFolder);
var rxjsFolder = new CachedFolder(() => loadFolder(resolveFromRunfiles("_main/node_modules/rxjs")));
function loadStandardTestFiles({ fakeCommon = false, rxjs = false, forms = false } = {}) {
  const tmpFs = new MockFileSystemPosix(true);
  const basePath = "/";
  tmpFs.mount(tmpFs.resolve("/node_modules/typescript"), typescriptFolder.get());
  tmpFs.mount(tmpFs.resolve("/node_modules/@angular"), angularFolder.get());
  loadTsLib(tmpFs, basePath);
  if (fakeCommon) {
    loadFakeCommon(tmpFs, basePath);
  }
  if (rxjs) {
    tmpFs.mount(tmpFs.resolve("/node_modules/rxjs"), rxjsFolder.get());
  }
  if (forms) {
    loadAngularForms(tmpFs, basePath);
  }
  return tmpFs.dump();
}
function loadTsLib(fs2, basePath = "/") {
  loadTestDirectory(fs2, resolveFromRunfiles("_main/node_modules/tslib"), fs2.resolve(basePath, "node_modules/tslib"));
}
function loadFakeCommon(fs2, basePath = "/") {
  loadTestDirectory(fs2, resolveFromRunfiles("_main/packages/compiler-cli/src/ngtsc/testing/fake_common/npm_package"), fs2.resolve(basePath, "node_modules/@angular/common"));
}
function loadAngularForms(fs2, basePath = "/") {
  loadTestDirectory(fs2, resolveFromRunfiles("_main/packages/forms/npm_package"), fs2.resolve(basePath, "node_modules/@angular/forms"));
}
function loadFolder(path2) {
  const tmpFs = new MockFileSystemPosix(true);
  loadTestDirectory(tmpFs, path2, tmpFs.resolve("/"));
  return tmpFs.dump();
}
function loadAngularFolder() {
  const tmpFs = new MockFileSystemPosix(true);
  getAngularPackagesFromRunfiles().forEach(({ name, pkgPath }) => {
    loadTestDirectory(tmpFs, pkgPath, tmpFs.resolve(name));
  });
  return tmpFs.dump();
}
function loadTestDirectory(fs2, directoryPath, mockPath) {
  readdirSync2(directoryPath).forEach((item) => {
    const srcPath = resolve3(directoryPath, item);
    const targetPath = fs2.resolve(mockPath, item);
    try {
      if (statSync(srcPath).isDirectory()) {
        fs2.ensureDir(targetPath);
        loadTestDirectory(fs2, srcPath, targetPath);
      } else {
        fs2.ensureDir(fs2.dirname(targetPath));
        fs2.writeFile(targetPath, readFileSync2(srcPath, "utf-8"));
      }
    } catch (e) {
      console.warn(`Failed to add ${srcPath} to the mock file-system: ${e.message}`);
    }
  });
}
export {
  ImportedSymbolsTracker,
  MockFileSystem,
  MockFileSystemNative,
  MockLogger,
  TypeScriptReflectionHost,
  getCachedSourceFile,
  getInitializerApiJitTransform,
  initMockFileSystem,
  loadStandardTestFiles,
  loadTestDirectory,
  runInEachFileSystem
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
