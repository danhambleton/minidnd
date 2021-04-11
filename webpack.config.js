const Dotenv = require('dotenv-webpack');
module.exports = {
  module: {
    rules: [
      {
        test: /\.(glsl|vs|fs)$/,
        loader: 'shader-loader',
        options: {
          glsl: {
            // chunkPath: resolve("/glsl/chunks")
          }
        }
      }
    ]
},
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
