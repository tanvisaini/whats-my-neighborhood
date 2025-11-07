import { useState, useEffect } from 'react';
import { Music, Users, TrendingUp } from 'lucide-react';

export default function SpotifyNeighborhood() {
  const [user, setUser] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [neighborhood, setNeighborhood] = useState(null);
  const [loading, setLoading] = useState(false);

  const CLIENT_ID = '983e8c61011a4ea0a7036be122845985';
  const REDIRECT_URI = 'https://whats-my-neighborhood.vercel.app/';
  const SCOPES = 'user-top-read user-read-private';

  const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({length}, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
  };

  const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
  };

  const base64urlencode = (arrayBuffer) => {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const handleLogin = async () => {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    const state = btoa(JSON.stringify({ verifier: codeVerifier, random: generateRandomString(16) }));

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    const params = {
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state: state,
    };

    authUrl.search = new URLSearchParams(params).toString();
    console.log('Starting OAuth flow with state:', state);
    window.location.href = authUrl.toString();
  };

  const getAccessToken = async (code, codeVerifier) => {
    console.log('Exchanging code for token...');
    console.log('Code:', code);
    console.log('Code verifier present:', !!codeVerifier);

    if (!codeVerifier) {
      console.error('No code verifier provided!');
      return { error: 'No code verifier found' };
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();
    console.log('Token response:', data);
    
    if (!response.ok) {
      console.error('Token exchange failed:', data);
    }
    
    return data;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    console.log('Checking for auth code...');
    console.log('Code present:', !!code);
    console.log('State present:', !!state);

    if (code && state) {
      try {
        const stateData = JSON.parse(atob(state));
        const codeVerifier = stateData.verifier;
        
        console.log('Code verifier recovered from state:', !!codeVerifier);
        
        setLoading(true);
        getAccessToken(code, codeVerifier)
          .then(data => {
            if (data.access_token) {
              fetchSpotifyData(data.access_token);
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              console.error('No access token received:', data);
              setLoading(false);
            }
          })
          .catch(error => {
            console.error('Error getting access token:', error);
            setLoading(false);
          });
      } catch (error) {
        console.error('Error decoding state:', error);
        setLoading(false);
      }
    }
  }, []);

  const fetchSpotifyData = async (token) => {
    try {
      const [userRes, tracksRes] = await Promise.all([
        fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=medium_term', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const userData = await userRes.json();
      const tracksData = await tracksRes.json();

      setUser(userData);
      setTopTracks(tracksData.items || []);
      
      analyzeNeighborhood(tracksData.items || []);
    } catch (error) {
      console.error('Error fetching Spotify data:', error);
    }
    setLoading(false);
  };

  const analyzeNeighborhood = (tracks) => {
    const artists = {};
    
    tracks.forEach(track => {
      track.artists.forEach(artist => {
        artists[artist.name] = (artists[artist.name] || 0) + 1;
      });
    });

    const artistNames = Object.keys(artists).join(' ').toLowerCase();
    const trackNames = tracks.map(t => t.name).join(' ').toLowerCase();
    const allText = artistNames + ' ' + trackNames;

    let hood = null;

    // TODO: mock data to change soon
    if (allText.includes('drake') || allText.includes('travis') || allText.includes('kendrick') || allText.includes('kanye')) {
      hood = {
        name: 'Hip-Hop Heights',
        icon: '🎤',
        description: 'You vibe with beats, bars, and culture. Your playlist is a cipher.',
        color: 'from-purple-500 to-pink-500'
      };
    } else if (allText.includes('taylor') || allText.includes('ariana') || allText.includes('billie') || allText.includes('olivia')) {
      hood = {
        name: 'Pop Boulevard',
        icon: '✨',
        description: 'Living for the hooks and melodies. Your taste is chart-topping energy.',
        color: 'from-pink-500 to-rose-500'
      };
    } else if (allText.includes('rock') || allText.includes('metal') || allText.includes('punk')) {
      hood = {
        name: 'Rock District',
        icon: '🎸',
        description: 'You keep it loud and real. Distortion is your language.',
        color: 'from-red-500 to-orange-500'
      };
    } else if (allText.includes('jazz') || allText.includes('soul') || allText.includes('blues')) {
      hood = {
        name: 'Soul Street',
        icon: '🎷',
        description: 'Smooth, sophisticated, and timeless. You appreciate the classics.',
        color: 'from-amber-500 to-yellow-500'
      };
    } else if (allText.includes('electronic') || allText.includes('edm') || allText.includes('techno')) {
      hood = {
        name: 'Electronic Avenue',
        icon: '🎧',
        description: 'You live in the future. Synths and drops are your heartbeat.',
        color: 'from-cyan-500 to-blue-500'
      };
    } else {
      hood = {
        name: 'Eclectic Junction',
        icon: '🎵',
        description: 'Your taste is unique and diverse. You defy categorization.',
        color: 'from-indigo-500 to-purple-500'
      };
    }

    setNeighborhood(hood);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Analyzing your music taste...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h1 className="text-3xl font-bold text-white mb-2">Music Neighborhoods</h1>
          <p className="text-gray-300 mb-6">
            Connect your Spotify to discover which music neighborhood you belong to based on your listening habits
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-full transition"
          >
            Connect with Spotify
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Using Authorization Code Flow with PKCE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* User header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            {user.images?.[0] && (
              <img src={user.images[0].url} alt="Profile" className="w-16 h-16 rounded-full" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">{user.display_name}</h2>
              <p className="text-gray-300">@{user.id}</p>
            </div>
          </div>
        </div>

        {/* Neighborhood assignment */}
        {neighborhood && (
          <div className={`bg-gradient-to-r ${neighborhood.color} rounded-2xl p-8 mb-6 text-white`}>
            <div className="flex items-start gap-4">
              <div className="text-6xl">{neighborhood.icon}</div>
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-2">Welcome to {neighborhood.name}</h3>
                <p className="text-lg opacity-90">{neighborhood.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top tracks */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-xl font-bold text-white">Your Top Tracks</h3>
          </div>
          <div className="space-y-3">
            {topTracks.slice(0, 10).map((track, idx) => (
              <div key={track.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition">
                <span className="text-gray-400 font-mono text-sm w-6">{idx + 1}</span>
                {track.album.images[2] && (
                  <img src={track.album.images[2].url} alt={track.name} className="w-12 h-12 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{track.name}</div>
                  <div className="text-gray-400 text-sm truncate">
                    {track.artists.map(a => a.name).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
