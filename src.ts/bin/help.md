  Sourcery-map version <%= version %>
  =====================================

  Usage:
    sourcery-map [options]

  Options:
    -h, --help                      Show help message
    -v, --version                   Show version
    -i, --input <file|folder>       Input file
    -o, --output <file|folder>      Output file (if absent, will overwrite input)
    -d, --datauri                   Append map as a data URI, rather than separate file
    -x, --excludeContent            Don't populate the sourcesContent array


  Example:

    sourcery-map --input some/generated/code.min.js
    sourcery-map --input tmp --output dist


  For more information visit https://github.com/emmkimme/sourcery-map