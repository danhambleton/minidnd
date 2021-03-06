
uniform vec3 u_base_color;

// DEBUG
uniform float u_debug_display;

uniform highp sampler2D u_matcap_tex;

in vec3 view_normal;

out vec4 frag_color;

void main_debug()
{
    frag_color = vec4(1.0, 0.0, 0.0, 1.0);
}

void main() 
{
    // main_debug();
    // return;

    vec2 matcap_uv = normalize(view_normal).xy * 0.5 + 0.5;
    frag_color = texture(u_matcap_tex, matcap_uv);

    // const vec4 matcap_color = texture(u_matcap_tex, matcap_uv);

    // // Apply gamma correction
    // vec3 rgb = matcap_color.xyz * u_base_color;
    // rgb = pow(rgb, vec3(0.4545));
    // rgb = pow(rgb, vec3(1.2545));

    // frag_color = vec4(rgb, 1.0);
}
