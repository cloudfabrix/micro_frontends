import React from 'react';
import TopologyGraph from './TopologyGraph.jsx';

// Application root component. Renders the network topology graph.
function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <TopologyGraph />
    </div>
  );
}

export default App;