varying vec2 vUv;
varying vec4 worldCoord;

void main() {
    vUv = uv ;
    gl_Position = projectionMatrix * modelViewMatrix *vec4(position, 1.0);
    worldCoord = modelMatrix * vec4( position, 1.0 );
  }