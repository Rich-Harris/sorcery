  Sorcery version <%= version %>
  =====================================

  Usage:
    sorcery [options]

  Options:
    -h, --help                   Show help message
    -v, --version                Show version
    -i, --input <file>           Input file
    -f, --folder <folder>        Input folder
    -o, --output <file/folder>   Output file (if absent, will overwrite input) or folder (if -f is used)
    -d, --datauri                Append map as a data URI, rather than separate file
    -x, --excludeContent         Don't populate the sourcesContent array


  Examples:

    sorcery --input some/generated/code.min.js
    sorcery --glob built/ -o real-built/


  For more information visit https://github.com/Rich-Harris/sorcery