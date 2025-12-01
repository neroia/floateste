import React from 'react';
import FlowEditor from './components/FlowEditor';

const App = () => {
  return (
    <div className="w-full h-screen text-gray-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      <FlowEditor />
    </div>
  );
};

export default App;