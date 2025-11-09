🎨 Six Degrees of the Art Museum
Authors

Olivia Duan (od0883@princeton.edu)

Emily Zou (ez6698@princeton.edu)

Sophia Chen (sc2031@princeton.edu)


🖼️ Introduction

Six Degrees of the Art Museum was developed during HackPrinceton 2025 as an interactive exploration of the Princeton University Art Museum’s collection.

Inspired by the concept of “six degrees of separation,” our game challenges users to find the shortest chain of connections between two artworks using the factors artist, style, material, period, text, and department.
It transforms art history into a puzzle of relationships and networks, combining technology, creativity, and curiosity.

🧭 Overview

Six Degrees is a web-based interactive game powered by Python (Django) and a React frontend.
Users can:

Explore 100+ sample artworks from the Princeton Art Museum API

Pick one piece and find the shortest “path” connecting it to a given a target

Visualize relationships through an interactive graph network

Discover contextual metadata about each artwork and maker

The system dynamically constructs a weighted graph, where each node represents an artwork and edges represent shared properties.
A custom weighted Breadth-First Search (BFS) algorithm finds the minimal “degree” separation.

🧠 Methodology
Backend

Built with Django REST Framework

Fetches live data from the Princeton Art Museum API

Stores artworks and makers in a local database

Generates relationship graphs using NetworkX

Runs a weighted BFS to compute shortest connections

Frontend

Built with React + Vite

Uses D3.js / Recharts for network visualization

Interactive interface for selecting start and target artworks

Displays metadata (artist, culture, year, medium) in cards and modals

Data Flow

Backend imports art objects via the Princeton API

Artworks are stored locally with normalized attributes

The graph generator builds connections based on similarity weights

BFS returns the shortest path between selected works

Frontend visualizes the connection as a live art network

⚙️ Challenges:
Our biggest challenge was ensuring that our algorithm remained efficient when processing a large number of images. With so much data, it was easy for the system’s performance to slow down or “blow up” as the workload increased. We had to carefully optimize the algorithm to handle image-heavy operations smoothly without compromising accuracy or speed. We overcame this challenge by testing different types of connections, such as removing the material connection. We also limited the connections by focusing more on the stronger connections and negated the weaker connections, which made our algorithm run smoother.


💡 What We Learned: 
Through this project, we learned how to balance functionality with performance, especially when dealing with large datasets. We gained a deeper understanding of optimizing algorithms for scalability, integrating frontend and backend systems, and debugging complex interactions between them. This experience also helped us improve our collaboration and version control skills using Git and GitHub.

🚀 Future Work:

Future improvements include:
In the future, we plan to enhance the efficiency of our algorithm further and explore ways to automate image categorization. We also hope to add more interactive features to the user interface and improve data visualization. Expanding the dataset and implementing machine learning models to refine image relationships are potential next steps for making the project more robust and intelligent.

Potential features to develop concern increasing user engagement. A working CAS authentification system can generate user profiles that save histories of games played, and least amount of connections, and keep track of log-in streaks for daily engagement. Perhaps the same sample of objects can also be generated each day for users to compete against each other and a public leaderboard feature could be implemented. 

In addition, the ability to choose easy, medium, and hard modes that change the amount of ghints you receieve, the amount of connections away the target is, and the amount of connections suggested per art object would lead to more user engagement (perhaps develop a similar model to NYT Pips). We could also implement a free-play or arcade mode, where the user can play endless medium mode games. 

It would also be informative to have a brief text blurb about the target piece upon victory (reference texts field from objects JSON data).