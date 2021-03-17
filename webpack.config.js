const Dotenv = require('dotenv-webpack');
module.exports = {
  entry: {
    send: './src/Sender.js',
    receive: './src/Receiver.js'
  },
  node: {
    fs: "empty"
 },
 plugins: [
  new Dotenv({
    path: './.env'

  })
]
};
