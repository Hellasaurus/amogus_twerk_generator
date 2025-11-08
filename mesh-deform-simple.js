/**
 * Simple 2D Mesh Deformation using WebGL
 *
 * This creates a grid mesh and allows deforming it by moving control points.
 * The deformation data can be stored as JSON and applied at runtime.
 */

class MeshDeformer {
    constructor(width, height, gridResolution = 10) {
        this.width = width;
        this.height = height;
        this.gridResolution = gridResolution; // Number of grid divisions (e.g., 10x10 grid)

        // Create canvas for rendering
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        // Get WebGL context
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        this.initShaders();
        this.createMesh();
    }

    initShaders() {
        const gl = this.gl;

        // Vertex shader - handles mesh deformation
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        // Fragment shader - samples the texture
        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_texture;
            varying vec2 v_texCoord;

            void main() {
                gl_FragColor = texture2D(u_texture, v_texCoord);
            }
        `;

        // Compile shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('Failed to link program: ' + gl.getProgramInfoLog(this.program));
        }

        // Get attribute/uniform locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
        this.textureLocation = gl.getUniformLocation(this.program, 'u_texture');
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Shader compilation error: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    createMesh() {
        const res = this.gridResolution;
        const positions = [];
        const texCoords = [];
        const indices = [];

        // Create grid vertices
        for (let y = 0; y <= res; y++) {
            for (let x = 0; x <= res; x++) {
                // Position in clip space (-1 to 1)
                const px = (x / res) * 2 - 1;
                const py = (y / res) * 2 - 1;
                positions.push(px, -py); // Flip Y for proper orientation

                // Texture coordinates (0 to 1)
                const tx = x / res;
                const ty = y / res;
                texCoords.push(tx, ty);
            }
        }

        // Create triangles (two per grid cell)
        for (let y = 0; y < res; y++) {
            for (let x = 0; x < res; x++) {
                const topLeft = y * (res + 1) + x;
                const topRight = topLeft + 1;
                const bottomLeft = topLeft + (res + 1);
                const bottomRight = bottomLeft + 1;

                // First triangle
                indices.push(topLeft, bottomLeft, topRight);
                // Second triangle
                indices.push(topRight, bottomLeft, bottomRight);
            }
        }

        this.basePositions = new Float32Array(positions);
        this.positions = new Float32Array(positions); // Copy for deformation
        this.texCoords = new Float32Array(texCoords);
        this.indices = new Uint16Array(indices);

        // Create buffers
        this.createBuffers();
    }

    createBuffers() {
        const gl = this.gl;

        // Position buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);

        // Texture coordinate buffer
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoords, gl.STATIC_DRAW);

        // Index buffer
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    }

    /**
     * Apply deformation using control point offsets
     * @param {Array} deformations - Array of {x, y, dx, dy} for each control point
     */
    applyDeformation(deformations) {
        const res = this.gridResolution;

        // Reset to base positions
        this.positions.set(this.basePositions);

        // Apply deformations using simple displacement
        for (const deform of deformations) {
            const gridX = Math.round(deform.x * res);
            const gridY = Math.round(deform.y * res);

            if (gridX >= 0 && gridX <= res && gridY >= 0 && gridY <= res) {
                const index = (gridY * (res + 1) + gridX) * 2;

                // Apply displacement (dx, dy are in normalized coordinates -1 to 1)
                this.positions[index] += deform.dx;
                this.positions[index + 1] += deform.dy;
            }
        }

        // Update buffer
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);
    }

    /**
     * Render texture with current deformation
     * @param {Image|Canvas} texture - The texture to render
     * @returns {Canvas} - Canvas with deformed texture
     */
    render(texture) {
        const gl = this.gl;

        // Create and bind texture
        const glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTexture);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Upload texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);

        // Set up rendering
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);

        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Bind texture coordinate buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Set texture uniform
        gl.uniform1i(this.textureLocation, 0);

        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Draw
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

        // Clean up
        gl.deleteTexture(glTexture);

        return this.canvas;
    }
}
