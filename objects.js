import {tiny, defs} from './examples/common.js';
import {Shape_From_File} from "./examples/obj-file-demo.js";

const { vec3, vec4, color, hex_color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;
const objs = {};

export {objs};

function intercept(range1, range2) {
    // range = [range_max, range_min]
    return (range2[0] <= range1[0] && range2[0] >= range1[1])
        || (range2[1] <= range1[0] && range2[1] >= range1[1])
        || (range2[0] >= range1[0] && range2[1] <= range1[1]);
}

class Cube_Outline extends Shape {
    constructor() {
        super("position", "color");
        //  DONE (Requirement 5).
        // When a set of lines is used in graphics, you should think of the list entries as
        // broken down into pairs; each pair of vertices will be drawn as a line segment.
        // Note: since the outline is rendered with Basic_shader, you need to redefine the position and color of each vertex
        this.arrays.position = tiny.Vector3.cast(
            [1,1,1],[-1,1,1], [1,1,-1],[-1,1,-1] ,[1,-1,1],[-1,-1,1], [1,-1,-1],[-1,-1,-1],
            [1,1,1],[1,-1,1], [-1,1,1],[-1,-1,1], [1,1,-1],[1,-1,-1], [-1,1,-1],[-1,-1,-1],
            [1,1,1],[1,1,-1], [-1,1,1],[-1,1,-1], [1,-1,1],[1,-1,-1], [-1,-1,1],[-1,-1,-1]
        );
        const white = color(1,1,1,1);
        this.arrays.color.indexed = false;
        for (let i = 0; i < 12 * 2; i++) {
            this.arrays.color.push(white);
        }
    }
}

const Object = objs.Object =
class Object {
    constructor(xrange = [0,0], yrange = [0,0], zrange = [0,0]) {
        this.right = xrange[0];
        this.left = xrange[1];
        this.up = yrange[0];
        this.down = yrange[1];
        this.front = zrange[0];
        this.rear = zrange[1];

        this.angle_down = 0;

        this.grid = new Cube_Outline();
        this.white = new Material(new defs.Basic_Shader());
    }

    get_collision_transform() {
        return Mat4.identity();
    }

    get_stretch() {
        return Mat4.translation((this.left+this.right)/2, this.down + (this.up-this.down)/2 * Math.cos(this.angle_down), (this.front+this.rear)/2)
            .times(Mat4.scale(1,
                Math.cos(this.angle_down) + (this.front-this.rear)/(this.up-this.down) * Math.sin(this.angle_down),
                Math.cos(this.angle_down) + (this.up-this.down)/(this.front-this.rear) * Math.sin(this.angle_down)))
            .times(Mat4.translation(-(this.left+this.right)/2, -(this.up+this.down)/2, -(this.front+this.rear)/2));

    }

    get_bound(transform_collision) {
        let transform_stretch = this.get_stretch();
        let right_up_front = transform_collision.times(transform_stretch).times(vec4(this.right, this.up, this.front, 1));
        let left_down_rear = transform_collision.times(transform_stretch).times(vec4(this.left, this.down, this.rear, 1));
        console.log(transform_collision);
        return [[right_up_front[0], left_down_rear[0]], [right_up_front[1], left_down_rear[1]], [right_up_front[2], left_down_rear[2]]];
    }

    draw_outline(context, program_state, bound) {
        let right = bound[0][0], left = bound[0][1], up = bound[1][0], down = bound[1][1], front = bound[2][0], rear = bound[2][1];
        this.grid.draw(context, program_state
            ,Mat4.translation((right + left)/2, (up + down)/2, (front + rear)/2)
                .times(Mat4.scale((right - left)/2, (up - down)/2, (front - rear)/2))
            ,this.white, "LINES"
            );
    }
}

const Scout = objs.Scout =
class Scout extends Object {
    constructor() {
        super([0.5,-0.5],[1,0],[0.2,-0.2]);

        this.scale = 0.3;

        this.angle_down = 0;
        this.sway_phase = 0;
        this.sway_amp = Math.PI/6;

        this.curr_x = 0; /* Needs Reset */
        this.curr_h = 0; /* Needs Reset */

        this.transforms = {
            body: Mat4.identity()
                .times(Mat4.scale(0.5,0.75,0.5))
            ,
            head: Mat4.identity()
                .times(Mat4.translation(0, 1.1,0))
                .times(Mat4.scale(0.45,0.45,0.45))
            ,
            left_leg: Mat4.translation(-0.3,-1,0)
                .times(Mat4.scale(0.25,0.6,0.25))
            ,
            right_leg: Mat4.translation(0.3,-1,0)
                .times(Mat4.scale(0.25,0.6,0.25))
            ,
            left_arm: Mat4.translation(-0.8,0,0)
                .times(Mat4.rotation(-Math.PI/4, 0,0,1))
                .times(Mat4.scale(0.25, 0.6, 0.25))
            ,
            right_arm: Mat4.translation(0.8,0,0)
                .times(Mat4.rotation(Math.PI/4, 0,0,1))
                .times(Mat4.scale(0.25, 0.6, 0.25))
            ,
        }

        this.shapes = {
            sphere: new defs.Subdivision_Sphere(5),
        }

        this.material = new Material( new defs.Phong_Shader(),
            { ambient: .2, diffusivity: 1, specularity: .8, color: hex_color("#FFFF00") } );
    }

    get_collision_transform() {
        return Mat4.translation(this.curr_x, this.curr_h, 0);
    }

    check_collision(obj_tar, curr_dist, rail_ind, rail_width) {
        let bound_src = this.get_bound(this.get_collision_transform());
        let bound_tar = obj_tar.get_bound(obj_tar.get_collision_transform(curr_dist, rail_ind, rail_width));
        return intercept(bound_src[0], bound_tar[0]) && intercept(bound_src[1], bound_tar[1]) && intercept(bound_src[2], bound_tar[2]);

    }

    draw_outline(context, program_state, ...args) {
        let bound = this.get_bound(this.get_collision_transform());
        super.draw_outline(context, program_state, bound);
    }

    draw(context, program_state) {
        let sway_angle = this.sway_amp * Math.sin(this.sway_phase);
        let transform_basis = Mat4.identity()
            .times(Mat4.translation(0, this.curr_h, 0))
            .times(Mat4.translation(this.curr_x, 0, 0))
            .times(Mat4.translation(0, 0.15+0.35*Math.cos(this.angle_down),0).times(Mat4.rotation(this.angle_down, 1,0,0)))
            .times(Mat4.scale(this.scale, this.scale,this.scale))
        ;
        let transform_body = transform_basis
            .times(this.transforms.body)
        ;
        this.shapes.sphere.draw(context, program_state, transform_body, this.material);

        let transform_head = transform_basis
            .times(this.transforms.head)
        ;
        this.shapes.sphere.draw(context, program_state, transform_head, this.material);

        let transform_left_leg = transform_basis
            .times(Mat4.rotation(sway_angle, 1, 0, 0))
            .times(this.transforms.left_leg)
        ;
        this.shapes.sphere.draw(context, program_state, transform_left_leg, this.material);

        let transform_right_leg = transform_basis
            .times(Mat4.rotation(-sway_angle, 1, 0, 0))
            .times(this.transforms.right_leg)
        ;
        this.shapes.sphere.draw(context, program_state, transform_right_leg, this.material);

        let transform_left_arm =  transform_basis
            .times(Mat4.rotation(sway_angle, 0,1,0))
            .times(this.transforms.left_arm)
        ;
        this.shapes.sphere.draw(context, program_state, transform_left_arm, this.material);

        let transform_right_arm =  transform_basis
            .times(Mat4.rotation(sway_angle, 0,1,0))
            .times(this.transforms.right_arm)
        ;
        this.shapes.sphere.draw(context, program_state, transform_right_arm, this.material);
    }
}

const Road_Block = objs.Road_Block =
class Road_Block extends Object {
    constructor() {
        super([0.75, -0.75],[1.5, 0],[0.5, -0.5]);

        this.shape = new Shape_From_File("./assets/road-block-new.obj");
        this.material = new Material(new defs.Phong_Shader(),
            {ambient: .4, diffusivity: .6, color: hex_color("#ff9900")}
        );
    }

    get_collision_transform(curr_dist, rail_ind, rail_width) {
        return Mat4.translation(rail_ind * rail_width, 0, -curr_dist);
    }

    draw_outline(context, program_state, curr_dist, rail_ind, rail_width) {
        let bound = this.get_bound(this.get_collision_transform(curr_dist, rail_ind, rail_width));
        super.draw_outline(context, program_state, bound);
    }

    draw(context, program_state, curr_dist, rail_ind) {
        let transform_road_block = Mat4.identity()
            .times(Mat4.translation(rail_ind * program_state.rail_width, 0.75, -curr_dist ))
            .times(Mat4.scale(0.75, 0.75, 0.75))
        ;
        this.shape.draw(context, program_state, transform_road_block, this.material);
    }
}


const SignalLight = objs.SignalLight =
    class SignalLight extends Object {
        constructor() {
            super([0.8, -0.8],[1, 0.8],[0.25, -0.25]);

            this.shape = new Shape_From_File("./assets/signal-light-block.obj");
            this.material = new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ff9900")}
            );
        }

        get_collision_transform(curr_dist, rail_ind, rail_width) {
            return Mat4.translation(rail_ind * rail_width, 0, -curr_dist);
        }

        draw_outline(context, program_state, curr_dist, rail_ind, rail_width) {
            let bound = this.get_bound(this.get_collision_transform(curr_dist, rail_ind, rail_width));
            super.draw_outline(context, program_state, bound);
        }

        draw(context, program_state, curr_dist, rail_ind) {
            let transform = Mat4.identity()
                .times(Mat4.translation(rail_ind * program_state.rail_width + 0.8, 1.5, -curr_dist ))
                .times(Mat4.rotation(-Math.PI/2, 0, 1, 0))
                .times(Mat4.scale(0.75, 0.75, 0.75));
            this.shape.draw(context, program_state, transform, this.material);
        }
    }