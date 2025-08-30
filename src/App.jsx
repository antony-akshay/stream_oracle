import { useState, useEffect } from 'react';
import { useDevapp, UserButton, DevappProvider } from '@devfunlabs/web-sdk';
import { io } from 'socket.io-client';
import { Trophy, Zap, Target, Clock, Users, Coins, Star, Crown } from 'lucide-react';
const socket = io('wss://ws.dev.fun/app-834546a696ba7c294d95');
export function AppWithProvider() {
  return <DevappProvider rpcEndpoint="https://rpc.dev.fun/834546a696ba7c294d95" devbaseEndpoint="https://devbase.dev.fun" appId="834546a696ba7c294d95">
      <App />
    </DevappProvider>;
}
export default function App() {
  const {
    devbaseClient,
    userWallet
  } = useDevapp();
  const [activeTab, setActiveTab] = useState('markets');
  const [markets, setMarkets] = useState([]);
  const [streamers, setStreamers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [liveViewers, setLiveViewers] = useState(0);
  useEffect(() => {
    loadData();
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    function onUserCount(count) {
      setLiveViewers(count);
    }
    function onMarketUpdate(data) {
      loadMarkets();
    }
    function onBetPlaced(data) {
      loadMarkets();
      loadUserBets();
    }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('devfun:user_count', onUserCount);
    socket.on('market_update', onMarketUpdate);
    socket.on('bet_placed', onBetPlaced);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('devfun:user_count', onUserCount);
      socket.off('market_update', onMarketUpdate);
      socket.off('bet_placed', onBetPlaced);
    };
  }, []);
  const loadData = async () => {
    await Promise.all([loadMarkets(), loadStreamers(), loadLeaderboard(), loadUserBets()]);
  };
  const loadMarkets = async () => {
    try {
      const data = await devbaseClient.listEntities('markets');
      setMarkets(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Error loading markets:', error);
    }
  };
  const loadStreamers = async () => {
    try {
      const data = await devbaseClient.listEntities('streamers');
      setStreamers(data);
    } catch (error) {
      console.error('Error loading streamers:', error);
    }
  };
  const loadLeaderboard = async () => {
    try {
      const data = await devbaseClient.listEntities('leaderboard');
      setLeaderboard(data.sort((a, b) => b.totalWinnings - a.totalWinnings).slice(0, 10));
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };
  const loadUserBets = async () => {
    if (!userWallet) return;
    try {
      const data = await devbaseClient.listEntities('bets', {
        userId: userWallet
      });
      setUserBets(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Error loading user bets:', error);
    }
  };
  const createStreamer = async (name, description, tokenAddress) => {
    if (!userWallet) return;
    try {
      await devbaseClient.createEntity('streamers', {
        name,
        description,
        tokenAddress,
        isActive: true
      });
      await loadStreamers();
      socket.emit('streamer_created', {
        name,
        userWallet
      });
    } catch (error) {
      console.error('Error creating streamer:', error);
    }
  };
  const createMarket = async (streamerId, title, description, category, duration) => {
    if (!userWallet) return;
    try {
      await devbaseClient.createEntity('markets', {
        streamerId,
        title,
        description,
        category,
        duration: parseInt(duration),
        status: 'active'
      });
      await loadMarkets();
      socket.emit('market_created', {
        streamerId,
        title,
        userWallet
      });
    } catch (error) {
      console.error('Error creating market:', error);
    }
  };
  const placeBet = async (marketId, prediction, amount) => {
    if (!userWallet) return;
    try {
      await devbaseClient.createEntity('bets', {
        marketId,
        prediction,
        amount: parseFloat(amount)
      });
      await loadMarkets();
      await loadUserBets();
      socket.emit('bet_placed', {
        marketId,
        prediction,
        amount,
        userWallet
      });
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };
  const resolveMarket = async (marketId, result) => {
    if (!userWallet) return;
    try {
      await devbaseClient.updateEntity('markets', marketId, {
        status: 'resolved',
        result
      });
      await loadMarkets();
      socket.emit('market_resolved', {
        marketId,
        result,
        userWallet
      });
    } catch (error) {
      console.error('Error resolving market:', error);
    }
  };
  const claimRewards = async marketId => {
    if (!userWallet) return;
    try {
      await devbaseClient.createEntity('rewards', {
        marketId
      });
      await loadUserBets();
    } catch (error) {
      console.error('Error claiming rewards:', error);
    }
  };
  const getMarketStats = market => {
    const marketBets = userBets.filter(bet => bet.marketId === market.id);
    const totalPool = marketBets.reduce((sum, bet) => sum + bet.amount, 0);
    const yesBets = marketBets.filter(bet => bet.prediction === 'yes').length;
    const noBets = marketBets.filter(bet => bet.prediction === 'no').length;
    return {
      totalPool,
      yesBets,
      noBets,
      totalBets: yesBets + noBets
    };
  };
  const formatTime = timestamp => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  const formatSOL = amount => {
    return `${amount.toFixed(3)} SOL`;
  };
  const NavButton = ({
    id,
    icon: Icon,
    label,
    isActive,
    onClick
  }) => <button onClick={() => onClick(id)} className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}>
      <Icon size={20} />
      <span className="hidden sm:block">{label}</span>
    </button>;
  return <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
      {}
      <div className="border-b border-gray-800/50 bg-black/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Zap className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    StreamOracle
                  </h1>
                  <p className="text-gray-400 text-sm">Live Prediction Arena</p>
                </div>
              </div>
              
              {isConnected && <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">{liveViewers} viewers</span>
                </div>}
            </div>
            
            <UserButton primaryColor="#8b5cf6" bgColor="#1f2937" textColor="#ffffff" hoverBgColor="#374151" />
          </div>
        </div>
      </div>

      {}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-8 overflow-x-auto">
          <NavButton id="markets" icon={Target} label="Live Markets" isActive={activeTab === 'markets'} onClick={setActiveTab} />
          <NavButton id="streamers" icon={Users} label="Streamers" isActive={activeTab === 'streamers'} onClick={setActiveTab} />
          <NavButton id="leaderboard" icon={Trophy} label="Leaderboard" isActive={activeTab === 'leaderboard'} onClick={setActiveTab} />
          <NavButton id="bets" icon={Coins} label="My Bets" isActive={activeTab === 'bets'} onClick={setActiveTab} />
        </nav>

        {}
        {activeTab === 'markets' && <div className="space-y-8">
            {userWallet && <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="text-purple-400" />
                  Create New Market
                </h2>
                <form onSubmit={e => {
            e.preventDefault();
            const formData = new FormData(e.target);
            createMarket(formData.get('streamerId'), formData.get('title'), formData.get('description'), formData.get('category'), formData.get('duration'));
            e.target.reset();
          }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select name="streamerId" required className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white">
                    <option value="">Select Streamer</option>
                    {streamers.map(streamer => <option key={streamer.id} value={streamer.id}>{streamer.name}</option>)}
                  </select>
                  <input name="title" placeholder="Market title" required className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400" />
                  <input name="description" placeholder="Description" required className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400" />
                  <select name="category" required className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white">
                    <option value="">Category</option>
                    <option value="gameplay">Gameplay</option>
                    <option value="chat">Chat</option>
                    <option value="reactions">Reactions</option>
                    <option value="performance">Performance</option>
                  </select>
                  <input name="duration" type="number" placeholder="Duration (minutes)" required className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400" />
                  <button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105">
                    Create Market
                  </button>
                </form>
              </div>}

            <div className="grid gap-6">
              {markets.map(market => {
            const stats = getMarketStats(market);
            const streamer = streamers.find(s => s.id === market.streamerId);
            const isExpired = Date.now() > market.createdAt + market.duration * 60000;
            const canResolve = market.status === 'active' && isExpired && userWallet;
            return <div key={market.id} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${market.status === 'active' ? 'bg-green-500/20 text-green-400' : market.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              {market.status === 'active' ? 'LIVE' : market.status.toUpperCase()}
                            </span>
                            <span className="text-purple-400 text-sm font-medium">{market.category}</span>
                            {streamer && <span className="text-gray-400 text-sm">by {streamer.name}</span>}
                          </div>
                          <h3 className="text-xl font-bold mb-2">{market.title}</h3>
                          <p className="text-gray-300 mb-4">{market.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-400">{formatSOL(stats.totalPool)}</div>
                          <div className="text-gray-400 text-sm">Total Pool</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">{stats.yesBets}</div>
                          <div className="text-gray-400 text-sm">Yes Bets</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-400">{stats.noBets}</div>
                          <div className="text-gray-400 text-sm">No Bets</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-300">{stats.totalBets}</div>
                          <div className="text-gray-400 text-sm">Total Bets</div>
                        </div>
                      </div>

                      {market.status === 'active' && !isExpired && userWallet && <form onSubmit={e => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  placeBet(market.id, formData.get('prediction'), formData.get('amount'));
                  e.target.reset();
                }} className="flex gap-4">
                          <select name="prediction" required className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                            <option value="">Choose</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                          <input name="amount" type="number" step="0.001" placeholder="Amount (SOL)" required className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400" />
                          <button type="submit" className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-6 py-2 rounded-lg font-semibold transition-all duration-300">
                            Place Bet
                          </button>
                        </form>}

                      {canResolve && <div className="flex gap-2 mt-4">
                          <button onClick={() => resolveMarket(market.id, 'yes')} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition-all duration-300">
                            Resolve: Yes
                          </button>
                          <button onClick={() => resolveMarket(market.id, 'no')} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-all duration-300">
                            Resolve: No
                          </button>
                        </div>}

                      {market.status === 'resolved' && <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Star className="text-blue-400" size={20} />
                            <span className="font-semibold text-blue-400">
                              Market Resolved: {market.result === 'yes' ? 'YES' : 'NO'}
                            </span>
                          </div>
                        </div>}

                      <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                        <span>Created: {formatTime(market.createdAt)}</span>
                        {market.status === 'active' && <span className="flex items-center gap-1">
                            <Clock size={16} />
                            {isExpired ? 'Expired' : `${market.duration}min`}
                          </span>}
                      </div>
                    </div>
                  </div>;
          })}
            </div>
          </div>}

        {}
        {activeTab === 'streamers' && <div className="space-y-8">
            {userWallet && <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users className="text-purple-400" />
                  Add New Streamer
                </h2>
                <form onSubmit={e => {
            e.preventDefault();
            const formData = new FormData(e.target);
            createStreamer(formData.get('name'), formData.get('description'), formData.get('tokenAddress'));
            e.target.reset();
          }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input name="name" placeholder="Streamer name" required className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400" />
                  <input name="description" placeholder="Description" required className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400" />
                  <input name="tokenAddress" placeholder="Token address (optional)" className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400" />
                  <button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105">
                    Add Streamer
                  </button>
                </form>
              </div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {streamers.map(streamer => <div key={streamer.id} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Users className="text-white" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{streamer.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${streamer.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {streamer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4">{streamer.description}</p>
                  {streamer.tokenAddress && <div className="text-sm text-purple-400 font-mono bg-gray-700/50 p-2 rounded-lg mb-4">
                      Token: {streamer.tokenAddress.slice(0, 8)}...{streamer.tokenAddress.slice(-8)}
                    </div>}
                  <div className="text-sm text-gray-400">
                    Added: {formatTime(streamer.createdAt)}
                  </div>
                </div>)}
            </div>
          </div>}

        {}
        {activeTab === 'leaderboard' && <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
                <Trophy className="text-yellow-400" size={32} />
                Top Predictors
              </h2>
              <p className="text-gray-400">The ultimate fortune tellers of StreamOracle</p>
            </div>

            <div className="grid gap-4">
              {leaderboard.map((user, index) => <div key={user.id} className={`rounded-2xl p-6 border transition-all duration-300 ${index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50' : index === 1 ? 'bg-gradient-to-r from-gray-300/20 to-gray-500/20 border-gray-400/50' : index === 2 ? 'bg-gradient-to-r from-orange-400/20 to-orange-600/20 border-orange-500/50' : 'bg-gray-800/50 border-gray-700/50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-gray-400 text-black' : index === 2 ? 'bg-orange-500 text-black' : 'bg-gray-600 text-white'}`}>
                        {index < 3 ? <Crown size={20} /> : index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-lg">
                          {user.userId.slice(0, 8)}...{user.userId.slice(-8)}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {user.totalBets} bets • {user.winRate.toFixed(1)}% win rate
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        {formatSOL(user.totalWinnings)}
                      </div>
                      <div className="text-gray-400 text-sm">Total Winnings</div>
                    </div>
                  </div>
                </div>)}
            </div>
          </div>}

        {}
        {activeTab === 'bets' && <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Coins className="text-purple-400" />
              My Betting History
            </h2>

            {!userWallet ? <div className="text-center py-12">
                <Coins className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400">Connect your wallet to view your bets</p>
              </div> : userBets.length === 0 ? <div className="text-center py-12">
                <Target className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400">No bets placed yet. Start predicting!</p>
              </div> : <div className="grid gap-4">
                {userBets.map(bet => {
            const market = markets.find(m => m.id === bet.marketId);
            const streamer = market ? streamers.find(s => s.id === market.streamerId) : null;
            const isWinner = market?.status === 'resolved' && market.result === bet.prediction;
            const isPending = market?.status === 'active';
            return <div key={bet.id} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg mb-2">{market?.title || 'Unknown Market'}</h3>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${isPending ? 'bg-yellow-500/20 text-yellow-400' : isWinner ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {isPending ? 'PENDING' : isWinner ? 'WON' : 'LOST'}
                            </span>
                            <span className="text-purple-400 text-sm">{market?.category}</span>
                            {streamer && <span className="text-gray-400 text-sm">by {streamer.name}</span>}
                          </div>
                          <div className="text-gray-300">
                            Prediction: <span className={`font-semibold ${bet.prediction === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
                              {bet.prediction.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{formatSOL(bet.amount)}</div>
                          <div className="text-gray-400 text-sm">Bet Amount</div>
                        </div>
                      </div>
                      
                      {market?.status === 'resolved' && isWinner && <div className="flex justify-end">
                          <button onClick={() => claimRewards(market.id)} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2">
                            <Star size={16} />
                            Claim Rewards
                          </button>
                        </div>}
                      
                      <div className="text-sm text-gray-400 mt-4">
                        Placed: {formatTime(bet.createdAt)}
                      </div>
                    </div>;
          })}
              </div>}
          </div>}
      </div>
    </div>;
}