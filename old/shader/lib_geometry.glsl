
    #define MAX_GEOM_DISTANCE 1.0e6
    
    // Returns the projection of u onto v
    vec3 project(vec3 u, vec3 v)
    {
        return (dot(u, v) / dot(v, v)) * v;
    }

    // Returns the rejection of u onto v
    vec3 reject(vec3 u, vec3 v)
    {
        return u - project(u, v);
    }

    // Returns a vector parallel to u whose projection onto v is equal to v.
    vec3 match_projection(vec3 u, vec3 v)
    {
        return dot(v, v) / dot(u, v) * u;
    }

    // Returns a vector parallel to u whose projection onto w is equal to v projected onto w.
    vec3 match_projection(vec3 u, vec3 v, vec3 w)
    {
        return dot(v, w) / dot(u, w) * u;
    }

    // Projects a vector to the given plane along the given direction.
    vec3 project_to_plane(vec3 vec, vec3 norm, vec3 dir)
    {
        return vec - match_projection(dir, vec, norm);
    }

    // Projects a point to the given plane along the given direction.
    vec3 project_to_plane(vec3 point, vec3 orig, vec3 norm, vec3 dir)
    {
        return point - match_projection(dir, point - orig, norm);
    }

    // For the given point, returns the parameter of the closest point on the given line.
    float line_closest_point(vec3 point, vec3 start, vec3 delta)
    {
        return dot(point - start, delta) / dot(delta, delta);
    }

    // For the given point, returns the parameter of the closest point on the given line segment.
    float segment_closest_point(vec3 point, vec3 start, vec3 delta)
    {
        return clamp_01(line_closest_point(point, start, delta));
    }

    // Returns parameters of the closest pair of points on the given lines.
    vec2 line_line_closest_points(vec3 u, vec3 v, vec3 w) 
    {
        float uv = dot(u, v);
        mat2 A = mat2(dot(u, u), uv, -uv, -dot(v, v));
        vec2 b = vec2(dot(w, u), dot(w, v));
        return inverse(A) * b; // Solve Ax = b
    }

    // Returns parameters of the closest pair of points on the given lines.
    vec2 line_line_closest_points(
        vec3 start_u, vec3 delta_u, 
        vec3 start_v, vec3 delta_v) 
    {
        return line_line_closest_points(delta_u, delta_v, start_v - start_u);
    }

    // Returns parameters of the closest pair of points on the given line and segment.
    vec2 line_segment_closest_points(
        vec3 start_u, vec3 delta_u, 
        vec3 start_v, vec3 delta_v) 
    {
        vec2 t = line_line_closest_points(delta_u, delta_v, start_v - start_u);
        t.y = clamp_01(t.y); // Clamp parameter on segment
        t.x = line_closest_point(start_v + delta_v * t.y, start_u, delta_u); // Update parameter of closest point on line
        return t;
    }

    // Returns parameters of the closest pair of points on the given line segments.
    vec2 segment_segment_closest_points(
        vec3 start_u, vec3 delta_u, 
        vec3 start_v, vec3 delta_v) 
    {
        vec2 t = line_line_closest_points(delta_u, delta_v, start_v - start_u);
        t.x = clamp_01(t.x); // Clamp paramter on first segment
        t.y = clamp_01(line_closest_point(start_u + delta_u * t.x, start_v, delta_v)); // Update paramter of closest point on second segment
        t.x = clamp_01(line_closest_point(start_v + delta_v * t.y, start_u, delta_u)); // Update paramter of closest point on first segment
        return t;
    }

    // Returns the distance along the ray to the first intersection with a sphere.
    // If the ray starts inside the sphere, the result will be negative.
    float project_to_sphere(
        vec3 ray_orig, vec3 ray_dir,
        vec3 sphere_orig, float sphere_rad)
    {
        vec3 a = sphere_orig - ray_orig;
        vec3 b = dot(a, ray_dir) * ray_dir;
        vec3 c = a - b;

        float cc = dot(c, c);
        float rr = sphere_rad * sphere_rad;

        return (cc > rr)? MAX_GEOM_DISTANCE : length(b) - sqrt(rr - cc);
    }

    // Returns the distance along the ray to the first intersection with an infinite cylinder.
    // If the ray starts inside the cylinder, the result will be negative.
    float project_to_cylinder(
        vec3 ray_orig, vec3 ray_dir,
        vec3 cylinder_orig, vec3 cylinder_axis, float cylinder_rad)
    {
        vec2 t = line_line_closest_points(ray_orig, ray_dir, cylinder_orig, cylinder_axis);

        vec3 a = (cylinder_orig + cylinder_axis * t.y) - ray_orig;
        vec3 b = ray_dir * t.x;
        vec3 c = a - b;

        float cc = dot(c, c);
        float rr = cylinder_rad * cylinder_rad;

        if(cc > rr)
            return MAX_GEOM_DISTANCE;

        vec3 d = reject(ray_dir, cylinder_axis);
        return t.x - sqrt((rr - cc) / dot(d, d));
    }

    // Returns the distance along the ray to the first intersection with a capsule.
    // If the ray starts inside the capsule, the result will be negative.
    float project_to_capsule(
        vec3 ray_orig, vec3 ray_dir,
        vec3 capsule_orig, vec3 capsule_axis, float capsule_rad)
    {
        float d1 = project_to_cylinder(ray_orig, ray_dir, capsule_orig, capsule_axis, capsule_rad);
        float d2 = project_to_sphere(ray_orig, ray_dir, capsule_orig, capsule_rad);
        float d3 = project_to_sphere(ray_orig, ray_dir, capsule_orig + capsule_axis, capsule_rad);

        // Ignore cylinder distance if intersection point isn't between planes at either end of the axis
        float t = line_closest_point(ray_orig + ray_dir * d1, capsule_orig, capsule_axis);
        return min(min(d2, d3), (t < 0.0 || t > 1.0)? MAX_GEOM_DISTANCE : d1);
    }
