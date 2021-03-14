import {tiny, defs} from './examples/common.js';

const { vec3, vec4, color, hex_color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;
const txts = {};

export {txts};

const Texture_Rail = txts.Texture_Rail =
class Texture_Rail extends defs.Textured_Phong {
    // DONE:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            uniform float v_scout;
            uniform float rail_width;
            uniform float rail_stretch;
            
            void main(){
                // Sample the texture image in the correct place:
                
                vec2 f_tex_coord_new = f_tex_coord;
                float t = animation_time;
                float v = v_scout;
                float width = rail_width;
                float stretch = rail_stretch;
                float rate = v/width / stretch;
                float dist = mod(rate * t, 1.); // since x_max = 1, this prevents f_tex_coord_new.x becoming too large
                f_tex_coord_new.y = f_tex_coord_new.y + dist;
                
                vec4 tex_color = texture2D( texture, f_tex_coord_new);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
        context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
        context.uniform1f(gpu_addresses.v_scout, gpu_state.v_scout);
        context.uniform1f(gpu_addresses.rail_width, gpu_state.rail_width);
        context.uniform1f(gpu_addresses.rail_stretch, gpu_state.rail_stretch);
    }
}

const Texture_Tunnel = txts.Texture_Tunnel =
    class Texture_Tunnel extends defs.Textured_Phong {
        constructor() {
            super();
        }
        fragment_glsl_code() {
            return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            uniform float v_scout;
            uniform float rail_width;
            
            void main(){
                // Sample the texture image in the correct place:
                
                vec2 f_tex_coord_new = f_tex_coord;
                float t = animation_time;
                float v = v_scout;
                float width = rail_width;
                float rate = v / width;
                float dist = mod(rate * t, 1.); // since x_max = 1, this prevents f_tex_coord_new.x becoming too large
                f_tex_coord_new.y = f_tex_coord_new.y + dist;
                
                vec4 tex_color = texture2D( texture, f_tex_coord_new);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
        }

        update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
            super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
            context.uniform1f(gpu_addresses.animation_time, gpu_state.animation_time / 1000);
            context.uniform1f(gpu_addresses.v_scout, gpu_state.v_scout);
            context.uniform1f(gpu_addresses.rail_width, gpu_state.rail_width);
        }
    }