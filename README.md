# 🧭 Pathfinding Visualizer (React + C++ WebAssembly)

🚀 [Live Demo](https://path-finder-henna.vercel.app/)

A high-performance pathfinding visualizer built with **React** and **C++ compiled to WebAssembly (WASM)**.

Unlike normal visualizers that run algorithms in JavaScript, this project executes core graph algorithms in **C++ inside the browser**, making it faster and more system-oriented.

---

# ⚡ What Makes This Different

Most pathfinding visualizers:
- Use only JavaScript
- Focus only on UI animations
- Do not handle performance at scale

This project:
- Uses **C++ (WASM)** for algorithm execution
- Has **hybrid architecture (React + JS + WASM)**
- Supports large grid performance efficiently
- Clearly separates UI and computation logic

---

# 🧠 Algorithms Implemented

- BFS (Shortest path in unweighted grid)
- DFS (Exploration based)
- Dijkstra’s Algorithm (Weighted shortest path)
- A* Search (Heuristic based optimal search)
- Greedy Best First Search (Fast heuristic search)
- **Bidirectional BFS (optimized BFS from both ends)**

---

# 🧱 Features

- Click & drag wall drawing
- Random maze generation
- Clear grid option
- Start and end node selection
- Step-by-step visualization
- Animated path tracking

---

# 🏗️ Architecture

React UI  
→ JavaScript Controller  
→ WebAssembly (C++ Algorithms)  
→ Returns visited nodes + path  
→ React animation system

---

# 🚀 Key Idea

This project demonstrates:
- Graph algorithms in real-world usage
- Trade-offs between BFS, DFS, Dijkstra, A*, Greedy, Bidirectional BFS
- High-performance execution using WebAssembly in browser

---

# 👨‍💻 Author

Aashish Choudhary  
[![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?logo=github&style=flat&logoColor=white)](https://github.com/aashishchoudhary14)
