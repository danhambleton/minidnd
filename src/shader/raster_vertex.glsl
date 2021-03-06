
uniform mat4 u_pvm_mat;
uniform mat4 u_normal_mat;
uniform float u_displace_scale;

in vec4 position;
in vec4 normal;
in vec4 displace;

out vec3 view_normal;

void main() 
{
    view_normal = (u_normal_mat * normal).xyz;
    float bump = -0.001; // Ensures raster is occluded by raymarch
    float offset = displace.w * u_displace_scale + bump;
    gl_Position = u_pvm_mat * (position + vec4(displace.xyz * offset, 0.0));
}


