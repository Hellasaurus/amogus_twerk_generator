/**
 * WebGL-based mesh warping for texture deformation
 */

class MeshWarper {
    constructor(width = 512, height = 512, gridSize = 10) {
        this.width = width;
        this.height = height;
        this.gridSize = gridSize;

        // Create canvas and WebGL context
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        this.initShaders();
        this.initMesh();
    }

    initShaders() {
        const gl = this.gl;

        // Vertex shader - transforms mesh vertices
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        // Fragment shader - samples texture
        const fragmentShaderSource = `
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;

            void main() {
                gl_FragColor = texture2D(u_texture, v_texCoord);
            }
        `;

        // Compile shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Create and link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('Shader program failed to link: ' + gl.getProgramInfoLog(this.program));
        }

        gl.useProgram(this.program);

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
            throw new Error('Shader compilation failed: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    initMesh() {
        const gl = this.gl;
        const gridSize = this.gridSize;

        // Create mesh grid vertices and texture coordinates
        const positions = [];
        const texCoords = [];
        const indices = [];

        // Generate grid vertices (in normalized device coordinates -1 to 1)
        for (let y = 0; y <= gridSize; y++) {
            for (let x = 0; x <= gridSize; x++) {
                // Position in NDC (-1 to 1)
                const px = (x / gridSize) * 2 - 1;
                const py = (y / gridSize) * 2 - 1;
                positions.push(px, py);

                // Texture coordinates (0 to 1)
                const tx = x / gridSize;
                const ty = y / gridSize;
                texCoords.push(tx, ty);
            }
        }

        // Generate indices for triangles
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const i0 = y * (gridSize + 1) + x;
                const i1 = i0 + 1;
                const i2 = i0 + (gridSize + 1);
                const i3 = i2 + 1;

                // Two triangles per quad
                indices.push(i0, i1, i2);
                indices.push(i1, i3, i2);
            }
        }

        this.basePositions = new Float32Array(positions);
        this.texCoords = new Float32Array(texCoords);
        this.indices = new Uint16Array(indices);

        // Create buffers
        this.positionBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();

        // Upload static data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoords, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    }

    /**
     * Warp a texture using control point deformations
     * @param {Image|Canvas} texture - The texture to warp
     * @param {Array} deformations - Array of {x, y, dx, dy} control point deformations
     * @returns {Canvas} - Canvas with warped texture
     */
    warp(texture, deformations = []) {
        const gl = this.gl;

        // Create texture from image
        const glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Apply deformations to mesh
        const positions = new Float32Array(this.basePositions);
        this.applyDeformations(positions, deformations);

        // Upload deformed positions
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

        // Clear and render
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Set up attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.uniform1i(this.textureLocation, 0);

        // Draw mesh
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

        // Cleanup
        gl.deleteTexture(glTexture);

        return this.canvas;
    }

    /**
     * Apply control point deformations to mesh vertices
     * Uses inverse distance weighting for smooth deformation
     */
    applyDeformations(positions, deformations) {
        if (deformations.length === 0) return;

        const gridSize = this.gridSize;

        for (let i = 0; i < positions.length; i += 2) {
            const x = positions[i];
            const y = positions[i + 1];

            let totalWeight = 0;
            let dx = 0;
            let dy = 0;

            // Apply weighted influence from each control point
            for (const def of deformations) {
                // Control point position in NDC
                const cpx = (def.x / this.width) * 2 - 1;
                const cpy = (def.y / this.height) * 2 - 1;

                // Distance from vertex to control point
                const dist = Math.sqrt((x - cpx) ** 2 + (y - cpy) ** 2);

                if (dist < 0.001) {
                    // Vertex is at control point, apply full deformation
                    dx = (def.dx / this.width) * 2;
                    dy = (def.dy / this.height) * 2;
                    totalWeight = 1;
                    break;
                }

                // Inverse distance weighting (higher power = more localized effect)
                const weight = 1 / (dist ** 2);
                totalWeight += weight;

                dx += weight * (def.dx / this.width) * 2;
                dy += weight * (def.dy / this.height) * 2;
            }

            if (totalWeight > 0) {
                positions[i] += dx / totalWeight;
                positions[i + 1] += dy / totalWeight;
            }
        }
    }
}

// Export for use in main app
window.MeshWarper = MeshWarper;
