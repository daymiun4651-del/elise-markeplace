import React, { useState, useEffect } from 'react';
import { Package, Gavel, Clock, DollarSign, Star, ShoppingBag, Heart, X, Check, Search, MapPin, Store, Tag, Car, Home, Smartphone, Shirt, Sofa, MoreHorizontal, ChevronRight, MessageCircle, User } from 'lucide-react';

// Firebase will be loaded from CDN
const firebaseConfig = {
  apiKey: "AIzaSyDSB58hz3gNRJyiQ5bbLZx6XkC7iO8gh4Q",
  authDomain: "elise-marketplace.firebaseapp.com",
  projectId: "elise-marketplace",
  storageBucket: "elise-marketplace.firebasestorage.app",
  messagingSenderId: "539976921600",
  appId: "1:539976921600:web:8f463cd1b0e54d4115dee5"
};

// Default items to initialize
const defaultItems = [
  {
    id: "phone",
    name: "Elise's Phone",
    description: "Well-used smartphone. Some scratches on the screen but works perfectly. Comes with original box.",
    image: "📱",
    currentBid: 0,
    minIncrement: 10,
    bidCount: 0,
    endTime: "2024-12-25T18:00:00",
    category: "Electronics",
    location: "Manhattan, NY",
    highestBidder: null
  },
  {
    id: "charger",
    name: "Elise's Charger",
    description: "Fast charging USB-C charger with cable. Works great, just upgraded to a new one.",
    image: "🔌",
    currentBid: 0,
    minIncrement: 2,
    bidCount: 0,
    endTime: "2024-12-24T12:00:00",
    category: "Electronics",
    location: "Manhattan, NY",
    highestBidder: null
  }
];

