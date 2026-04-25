import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id);
      localStorage.setItem('hostName', res.data.user.name);
      navigate('/create');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-zinc-900 rounded-xl p-8 border border-zinc-800">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-zinc-500 hover:text-white transition text-sm"
          >
            ← Back
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-2">Create a Host Account</h1>
        <p className="text-zinc-500 text-sm mb-6">Only hosts need an account. Participants and viewers join with just a name.</p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex flex-col gap-4">
          <input
            className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
          />
          <button
            onClick={handleRegister}
            disabled={loading}
            className="bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-zinc-500 text-sm text-center">
            Already have an account?{' '}
            <span
              onClick={() => navigate('/create')}
              className="text-white underline cursor-pointer"
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}