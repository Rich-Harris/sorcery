rm -rf actual
mkdir -p actual
cp files/* actual

( cd actual
	coffee -c -m foo.coffee
	coffee -c -m bar.coffee

	uglifyjs -c -m --source-map=foo.min.js.map -- foo.js > foo.min.js
	uglifyjs -c -m --source-map=bar.min.js.map -- bar.js > bar.min.js
)

#(>&2 echo "1: $PWD/actual/foo.js.map>>>$(cat actual/foo.js.map)")
#(>&2 echo "1: $PWD/actual/bar.js.map>>>$(cat actual/bar.js.map)")

sorcery -i actual

# (>&2 echo "2: $PWD/actual/foo.js.map>>>$(cat actual/foo.js.map)")
# (>&2 echo "2: $PWD/actual/bar.js.map>>>$(cat actual/bar.js.map)")

rm actual/*.coffee
rm actual/foo.js*
rm actual/bar.js*
