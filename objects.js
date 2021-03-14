import {tiny, defs} from './examples/common.js';
import {Shape_From_File} from "./examples/obj-file-demo.js";

const { vec3, vec4, color, hex_color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;
const objs = {};

export {objs};

const Objects = objs.Object =
class Objects {
    constructor() {
        this.right = 0;
        this.left = 0;
        this.up = 0;
        this.down = 0;
        this.front = 0;
        this.rear = 0;
    }

    get_bound(transform_basis) {
        let right_up_front = transform_basis.times(vec4([this.right, this.up, this.front]));
        let left_down_rear = transform_basis.times(vec4([this.left, this.down, this.rear]));
        return [[right_up_front[0], left_down_rear[0]], [right_up_front[1], left_down_rear[1]], [right_up_front[2], left_down_rear[2]]];
    }

    draw(context, program_state, curr_dist, rail_ind) {

    }
}

const Road_Block = objs.Road_Block =
class Road_Block extends Objects {
    constructor(scene_far, scene_near) {
        super();
        this.curr_dist = scene_far;
        this.scene_near = scene_near;
        this.shape = new Shape_From_File("./assets/teapot.obj");
        this.material = new Material(new defs.Phong_Shader(),
            {ambient: .4, diffusivity: .6, color: hex_color("#ff9900")}
        );
    }

    draw(context, program_state, curr_dist, rail_ind) {
        super.draw(context, program_state, curr_dist, rail_ind);
        let transform_road_block = Mat4.identity()
            .times(Mat4.rotation(-Math.PI/2, 1,0,0))
            .times(Mat4.translation(rail_ind * program_state.rail_width, curr_dist,0.25 ))
            .times(Mat4.scale(0.25, 0.25, 0.25))
        ;
        this.shape.draw(context, program_state, transform_road_block, this.material);
    }

}
//
// class Material_Road_Block extends Material {
//
// }