import { NextResponse } from 'next/server';

// Simple in-memory cache for progressive loading
const progressiveCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getFromCache(key: string) {
  const cached = progressiveCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  progressiveCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

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

interface PokeAPIPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: {
    type: {
      name: string;
    };
  }[];
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
  sprites: {
    front_default: string;
  };
}

async function fetchPokemonFromPokeAPI(id: number): Promise<Pokemon | null> {
  const cacheKey = `pokemon-${id}`;
  
  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!response.ok) return null;
    const data: PokeAPIPokemon = await response.json();
    
    // Get species data for description
    const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    let description = '';
    if (speciesResponse.ok) {
      const speciesData = await speciesResponse.json();
      const flavorText = speciesData.flavor_text_entries?.find(
        (entry: any) => entry.language.name === 'en'
      );
      if (flavorText) {
        description = flavorText.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');
      }
    }
    
    // If no description found, create a generic one
    if (!description) {
      const genericDescriptions = [
        `A ${data.name} with unique abilities and characteristics.`,
        `This ${data.name} is known for its incredible power and skills.`,
        `A rare ${data.name} that few trainers have encountered.`,
        `This ${data.name} has amazing potential in battles.`,
        `A mysterious ${data.name} with many secrets yet to be discovered.`,
        `This ${data.name} forms strong bonds with its trainer.`,
        `A powerful ${data.name} that dominates in its natural habitat.`,
        `This ${data.name} possesses extraordinary abilities.`,
      ];
      description = genericDescriptions[data.id % genericDescriptions.length];
    }
    
    const types = data.types.map(t => t.type.name).join('/');
    const stats = data.stats.reduce((acc, stat) => {
      acc[stat.stat.name] = stat.base_stat;
      return acc;
    }, {} as any);

    const pokemon: Pokemon = {
      id: data.id,
      name: data.name,
      type: types,
      height: data.height / 10,
      weight: data.weight / 10,
      hp: stats.hp || 0,
      attack: stats.attack || 0,
      defense: stats.defense || 0,
      speed: stats.speed || 0,
      specialAttack: stats['special-attack'] || 0,
      specialDefense: stats['special-defense'] || 0,
      imageUrl: data.sprites.front_default,
      description: description
    };
    
    // Cache the result
    setCache(cacheKey, pokemon);
    return pokemon;
  } catch (error) {
    console.error(`Error fetching Pokemon ${id}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Check cache first
    const cacheKey = `pokemon-page-${page}-${limit}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    // Fetch Pokemon list from PokeAPI
    const listResponse = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
    if (!listResponse.ok) {
      throw new Error('Failed to fetch Pokemon list');
    }
    
    const listData = await listResponse.json();
    
    // Fetch details for the current page
    const pokemonPromises = listData.results.map(async (pokemon: any, index: number) => {
      const id = offset + index + 1;
      return fetchPokemonFromPokeAPI(id);
    });
    
    const pokemonResults = await Promise.all(pokemonPromises);
    const validPokemon = pokemonResults.filter(p => p !== null) as Pokemon[];
    
    // Sort by ID
    validPokemon.sort((a, b) => a.id - b.id);
    
    const result = {
      pokemon: validPokemon,
      pagination: {
        page,
        limit,
        total: listData.count,
        hasNext: !!listData.next,
        hasPrev: !!listData.previous
      }
    };
    
    // Cache the result
    setCache(cacheKey, result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    
    // Fallback to essential Pokemon if everything fails
    const fallbackPokemon = [
      { id: 1, name: 'bulbasaur', type: 'grass/poison', height: 0.7, weight: 6.9, hp: 45, attack: 49, defense: 49, speed: 45, specialAttack: 65, specialDefense: 65, imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', description: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.' },
      { id: 4, name: 'charmander', type: 'fire', height: 0.6, weight: 8.5, hp: 39, attack: 52, defense: 43, speed: 65, specialAttack: 60, specialDefense: 50, imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png', description: 'Obviously prefers hot places. When it rains, steam is said to spout from the tip of its tail.' },
      { id: 7, name: 'squirtle', type: 'water', height: 0.5, weight: 9.0, hp: 44, attack: 48, defense: 65, speed: 43, specialAttack: 50, specialDefense: 64, imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png', description: 'After birth, its back swells and hardens into a shell. Powerfully sprays foam from its mouth.' },
      { id: 25, name: 'pikachu', type: 'electric', height: 0.4, weight: 6.0, hp: 35, attack: 55, defense: 40, speed: 90, specialAttack: 50, specialDefense: 50, imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', description: 'When several of these Pokémon gather, their electricity could build and cause lightning storms.' },
    ];
    
    return NextResponse.json({
      pokemon: fallbackPokemon,
      pagination: {
        page: 1,
        limit: 4,
        total: 4,
        hasNext: false,
        hasPrev: false
      }
    });
  }
}
