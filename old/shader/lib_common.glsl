
    //
    float clamp_01(float x)
    {
        return clamp(x, 0.0, 1.0);
    }

    //
    float inv_mix(float x1, float x2, float x)
    {
        return (x - x1) / (x2 - x1);
    }

    //
    float ramp(float x1, float x2, float x)
    {
        return clamp_01(inv_mix(x1, x2, x));
    }

    //
    float remap(
        float x, 
        float x1, float x2, 
        float y1, float y2)
    {
        return mix(y1, y2, inv_mix(x1, x2, x));
    }

    //
    vec3 gamma_correct(vec3 color)
    {
        // NOTE(dr): Is there a source for this?
        return pow(pow(color, vec3(0.4545)), vec3(1.2545));
    }

    //
    float sqr_length(vec2 a)
    {
        return dot(a, a);
    }
    
    //
    float sqr_length(vec3 a)
    {
        return dot(a, a);
    }

    // Returns the cross product of the given vector with the x axis.
    vec3 cross_x(vec3 a)
    {
        return vec3(0.0, a.z, -a.y);
    }

    // Returns the cross product of the given vector with the y axis.
    vec3 cross_y(vec3 a)
    {
        return vec3(-a.z, 0.0, a.x);
    }

    // Returns the cross product of the given vector with the z axis.
    vec3 cross_z(vec3 a)
    {
        return vec3(a.y, -a.x, 0.0);
    }
