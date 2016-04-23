rm -rf actual
mkdir -p actual
cp files/* actual

sorcery -i actual/helloworld.min.js
