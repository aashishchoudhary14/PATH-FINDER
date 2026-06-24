#include <emscripten/bind.h>
#include <vector>
#include <queue>
#include <stack>
#include <algorithm>
#include <map>
#include <limits>
#include <cmath>
#include <set>

using namespace emscripten;

struct Result {
    std::vector<int> visitedOrder;
    std::vector<int> shortestPath;
};

std::vector<int> getNeighbors(int node, int rows, int cols) {
    std::vector<int> neighbors;
    int r = node / cols;
    int c = node % cols;

    if (r > 0) neighbors.push_back(node - cols); 
    if (r < rows - 1) neighbors.push_back(node + cols); 
    if (c > 0) neighbors.push_back(node - 1); 
    if (c < cols - 1) neighbors.push_back(node + 1); 

    return neighbors;
}

int calculateHeuristic(int nodeA, int nodeB, int cols) {
    int rA = nodeA / cols;
    int cA = nodeA % cols;
    int rB = nodeB / cols;
    int cB = nodeB % cols;
    return std::abs(rA - rB) + std::abs(cA - cB);
}

Result solveGraph(std::vector<int> grid, int rows, int cols, int startNode, int finishNode, std::string algo) {
    std::vector<int> visitedOrder;
    std::vector<int> parent(rows * cols, -1);
    std::vector<bool> visited(rows * cols, false);
    
    // Dijkstra / A* / Greedy
    std::vector<int> dist(rows * cols, std::numeric_limits<int>::max());

    if (algo == "bfs") {
        std::queue<int> q;
        q.push(startNode);
        visited[startNode] = true;

        while (!q.empty()) {
            int curr = q.front();
            q.pop();
            visitedOrder.push_back(curr);

            if (curr == finishNode) break;

            for (int neighbor : getNeighbors(curr, rows, cols)) {
                if (!visited[neighbor] && grid[neighbor] != 1) { 
                    visited[neighbor] = true;
                    parent[neighbor] = curr;
                    q.push(neighbor);
                }
            }
        }
    } 
    else if (algo == "dfs") {
        std::stack<int> s;
        s.push(startNode);

        while (!s.empty()) {
            int curr = s.top();
            s.pop();

            if (visited[curr]) continue;
            visited[curr] = true;
            visitedOrder.push_back(curr);

            if (curr == finishNode) break;

            for (int neighbor : getNeighbors(curr, rows, cols)) {
                if (!visited[neighbor] && grid[neighbor] != 1) {
                    parent[neighbor] = curr; 
                    s.push(neighbor);
                }
            }
        }
    }
    else if (algo == "dijkstra") {
        auto cmp = [](std::pair<int, int> left, std::pair<int, int> right) { return left.first > right.first; };
        std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, decltype(cmp)> pq(cmp);

        dist[startNode] = 0;
        pq.push({0, startNode});

        while (!pq.empty()) {
            int d = pq.top().first;
            int curr = pq.top().second;
            pq.pop();

            if (visited[curr]) continue;
            visited[curr] = true;
            visitedOrder.push_back(curr);

            if (curr == finishNode) break;

            for (int neighbor : getNeighbors(curr, rows, cols)) {
                if (grid[neighbor] == 1) continue; 
                
                int newDist = d + 1;
                if (newDist < dist[neighbor]) {
                    dist[neighbor] = newDist;
                    parent[neighbor] = curr;
                    pq.push({newDist, neighbor});
                }
            }
        }
    }
    else if (algo == "astar") {
        // Pair: {f_score, node_index}
        auto cmp = [](std::pair<int, int> left, std::pair<int, int> right) { return left.first > right.first; };
        std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, decltype(cmp)> pq(cmp);

        dist[startNode] = 0; 
        pq.push({0, startNode});

        std::vector<int> gScore(rows * cols, std::numeric_limits<int>::max());
        gScore[startNode] = 0;

        while (!pq.empty()) {
            int curr = pq.top().second;
            pq.pop();

            if (visited[curr]) continue;
            visited[curr] = true;
            visitedOrder.push_back(curr);

            if (curr == finishNode) break;

            for (int neighbor : getNeighbors(curr, rows, cols)) {
                if (grid[neighbor] == 1) continue;

                int tentative_gScore = gScore[curr] + 1;
                if (tentative_gScore < gScore[neighbor]) {
                    parent[neighbor] = curr;
                    gScore[neighbor] = tentative_gScore;
                    int fScore = tentative_gScore + calculateHeuristic(neighbor, finishNode, cols);
                    pq.push({fScore, neighbor});
                }
            }
        }
    }
    else if (algo == "greedy") {
        // Priority based ONLY on heuristic
        auto cmp = [](std::pair<int, int> left, std::pair<int, int> right) { return left.first > right.first; };
        std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, decltype(cmp)> pq(cmp);

        pq.push({calculateHeuristic(startNode, finishNode, cols), startNode});

        while (!pq.empty()) {
            int curr = pq.top().second;
            pq.pop();

            if (visited[curr]) continue;
            visited[curr] = true;
            visitedOrder.push_back(curr);

            if (curr == finishNode) break;

            for (int neighbor : getNeighbors(curr, rows, cols)) {
                if (!visited[neighbor] && grid[neighbor] != 1) {
                    parent[neighbor] = curr;
                    pq.push({calculateHeuristic(neighbor, finishNode, cols), neighbor});
                }
            }
        }
    }
    else if (algo == "bidirectional") {
        std::queue<int> qStart;
        std::queue<int> qFinish;
        std::vector<bool> visitedStart(rows * cols, false);
        std::vector<bool> visitedFinish(rows * cols, false);
        std::vector<int> parentStart(rows * cols, -1);
        std::vector<int> parentFinish(rows * cols, -1);

        qStart.push(startNode);
        visitedStart[startNode] = true;
        
        qFinish.push(finishNode);
        visitedFinish[finishNode] = true;

        int intersectNode = -1;

        while (!qStart.empty() && !qFinish.empty()) {
            // Expansion from Start
            if (!qStart.empty()) {
                int curr = qStart.front();
                qStart.pop();
                visitedOrder.push_back(curr);
                
                if (visitedFinish[curr]) {
                    intersectNode = curr;
                    break;
                }

                for (int neighbor : getNeighbors(curr, rows, cols)) {
                    if (!visitedStart[neighbor] && grid[neighbor] != 1) {
                        visitedStart[neighbor] = true;
                        parentStart[neighbor] = curr;
                        qStart.push(neighbor);
                    }
                }
            }

            // Expansion from Finish
            if (!qFinish.empty()) {
                int curr = qFinish.front();
                qFinish.pop();
                visitedOrder.push_back(curr);

                if (visitedStart[curr]) {
                    intersectNode = curr;
                    break;
                }

                for (int neighbor : getNeighbors(curr, rows, cols)) {
                    if (!visitedFinish[neighbor] && grid[neighbor] != 1) {
                        visitedFinish[neighbor] = true;
                        parentFinish[neighbor] = curr;
                        qFinish.push(neighbor);
                    }
                }
            }
        }

        // Reconstruct Bidirectional Path
        std::vector<int> shortestPath;
        if (intersectNode != -1) {
            int curr = intersectNode;
            while (curr != -1) {
                shortestPath.push_back(curr);
                curr = parentStart[curr];
            }
            std::reverse(shortestPath.begin(), shortestPath.end());
            
            curr = parentFinish[intersectNode];
            while (curr != -1) {
                shortestPath.push_back(curr);
                curr = parentFinish[curr];
            }
        }
        return {visitedOrder, shortestPath};
    }

    std::vector<int> shortestPath;
    if (algo != "bidirectional") {
        int curr = finishNode;
        while (curr != -1) {
            shortestPath.insert(shortestPath.begin(), curr);
            curr = parent[curr];
            if (curr == startNode) {
                shortestPath.insert(shortestPath.begin(), startNode);
                break;
            }
        }
        if (shortestPath.size() > 0 && shortestPath[0] != startNode) {
            shortestPath.clear();
        }
    }

    return {visitedOrder, shortestPath};
}

EMSCRIPTEN_BINDINGS(my_module) {
    value_object<Result>("Result")
        .field("visitedOrder", &Result::visitedOrder)
        .field("shortestPath", &Result::shortestPath);

    register_vector<int>("VectorInt");
    
    function("solveGraph", &solveGraph);
}