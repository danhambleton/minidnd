  varying vec2 vUv;

  uniform sampler2D baseMap;

  void main() {
    gl_FragColor = texture2D(baseMap, vUv);
  }