export default function BuyElisesThings() {
  const [items, setItems] = useState(defaultItems);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidderName, setBidderName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bidHistory, setBidHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = [
    { name: 'All', icon: Store },
    { name: 'Vehicles', icon: Car },
    { name: 'Property', icon: Home },
    { name: 'Electronics', icon: Smartphone },
    { name: 'Clothing', icon: Shirt },
    { name: 'Home Decor', icon: Sofa },
    { name: 'Hobbies', icon: Tag }
  ];

  // Load Firebase from CDN and subscribe to updates
  useEffect(() => {
    let itemsUnsubscribe = () => {};
    let bidsUnsubscribe = () => {};

    const loadFirebase = async () => {
      try {
        // Load Firebase scripts from CDN
        if (!window.firebase) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Initialize Firebase
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(firebaseConfig);
        }

        const db = window.firebase.firestore();

        // Initialize items if they don't exist
        for (const item of defaultItems) {
          const itemRef = db.collection('items').doc(item.id);
          const itemSnap = await itemRef.get();
          if (!itemSnap.exists) {
            await itemRef.set(item);
          }
        }

        // Subscribe to items collection
        itemsUnsubscribe = db.collection('items').onSnapshot((snapshot) => {
          if (!snapshot.empty) {
            const firebaseItems = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setItems(firebaseItems);
          }
          setLoading(false);
        }, (err) => {
          console.error("Error listening to items:", err);
          setError(err.message);
          setLoading(false);
        });

        // Subscribe to bids collection
        bidsUnsubscribe = db.collection('bids').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
          const allBids = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
          }));
          setBidHistory(allBids);
        }, (err) => {
          console.error("Error listening to bids:", err);
        });

      } catch (err) {
        console.error("Error initializing Firebase:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadFirebase();

    return () => {
      itemsUnsubscribe();
      bidsUnsubscribe();
    };
  }, []);

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'All' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleBid = async (e) => {
    if (e) e.preventDefault();
    if (!selectedItem || !bidAmount || !bidderName) return;

    const amount = parseFloat(bidAmount);
    const minBid = selectedItem.currentBid + selectedItem.minIncrement;

    if (amount >= minBid) {
      try {
        const db = window.firebase.firestore();
        
        // Add bid to bids collection
        await db.collection('bids').add({
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          bidderName: bidderName,
          amount: amount,
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update item's current bid
        await db.collection('items').doc(selectedItem.id).update({
          currentBid: amount,
          bidCount: (selectedItem.bidCount || 0) + 1,
          highestBidder: bidderName
        });

        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setSelectedItem(null);
          setBidAmount('');
        }, 2000);
      } catch (error) {
        console.error("Error placing bid:", error);
        alert("Error placing bid: " + error.message);
      }
    }
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(fid => fid !== id)
        : [...prev, id]
    );
  };

  const formatTimeLeft = (endTime) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(timestamp);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Connection Error</h3>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <p className="text-xs text-gray-400">Make sure Firestore is set up in test mode and try refreshing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Facebook-style Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-full">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Elise Marketplace</span>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Marketplace"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MessageCircle className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">E</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 bg-white h-[calc(100vh-56px)] sticky top-14 overflow-y-auto border-r border-gray-200 hidden lg:block">
          <div className="p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Buy Elise's Things</h2>
            <p className="text-sm text-gray-500 mb-4">Unique items looking for new homes</p>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 p-2 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4" />
              <span>New York City · 40 mi</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 px-2">Categories</h3>
              <nav className="space-y-1">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setFilter(cat.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        filter === cat.name
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${filter === cat.name ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm">{cat.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* Recent Bids */}
            <div className="border-t border-gray-200 mt-4 pt-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">Recent Activity</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bidHistory.slice(0, 10).map((bid, index) => (
                  <div key={bid.id || index} className="px-2 py-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{bid.bidderName}</p>
                        <p className="text-xs text-gray-500">
                          ${bid.amount} on {bid.itemName}
                        </p>
                      </div>
                    </div>
                    {bid.timestamp && (
                      <p className="text-xs text-gray-400 mt-1 pl-8">
                        {formatTimestamp(bid.timestamp)}
                      </p>
                    )}
                  </div>
                ))}
                {bidHistory.length === 0 && (
                  <p className="text-xs text-gray-400 px-2">No bids yet</p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Today's picks</h3>
            <p className="text-sm text-gray-500">{filteredItems.length} items available</p>
          </div>
          
          {/* Items Grid - Facebook Marketplace style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => {
                  setSelectedItem(item);
                  setBidAmount((item.currentBid + item.minIncrement).toString());
                }}
              >
                <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
                  <span className="text-6xl group-hover:scale-110 transition-transform">{item.image}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Heart 
                      className={`w-4 h-4 ${
                        favorites.includes(item.id) 
                          ? 'fill-red-500 text-red-500' 
                          : 'text-gray-600'
                      }`} 
                    />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeLeft(item.endTime)}
                  </div>
                </div>
                
                <div className="p-3">
                  <p className="font-bold text-lg text-gray-900">${item.currentBid}</p>
                  <p className="text-sm text-gray-800 line-clamp-2 leading-tight mt-1">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {item.location} · {item.bidCount || 0} bids
                  </p>
                  {item.highestBidder && (
                    <p className="text-xs text-blue-600 mt-1">
                      Leading: {item.highestBidder}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Bid Modal - Facebook style */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden">
            {showSuccess ? (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Bid Placed!</h3>
                <p className="text-gray-500">You're now the highest bidder on {selectedItem.name}</p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Place a Bid</h3>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                {/* Item Preview */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-4xl">{selectedItem.image}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{selectedItem.name}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {selectedItem.location}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-lg font-bold text-gray-900">${selectedItem.currentBid}</span>
                        <span className="text-sm text-gray-500">{selectedItem.bidCount || 0} bids</span>
                      </div>
                      {selectedItem.highestBidder && (
                        <p className="text-xs text-blue-600 mt-1">
                          Current leader: {selectedItem.highestBidder}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Bid Form */}
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={bidderName}
                      onChange={(e) => setBidderName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Bid (min ${selectedItem.currentBid + selectedItem.minIncrement})
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={selectedItem.currentBid + selectedItem.minIncrement}
                        step={selectedItem.minIncrement}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md font-semibold hover:bg-gray-200 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBid}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 transition-colors text-sm"
                  >
                    Place Bid
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
