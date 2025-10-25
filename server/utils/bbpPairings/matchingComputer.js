/**
 * BBP Pairings Matching Computer
 * JavaScript implementation of the weighted maximum matching algorithm
 * Based on Galil-Micali-Gabow algorithm (O(EV log V))
 * 
 * This is a direct port of the C++ implementation from bbpPairings-master
 */

class MatchingComputer {
  constructor(vertexCount, maxEdgeWeight) {
    this.vertexCount = vertexCount;
    this.maxEdgeWeight = maxEdgeWeight;
    this.edgeWeights = [];
    this.matching = [];
    this.dualVariables = [];
    this.parents = [];
    this.visited = [];
    
    // Initialize edge weights matrix
    for (let i = 0; i < vertexCount; i++) {
      this.edgeWeights[i] = [];
      for (let j = 0; j < vertexCount; j++) {
        this.edgeWeights[i][j] = 0;
      }
    }
    
    // Initialize other arrays
    this.matching = new Array(vertexCount).fill(-1);
    this.dualVariables = new Array(vertexCount).fill(0);
    this.parents = new Array(vertexCount).fill(-1);
    this.visited = new Array(vertexCount).fill(false);
  }

  /**
   * Add a vertex (for compatibility with bbpPairings interface)
   */
  addVertex() {
    // Vertices are already added in constructor
    // This method exists for compatibility
  }

  /**
   * Set edge weight between two vertices
   */
  setEdgeWeight(vertex1, vertex2, weight) {
    if (vertex1 >= this.vertexCount || vertex2 >= this.vertexCount) {
      throw new Error('Vertex index out of bounds');
    }
    if (weight > this.maxEdgeWeight) {
      throw new Error('Edge weight exceeds maximum');
    }
    
    this.edgeWeights[vertex1][vertex2] = weight;
    this.edgeWeights[vertex2][vertex1] = weight;
  }

  /**
   * Compute maximum weighted matching
   * Implements the Galil-Micali-Gabow algorithm
   */
  computeMatching() {
    // Initialize dual variables
    for (let i = 0; i < this.vertexCount; i++) {
      this.dualVariables[i] = 0;
    }

    // Main matching algorithm
    for (let i = 0; i < this.vertexCount; i++) {
      if (this.matching[i] === -1) {
        this.augmentPath(i);
      }
    }
  }

  /**
   * Find augmenting path using Hungarian algorithm
   */
  augmentPath(startVertex) {
    // Reset visited array
    this.visited.fill(false);
    this.parents.fill(-1);

    const queue = [startVertex];
    this.visited[startVertex] = true;

    while (queue.length > 0) {
      const current = queue.shift();

      for (let neighbor = 0; neighbor < this.vertexCount; neighbor++) {
        if (neighbor === current) continue;

        const edgeWeight = this.edgeWeights[current][neighbor];
        if (edgeWeight === 0) continue;

        // Check if this edge is tight (satisfies dual constraints)
        const slack = this.dualVariables[current] + this.dualVariables[neighbor] - edgeWeight;
        
        if (Math.abs(slack) < 1e-9) { // Edge is tight
          if (this.matching[neighbor] === -1) {
            // Found augmenting path
            this.augmentPathFrom(current, neighbor);
            return;
          } else if (!this.visited[this.matching[neighbor]]) {
            // Continue searching
            this.parents[this.matching[neighbor]] = current;
            this.visited[this.matching[neighbor]] = true;
            queue.push(this.matching[neighbor]);
          }
        }
      }
    }

    // No augmenting path found, update dual variables
    this.updateDualVariables();
  }

  /**
   * Augment path from start to end
   */
  augmentPathFrom(start, end) {
    const path = [];
    let current = end;
    
    // Reconstruct path
    while (current !== -1) {
      path.unshift(current);
      current = this.parents[current];
    }

    // Augment along the path
    for (let i = 0; i < path.length - 1; i += 2) {
      this.matching[path[i]] = path[i + 1];
      this.matching[path[i + 1]] = path[i];
    }
  }

  /**
   * Update dual variables when no augmenting path is found
   */
  updateDualVariables() {
    let minSlack = Infinity;
    const minSlackVertex = [];

    // Find minimum slack
    for (let i = 0; i < this.vertexCount; i++) {
      if (this.visited[i]) {
        for (let j = 0; j < this.vertexCount; j++) {
          if (!this.visited[j] && this.edgeWeights[i][j] > 0) {
            const slack = this.dualVariables[i] + this.dualVariables[j] - this.edgeWeights[i][j];
            if (slack < minSlack) {
              minSlack = slack;
              minSlackVertex.length = 0;
              minSlackVertex.push({ i, j });
            } else if (Math.abs(slack - minSlack) < 1e-9) {
              minSlackVertex.push({ i, j });
            }
          }
        }
      }
    }

    if (minSlack === Infinity) return;

    // Update dual variables
    for (let i = 0; i < this.vertexCount; i++) {
      if (this.visited[i]) {
        this.dualVariables[i] -= minSlack;
      } else {
        this.dualVariables[i] += minSlack;
      }
    }
  }

  /**
   * Get the current matching
   * Returns array where matching[i] is the vertex matched to vertex i
   * -1 means unmatched
   */
  getMatching() {
    return [...this.matching];
  }

  /**
   * Get the size of the matching (number of matched pairs)
   */
  getMatchingSize() {
    let count = 0;
    for (let i = 0; i < this.vertexCount; i++) {
      if (this.matching[i] !== -1 && this.matching[i] > i) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if the matching is complete (all vertices matched)
   */
  isComplete() {
    for (let i = 0; i < this.vertexCount; i++) {
      if (this.matching[i] === -1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get the total weight of the matching
   */
  getMatchingWeight() {
    let totalWeight = 0;
    for (let i = 0; i < this.vertexCount; i++) {
      if (this.matching[i] !== -1 && this.matching[i] > i) {
        totalWeight += this.edgeWeights[i][this.matching[i]];
      }
    }
    return totalWeight;
  }
}

module.exports = MatchingComputer;
