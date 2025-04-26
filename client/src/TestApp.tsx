import React, { useState, useEffect } from 'react';

function TestApp() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');

  // Load user on initial render
  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      try {
        // Try to get from localStorage first
        const savedUser = localStorage.getItem('nephra_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // Then verify with the server
        const res = await fetch('/api/user', { 
          credentials: 'include' 
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          localStorage.setItem('nephra_user', JSON.stringify(userData));
          console.log('User authenticated from API:', userData.username);
        } else if (res.status === 401) {
          console.log('Not authenticated with server');
          setUser(null);
          localStorage.removeItem('nephra_user');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        // If network error but we have saved user, keep them
        const savedUser = localStorage.getItem('nephra_user');
        if (savedUser && !user) {
          console.log('Using cached user from localStorage');
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUser();
  }, []);

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMessage('Logging in...');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('nephra_user', JSON.stringify(userData));
        setLoginMessage('Login successful!');
        console.log('Logged in as:', userData.username);
      } else {
        setLoginMessage('Login failed. Please check your credentials.');
        console.error('Login failed:', await res.text());
      }
    } catch (err) {
      setLoginMessage('Error connecting to server');
      console.error('Login error:', err);
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setUser(null);
      localStorage.removeItem('nephra_user');
      setLoginMessage('');
      console.log('Logged out successfully');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Styles
  const styles = {
    container: { padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' },
    header: { borderBottom: '1px solid #eaeaea', paddingBottom: '1rem', marginBottom: '2rem' },
    card: { padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '0.5rem', marginBottom: '1.5rem' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    input: { padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ccc' },
    button: { 
      backgroundColor: '#0ea5e9', 
      color: 'white', 
      border: 'none', 
      padding: '0.5rem 1rem', 
      borderRadius: '0.25rem', 
      cursor: 'pointer' 
    },
    message: { marginTop: '1rem', color: loginMessage.includes('success') ? 'green' : 'red' },
    profileCard: { backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' },
    profileData: { backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '0.25rem', overflow: 'auto' }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <h2>Loading...</h2>
        <p>Please wait while we retrieve your session...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Nephra Authentication Test</h1>
        <p>Simple authentication demo to verify login functionality</p>
      </div>
      
      {user ? (
        // Authenticated view
        <div style={styles.card}>
          <h2>Welcome, {user.username}!</h2>
          <p>You are successfully logged in.</p>
          
          <div style={styles.profileCard}>
            <h3>Your Profile</h3>
            <pre style={styles.profileData}>
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <button 
            style={{...styles.button, marginTop: '1rem', backgroundColor: '#ef4444'}} 
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      ) : (
        // Login form
        <div style={styles.card}>
          <h2>Login</h2>
          <form style={styles.form} onSubmit={handleLogin}>
            <div>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button type="submit" style={styles.button}>
              Login
            </button>
            
            {loginMessage && <p style={styles.message}>{loginMessage}</p>}
          </form>
        </div>
      )}
      
      <div style={styles.card}>
        <h3>Test Credentials</h3>
        <p>You can use these test credentials:</p>
        <ul>
          <li><strong>Username:</strong> demouser</li>
          <li><strong>Password:</strong> demopass</li>
        </ul>
      </div>
    </div>
  );
}

export default TestApp;