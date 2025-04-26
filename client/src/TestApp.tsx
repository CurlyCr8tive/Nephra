import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Nephra Test Page</h1>
      <p>If you can see this, the app is working!</p>
      
      <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '0.5rem' }}>
        <h2>Authentication Test</h2>
        <p>This is a simple test to ensure our app can render properly.</p>
        
        <div style={{ marginTop: '1rem' }}>
          <button 
            style={{ 
              backgroundColor: '#0ea5e9', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '0.25rem', 
              cursor: 'pointer' 
            }}
            onClick={() => alert('Button clicked!')}
          >
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestApp;