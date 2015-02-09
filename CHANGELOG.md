# changelog

## 0.3.0

* Handle browserify-style line mappings

## 0.2.5

* Re-architect as ES6 modules, add `jsnext:main` field to package.json

## 0.2.4

* `absolutePath` option ensures `sourceMappingURL` is an absolute path to the resulting `.map` file

## 0.2.3

* CLI now uses `chain.write()` internally

## 0.2.2

* `chain.write()` will overwrite the existing file, if no destination is supplied
* sorcery will use the `sourcesContent` array, rather than reading additional files, if possible

## 0.2.1

* Implement `chain.write()`
* Various bug fixes

## 0.2.0

* Redesigned API around `sorcery.load()` - consult the [docs](https://github.com/Rich-Harris/sorcery/wiki)
* Command line interface

## 0.1.1

* `sorcery.resolve()` fulfils with `null` if the target file has no sourcemap

## 0.1.0

* First release. Here be dragons.