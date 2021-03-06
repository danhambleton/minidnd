module.exports = {
  mode: 'development',
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
}
};
