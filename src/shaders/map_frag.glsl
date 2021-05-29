varying vec2 vUv;
varying vec4 worldCoord;

uniform vec3 u_token_position;
uniform float u_hex_fade_distance;
uniform float u_grid_scale;
uniform float u_grid_alpha;
uniform float u_grid_spacing;
uniform vec2 u_image_dims;



uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

// uniform sampler2D baseMap;

#extension GL_OES_standard_derivatives : enable

// square root of 3 over 2
const float sqrt_3_2 = 0.866025;
const float sqrt_3_3 = 0.577350;
const float sqrt_3 = 1.732050;

float sd_hex(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}

vec3 hex_round(vec3 c) {
    float rx = floor(c.x + 0.5);
    float ry = floor(c.y + 0.5);
    float rz = floor(c.z + 0.5);

    float x_diff = abs(rx - c.x);
    float y_diff = abs(ry - c.y);
    float z_diff = abs(rz - c.z);

    if(x_diff > y_diff && x_diff > z_diff) {
        rx = -ry - rz;
    } else if(y_diff > z_diff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }

    return vec3(rx, ry, rz);
}

vec3 coord_to_hex(vec3 p) {
    float q = (0.6666666 * p.x) / u_grid_scale;
    float r = (-0.33333333 * p.x + sqrt_3_3 * p.y) / u_grid_scale;
    //work in cube hex coords
    return vec3(q, -q - r, r);
}

vec3 hex_to_coord(vec3 h) {
    float x = 0.0 + 1.5 * h.x;
    float y = sqrt_3_2 * h.x + sqrt_3 * h.z;

    return u_grid_scale * vec3(x, y, 0.0);
}

void main() {

// Aspect correct screen coordinates.
//   float screen_aspect = u_image_dims.y / u_image_dims.x;
//   vec2 u = vec2(vUv.x, screen_aspect * vUv.y);

    vec2 wu = vec2(worldCoord.x, worldCoord.z);

    vec3 hex_coord = coord_to_hex(vec3(wu, 0.0));
    vec3 nearest_hex_center = hex_round(hex_coord);
    vec3 center_coord = hex_to_coord(nearest_hex_center);

    vec2 sp = (wu - center_coord.xy);
    float sd = abs(sd_hex(sp, u_grid_scale)); //needs some scaling or something.

    float u_contour_spacing = 10.0;
    float u_contour_width = 0.16 * u_grid_scale;

    vec4 col_contour = vec4(0.9, 0.9, 0.9, u_grid_alpha);
    const vec4 col_outside = vec4(0.9, 0.9, 0.9, 0.0);
    const vec4 col_inside = vec4(0.9, 0.9, 0.9, 0.0);

    vec4 col = mix(col_inside, col_outside, step(0.0, sd));
    float dist_change = fwidth(sd) * 0.5;

    

    // Major contour lines
    {
        float spacing = u_contour_spacing;
        float width = u_contour_width;

        float t = abs(fract(sd / spacing + 0.5) - 0.5) * spacing;
        t = smoothstep(width - dist_change, width + dist_change, t);
        col = mix(col_contour, col, t);
    }

  // Initiate the background to a white color, putting in some dark borders.
    vec4 hexCol = col;//mix(vec4(1., 1., 1., u_grid_alpha), vec4(1., 1., 1., 0.), step(0.0, u_grid_spacing, sd)); 

  float distToTokenPos = length(vec2(u_token_position.x, u_token_position.z) - center_coord.xy);
  hexCol = mix(hexCol, vec4(0.0, 0.0, 0.0, 1.0), distToTokenPos / u_hex_fade_distance);

  #ifdef USE_FOG
      #ifdef USE_LOGDEPTHBUF_EXT
    float depth = gl_FragDepthEXT / gl_FragCoord.w;
      #else
    float depth = gl_FragCoord.z / gl_FragCoord.w;
      #endif
    float fogFactor = smoothstep(fogNear, fogFar, depth);
    hexCol.rgb = mix(hexCol.rgb, fogColor, fogFactor);
  #endif

    gl_FragColor = hexCol;
}