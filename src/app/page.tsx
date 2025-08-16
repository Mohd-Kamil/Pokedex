'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

interface Pokemon {
  id: number;
  name: string;
  type: string;
  height: number;
  weight: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAttack: number;
  specialDefense: number;
  imageUrl?: string;
  description?: string;
}

interface PokemonDetail {
  pokemon: Pokemon;
  evolutions: string[];
}

export default function Home() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [pokemonDetail, setPokemonDetail] = useState<PokemonDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'stats' | 'evolutions'>('about');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const currentPokemonRequest = useRef<number | null>(null);

  // Debounce search term with improved handling
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update searching state immediately when searchTerm changes
  useEffect(() => {
    setIsSearching(searchTerm.length > 0);
  }, [searchTerm]);

  useEffect(() => {
    console.log('Fetching Pokemon data...');
    fetch('/api/pokemon')
      .then(res => {
        console.log('API response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Received Pokemon data:', data);
        console.log('Number of Pokemon:', data.length);
        
        // Ensure data is an array
        const pokemonArray = Array.isArray(data) ? data : [];
        
        if (pokemonArray.length === 0) {
          console.warn('No Pokemon received from API, using fallback data');
          // Use fallback data
          const fallbackPokemon = [
            {
              id: 1,
              name: 'bulbasaur',
              type: 'grass/poison',
              height: 0.7,
              weight: 6.9,
              hp: 45,
              attack: 49,
              defense: 49,
              speed: 45,
              specialAttack: 65,
              specialDefense: 65,
              imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
              description: 'A strange seed was planted on its back at birth.'
            },
            {
              id: 4,
              name: 'charmander',
              type: 'fire',
              height: 0.6,
              weight: 8.5,
              hp: 39,
              attack: 52,
              defense: 43,
              speed: 65,
              specialAttack: 60,
              specialDefense: 50,
              imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
              description: 'Obviously prefers hot places.'
            },
            {
              id: 7,
              name: 'squirtle',
              type: 'water',
              height: 0.5,
              weight: 9.0,
              hp: 44,
              attack: 48,
              defense: 65,
              speed: 43,
              specialAttack: 50,
              specialDefense: 64,
              imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
              description: 'After birth, its back swells and hardens into a shell.'
            }
          ];
          setPokemon(fallbackPokemon);
          setFilteredPokemon(fallbackPokemon);
        } else {
          setPokemon(pokemonArray);
          setFilteredPokemon(pokemonArray);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching Pokemon:', error);
        // Use fallback data on error
        const fallbackPokemon = [
          {
            id: 25,
            name: 'pikachu',
            type: 'electric',
            height: 0.4,
            weight: 6.0,
            hp: 35,
            attack: 55,
            defense: 40,
            speed: 90,
            specialAttack: 50,
            specialDefense: 50,
            imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
            description: 'When several of these Pokemon gather, their electricity could build and cause lightning storms.'
          }
        ];
        setPokemon(fallbackPokemon);
        setFilteredPokemon(fallbackPokemon);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = pokemon;

    if (debouncedSearchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.type.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type.includes(typeFilter));
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'hp':
          return b.hp - a.hp;
        case 'attack':
          return b.attack - a.attack;
        case 'defense':
          return b.defense - a.defense;
        case 'speed':
          return b.speed - a.speed;
        default:
          return a.id - b.id;
      }
    });

    setFilteredPokemon(filtered);
    setCurrentPage(1);
  }, [pokemon, debouncedSearchTerm, typeFilter, sortBy]);

  const handlePokemonClick = async (pokemon: Pokemon) => {
    // Set the current request ID
    currentPokemonRequest.current = pokemon.id;
    
    setSelectedPokemon(pokemon);
    setDetailLoading(true);
    setActiveTab('about');
    setPokemonDetail(null); // Clear previous details immediately
    
    try {
      const response = await fetch(`/api/pokemon/${pokemon.id}`);
      const data = await response.json();
      
      // Only update if this is still the current request (prevent race conditions)
      if (currentPokemonRequest.current === pokemon.id) {
        setPokemonDetail(data);
      }
    } catch (error) {
      console.error('Error fetching Pokemon details:', error);
      // Create a fallback detail object using the clicked pokemon
      if (currentPokemonRequest.current === pokemon.id) {
        setPokemonDetail({
          pokemon: pokemon,
          evolutions: []
        });
      }
    } finally {
      if (currentPokemonRequest.current === pokemon.id) {
        setDetailLoading(false);
      }
    }
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Fire': 'bg-red-600 text-white',
      'Water': 'bg-blue-600 text-white',
      'Grass': 'bg-green-600 text-white',
      'Electric': 'bg-yellow-500 text-black',
      'Psychic': 'bg-purple-600 text-white',
      'Normal': 'bg-gray-600 text-white',
      'Dragon': 'bg-indigo-600 text-white',
      'Fairy': 'bg-pink-500 text-white',
      'Poison': 'bg-purple-800 text-white',
      'Flying': 'bg-sky-500 text-white',
      'Bug': 'bg-green-700 text-white',
      'Ground': 'bg-yellow-700 text-white',
      'Rock': 'bg-yellow-800 text-white',
      'Fighting': 'bg-red-700 text-white',
      'Ghost': 'bg-purple-900 text-white',
      'Ice': 'bg-cyan-500 text-black',
      'Steel': 'bg-gray-700 text-white',
      'Dark': 'bg-gray-900 text-white',
    };
    return colors[type.split('/')[0]] || 'bg-gray-600 text-white';
  };

  const formatStat = (stat: number) => {
    return stat.toString().padStart(3, '0');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setSortBy('id');
  };

  const uniqueTypes = useMemo(() => Array.from(new Set(pokemon.flatMap(p => p.type.split('/')))), [pokemon]);

  // Memoize pagination calculations to prevent unnecessary re-renders
  const totalPages = useMemo(() => Math.ceil(filteredPokemon.length / itemsPerPage), [filteredPokemon.length, itemsPerPage]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const currentPokemon = useMemo(() => filteredPokemon.slice(startIndex, startIndex + itemsPerPage), [filteredPokemon, startIndex, itemsPerPage]);

  // Smooth page navigation
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  const StatBar = ({ value, max = 255, color }: { value: number; max?: number; color: string }) => {
    return (
    <div className="flex items-center gap-2">
      <span className="text-sm retro-font w-8 text-right">{value}</span>
      <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
};

  const PokedexHeader = () => {
    return (
    <div className="pokedex-red rounded-t-lg p-6 border-b-4 border-red-900 relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.1) 10px,
            rgba(255,255,255,0.1) 20px
          )`
        }}></div>
      </div>
      
      {/* Classic Pokedex design elements */}
      <div className="absolute top-4 left-4 w-10 h-10 bg-red-800 rounded-full border-3 border-red-900 flex items-center justify-center shadow-lg">
        <div className="w-5 h-5 bg-red-400 rounded-full animate-pulse"></div>
      </div>
      <div className="absolute top-4 right-4 w-8 h-8 bg-green-400 rounded-full border-2 border-green-600 shadow-lg"></div>
      <div className="absolute top-4 right-16 w-8 h-8 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-lg"></div>
      
      {/* Background Pokeball - larger and more prominent */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5 opacity-20">
        <div className="w-48 h-48 relative">
          <div className="absolute inset-0 bg-red-500 rounded-full border-8 border-black shadow-2xl"></div>
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-black transform -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white rounded-full border-4 border-black transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-inner"></div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-red-700 rounded-full opacity-15"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-3 border-red-600 rounded-full opacity-20"></div>
      
      <div className="text-center pt-4 relative z-10">
        <h1 className="text-white text-5xl font-black mb-2 pixel-font glow-text tracking-wider transform scale-110">
          ◆ POKEDEX ◆
        </h1>
        <div className="text-red-200 text-sm retro-font tracking-widest mb-1">
          NATIONAL POKÉDEX
        </div>
        <div className="text-red-300 text-xs digital-font tracking-wider">
          VERSION X • GEN I-IX • 1000+ POKEMON
        </div>
      </div>
    </div>
  );
};

  const PokedexControls = () => {
    return (
    <div className="pokedex-gray p-4 border-b-2 border-gray-700">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="SEARCH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-40 bg-gray-800 border-2 border-gray-600 text-white placeholder-gray-400 px-3 py-2 rounded-lg text-sm retro-font focus:border-blue-500 focus:outline-none transition-colors"
              // Prevent form submission on Enter
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center gap-1">
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
          
          <div className="relative">
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-32 bg-gray-800 border-2 border-gray-600 text-white px-3 py-2 rounded-lg text-sm retro-font focus:border-blue-500 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="all">ALL TYPES</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-32 bg-gray-800 border-2 border-gray-600 text-white px-3 py-2 rounded-lg text-sm retro-font focus:border-blue-500 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="id">SORT BY ID</option>
              <option value="name">SORT BY NAME</option>
              <option value="hp">SORT BY HP</option>
              <option value="attack">SORT BY ATTACK</option>
              <option value="defense">SORT BY DEFENSE</option>
              <option value="speed">SORT BY SPEED</option>
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-gray-800 border-2 border-gray-600 px-3 py-2 rounded-lg">
            <span className="text-white text-sm retro-font">
              <span className="text-blue-400">{filteredPokemon.length}</span> / <span className="text-green-400">{pokemon.length}</span>
            </span>
          </div>
          
          <div className="flex gap-1">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pokedex-button bg-gray-800 border-2 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pokedex-button bg-gray-800 border-2 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  const PokemonList = () => {
    return (
    <div className="pokedex-screen p-4 min-h-[500px] border-b-2 border-gray-600 crt-effect">
      <div className="grid grid-cols-3 gap-2">
        {loading ? (
          Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="pokemon-card p-2">
              <div className="w-full h-16 bg-gray-200 mb-1 rounded"></div>
              <div className="w-3/4 h-3 bg-gray-200 mx-auto rounded"></div>
            </div>
          ))
        ) : (
          currentPokemon.map((p) => (
            <div 
              key={p.id}
              className="pokemon-card p-2 cursor-pointer scanline"
              onClick={() => handlePokemonClick(p)}
            >
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1 retro-font">#{formatStat(p.id)}</div>
                <div className="w-12 h-12 mx-auto mb-1">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-xs font-bold capitalize mb-1 retro-font">{p.name}</div>
                <div className="flex justify-center gap-1">
                  <span className="bg-red-600 text-white text-xs px-1 py-0 rounded retro-font">
                    {p.type.split('/')[0]}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {currentPokemon.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8 retro-font">
          NO POKEMON FOUND
        </div>
      )}
    </div>
  );
};

  const PokemonDetail = ({ pokemon }: { pokemon: Pokemon }) => {
    // Use API data when available, but fallback to clicked Pokemon for basic info
    const displayPokemon = pokemonDetail?.pokemon ? { 
      ...pokemonDetail.pokemon, // API data takes precedence
      // Only fallback to original if API data is missing
      id: pokemonDetail.pokemon.id || pokemon.id,
      name: pokemonDetail.pokemon.name || pokemon.name,
      type: pokemonDetail.pokemon.type || pokemon.type,
      height: pokemonDetail.pokemon.height || pokemon.height,
      weight: pokemonDetail.pokemon.weight || pokemon.weight,
      hp: pokemonDetail.pokemon.hp || pokemon.hp,
      attack: pokemonDetail.pokemon.attack || pokemon.attack,
      defense: pokemonDetail.pokemon.defense || pokemon.defense,
      speed: pokemonDetail.pokemon.speed || pokemon.speed,
      specialAttack: pokemonDetail.pokemon.specialAttack || pokemon.specialAttack,
      specialDefense: pokemonDetail.pokemon.specialDefense || pokemon.specialDefense,
      // Prioritize API image URL, fallback to original
      imageUrl: pokemonDetail.pokemon.imageUrl || pokemon.imageUrl,
      description: pokemonDetail.pokemon.description || pokemon.description
    } : pokemon;
    const evolutions = pokemonDetail?.evolutions || [];

    return (
      <div className="pokedex-screen p-4 min-h-[500px] border-b-2 border-gray-600 crt-effect">
        <div className="pokemon-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => {
                currentPokemonRequest.current = null; // Clear current request
                setSelectedPokemon(null);
                setPokemonDetail(null);
              }}
              className="pokedex-button text-white hover:bg-gray-600 px-3 py-1 rounded text-sm flex items-center gap-1 retro-font"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
              </svg>
              BACK
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold capitalize retro-font">{displayPokemon.name}</h2>
              <div className="text-sm text-gray-500 retro-font">#{formatStat(displayPokemon.id)}</div>
            </div>
            <div className="w-8"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4">
                {detailLoading ? (
                  <div className="w-full h-full bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <img
                    src={displayPokemon.imageUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${displayPokemon.id}.png`}
                    alt={displayPokemon.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback to official PokeAPI sprite
                      if (e.currentTarget.src !== `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${displayPokemon.id}.png`) {
                        e.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${displayPokemon.id}.png`;
                      } else {
                        // If that fails too, hide the image
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                )}
              </div>
              <div className="flex justify-center gap-2 mb-4">
                {displayPokemon.type.split('/').map(type => (
                  <span key={type} className={`${getTypeColor(type)} text-sm font-bold px-2 py-1 rounded retro-font`}>
                    {type}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex border-b-2 mb-4">
                <button 
                  className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'about' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } retro-font`}
                  onClick={() => setActiveTab('about')}
                >
                  ABOUT
                </button>
                <button 
                  className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'stats' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } retro-font`}
                  onClick={() => setActiveTab('stats')}
                >
                  STATS
                </button>
                <button 
                  className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'evolutions' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } retro-font`}
                  onClick={() => setActiveTab('evolutions')}
                >
                  EVOS
                </button>
              </div>
              
              {activeTab === 'about' && (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm mb-1 retro-font">DESCRIPTION</h3>
                    <p className="text-xs text-gray-600 leading-relaxed retro-font">
                      {displayPokemon.description || 'A Pokemon with unique abilities and characteristics.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <h3 className="font-semibold text-xs mb-1 retro-font">HEIGHT</h3>
                      <p className="text-xs text-gray-600 retro-font">{displayPokemon.height}m</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs mb-1 retro-font">WEIGHT</h3>
                      <p className="text-xs text-gray-600 retro-font">{displayPokemon.weight}kg</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm mb-2 retro-font">BASE STATS</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs retro-font w-12">HP:</span>
                      <StatBar value={displayPokemon.hp} color="bg-red-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs retro-font w-12">ATK:</span>
                      <StatBar value={displayPokemon.attack} color="bg-orange-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs retro-font w-12">DEF:</span>
                      <StatBar value={displayPokemon.defense} color="bg-yellow-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs retro-font w-12">SPA:</span>
                      <StatBar value={displayPokemon.specialAttack} color="bg-blue-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs retro-font w-12">SPD:</span>
                      <StatBar value={displayPokemon.specialDefense} color="bg-green-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs retro-font w-12">SPE:</span>
                      <StatBar value={displayPokemon.speed} color="bg-purple-500" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'evolutions' && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm mb-2 retro-font">EVOLUTION CHAIN</h3>
                  {detailLoading ? (
                    <div className="text-center text-gray-500 retro-font">LOADING...</div>
                  ) : evolutions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {evolutions.map((evo, index) => (
                        <div key={evo} className="flex items-center">
                          <div className="bg-gray-100 border-2 border-gray-300 rounded px-2 py-1 retro-font text-xs">
                            {evo}
                          </div>
                          {index < evolutions.length - 1 && (
                            <span className="mx-1 text-gray-400">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 retro-font">NO EVOLUTIONS</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PokedexFooter = () => {
    return (
    <div className="pokedex-gray rounded-b-lg p-4 border-t-4 border-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
            <span className="text-white text-xs retro-font tracking-wider">POKEDEX</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-white text-xs retro-font tracking-wider">ONLINE</span>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-white text-sm retro-font tracking-wider mb-1">
            PAGE <span className="text-blue-400">{currentPage}</span> OF <span className="text-green-400">{totalPages}</span>
          </div>
          <div className="text-gray-400 text-xs retro-font tracking-wider">
            {pokemon.length} POKEMON DATABASE
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-white text-xs retro-font tracking-wider">©1996-2024</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
            <span className="text-white text-xs retro-font tracking-wider">READY</span>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-2xl overflow-hidden border-4 border-gray-700">
        <PokedexHeader />
        <PokedexControls />
        {selectedPokemon ? (
          <PokemonDetail pokemon={selectedPokemon} />
        ) : (
          <PokemonList />
        )}
        <PokedexFooter />
      </div>
    </div>
  );
}