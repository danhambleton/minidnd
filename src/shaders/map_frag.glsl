varying vec2 vUv;

uniform float u_grid_scale;
uniform float u_grid_alpha;
uniform vec2 u_image_dims;

// uniform sampler2D baseMap;

#extension GL_OES_standard_derivatives : enable

//#define FLAT_TOP_HEXAGON

// Helper vector. If you're doing anything that involves regular triangles or hexagons, the
// 30-60-90 triangle will be involved in some way, which has sides of 1, sqrt(3) and 2.
#ifdef FLAT_TOP_HEXAGON
vec2 s = vec2(1.7320508, 1.0);
#else
vec2 s = vec2(1.0, 1.7320508);
#endif

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(141.13, 289.97))) * 43758.5453);
}

// The 2D hexagonal isosuface function: If you were to render a horizontal line and one that
// slopes at 60 degrees, mirror, then combine them, you'd arrive at the following. As an aside,
// the function is a bound -- as opposed to a Euclidean distance representation, but either
// way, the result is hexagonal boundary lines.
float hex(in vec2 p) {
  p = abs(p);

    #ifdef FLAT_TOP_HEXAGON
  return max(dot(p, s * .5), p.y); // Hexagon.
    #else
  return max(dot(p, s * .5), p.x); // Hexagon.
    #endif    
}

// This function returns the hexagonal grid coordinate for the grid cell, and the corresponding 
// hexagon cell ID -- in the form of the central hexagonal point. That's basically all you need to 
// produce a hexagonal grid.
//
// When working with 2D, I guess it's not that important to streamline this particular function.
// However, if you need to raymarch a hexagonal grid, the number of operations tend to matter.
// This one has minimal setup, one "floor" call, a couple of "dot" calls, a ternary operator, etc.
// To use it to raymarch, you'd have to double up on everything -- in order to deal with 
// overlapping fields from neighboring cells, so the fewer operations the better.
vec4 getHex(vec2 p) {    
    // The hexagon centers: Two sets of repeat hexagons are required to fill in the space, and
    // the two sets are stored in a "vec4" in order to group some calculations together. The hexagon
    // center we'll eventually use will depend upon which is closest to the current point. Since 
    // the central hexagon point is unique, it doubles as the unique hexagon ID.

  //   #ifdef FLAT_TOP_HEXAGON
  // vec4 hC = floor(vec4(p, p - vec2(1, .5)) / s.xyxy) + .5;
  //   #else
  // vec4 hC = floor(vec4(p, p - vec2(.5, 1)) / s.xyxy) + .5;
  //   #endif

  float hcx = floor(p.x / s.x) + 0.5;
  float hcy = floor(p.y / s.y) + 0.5;
  float hcz = floor((p.x - 0.5) / s.x) + 0.5;
  float hcw = floor((p.y - 1.0) / s.y) + 0.5;

  vec4 hC = vec4(hcx, hcy, hcz, hcw);

    // Centering the coordinates with the hexagon centers above.
  //vec4 h = vec4(p - hC.xy * s, p - (hC.zw + .5) * s);

  float hx = p.x - hC.x * s.x;
  float hy = p.y - hC.y * s.y;
  float hz = p.x - (hC.z + 0.5) * s.x;
  float hw = p.y - (hC.w + 0.5) * s.y;

  vec4 h = vec4(hx, hy, hz, hw);

  vec2 h1 = vec2(h.x, h.y);
  vec2 h2 = vec2(h.z, h.w);

  vec4 hex = vec4(0.0);
  if(length(h1) < length(h2))
  {
    hex = vec4(h.x, h.y, hC.x, hC.y);
  }
  else
  {
    hex = vec4(h.z, h.w, hC.z + 0.5, hC.w + 0.5);
  }


  return hex;
}

void main() {

// Aspect correct screen coordinates.
  float screen_aspect = u_image_dims.y / u_image_dims.x;
  vec2 u = vec2(vUv.x, screen_aspect * vUv.y);

  vec2 wu = vec2(-5.0 + 10.0 * vUv.x, screen_aspect * (-5.0 + 10.0 * vUv.y));

    // Scaling, translating, then converting it to a hexagonal grid cell coordinate and
    // a unique coordinate ID. The resultant vector contains everything you need to produce a
    // pretty pattern, so what you do from here is up to you.
  //vec4 h = getHex(u_grid_scale * wu + s.yx / 2.);
  vec4 h = getHex(u_grid_scale * wu);

    // The beauty of working with hexagonal centers is that the relative edge distance will simply 
    // be the value of the 2D isofield for a hexagon.
  float eDist = hex(h.xy); // Edge distance.

  float u_contour_spacing = 0.75 * 2.0;
  float u_contour_width = 0.15;

  const vec4 col_contour = vec4(0.9, 0.9, 0.9, 0.9);
  const vec4 col_outside = vec4(0.1, 0.1, 0.1, 1.0);
  const vec4 col_inside = vec4(0.6, 0.6, 0.6, 1.0);

  vec4 col = mix(col_inside, col_outside, step(0.0, eDist));
  float dist_change = fwidth(eDist) * 0.5;

    // Major contour lines
  {
    float spacing = u_contour_spacing;
    float width = u_contour_width;

    float t = abs(fract(eDist / spacing + 0.5) - 0.5) * spacing;
    t = smoothstep(width - dist_change, width + dist_change, t);
    col = mix(col_contour, col, t);
  }

    // Minor contour lines
  {
    float spacing = u_contour_spacing * 0.25;
    float width = u_contour_width * 0.25;

    float t = abs(fract(eDist / spacing + 0.5) - 0.5) * spacing;
    t = smoothstep(width - dist_change, width + dist_change, t);
    col = mix(col_contour, col, t);
  }

    // Initiate the background to a white color, putting in some dark borders.
  vec4 hexCol = mix(vec4(1., 1., 1., 0.), vec4(0., 0., 0., 1.), smoothstep(0., 0.022, eDist - .5 + .04)); 

    // float inv_scale = 1.0 / u_image_scale;
    // float offset = 0.5 * (1.0 - inv_scale);

    // vec2 uv_remap = inv_scale * vUv + vec2(offset) + (u_origin - vec2(0.5));

    // vec4 mapCol = texture2D(baseMap, uv_remap );

  gl_FragColor = u_grid_alpha * hexCol;//(vec4(hexCol, 1.0) + vec4(0.3)) * mapCol;//mix(vec4(hexCol, 0.8), mapCol, 0.8);

}