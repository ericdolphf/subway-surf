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
            uniform float curr_dist;
            uniform float rail_width;
            uniform float rail_stretch;
            
            void main(){
                // Sample the texture image in the correct place:
                
                vec2 f_tex_coord_new = f_tex_coord;
                float dist_tex = mod(curr_dist / rail_width / rail_stretch, 1.); // since x_max = 1, this prevents f_tex_coord_new.x becoming too large
                f_tex_coord_new.y = f_tex_coord_new.y + dist_tex;
                
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
        context.uniform1f(gpu_addresses.curr_dist, gpu_state.curr_dist);
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
        uniform float curr_dist;
        uniform float rail_width;
        
        void main(){
            // Sample the texture image in the correct place:
            
            vec2 f_tex_coord_new = f_tex_coord;
            float width = rail_width;
            float dist_tex = mod(curr_dist / rail_width, 1.); // since x_max = 1, this prevents f_tex_coord_new.x becoming too large
            f_tex_coord_new.x = f_tex_coord_new.x + dist_tex;
            
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
        context.uniform1f(gpu_addresses.curr_dist, gpu_state.curr_dist);
        context.uniform1f(gpu_addresses.rail_width, gpu_state.rail_width);
    }
}

const Texture_Block = txts.Texture_Block =
    class Texture_Block extends defs.Textured_Phong {
        constructor() {
            super();
        }
        fragment_glsl_code() {
            return this.shared_glsl_code() + `
        varying vec2 f_tex_coord;
        varying vec3 position_obj;
        uniform sampler2D texture;
        uniform float curr_dist;
        uniform float rail_width;
        
        void main(){
            // Sample the texture image in the correct place:
            
            vec2 f_tex_coord_new = position_obj.xy;
            
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
            context.uniform1f(gpu_addresses.curr_dist, gpu_state.curr_dist);
            context.uniform1f(gpu_addresses.rail_width, gpu_state.rail_width);
        }
    }

