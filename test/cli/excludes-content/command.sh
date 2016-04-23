rm -rf actual
mkdir -p actual

sorcery -i files/helloworld.min.js -o actual/helloworld.min.js -x
