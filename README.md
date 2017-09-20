# phuks-miner-native
Donate cpu time to Phuks - native

Inspired by holzmaster/pr0gramm-miner-native

## usage
You need latest node an npm
`cd xm`
`npm install`
`node xmrbr.js <your phuks username>`
This will run the coinhive bridge. You can use it with xmrig (https://github.com/Fusl/xmrig) this way:
`./xmrig --print-time=15 --max-cpu-usage=100 -t NUMBER_OF_THREADS -a cryptonight -o stratum+tcp://127.0.0.1:12345 -u x -p x`
