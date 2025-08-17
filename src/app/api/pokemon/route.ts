import { NextResponse } from 'next/server';

// Simple in-memory cache (for development purposes)
const pokemonCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getFromCache(key: string) {
  const cached = pokemonCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  pokemonCache.set(key, {
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

interface PokeAPIResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    name: string;
    url: string;
  }[];
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

export async function GET() {
  try {
    // Check cache first
    const cached = getFromCache('all-pokemon');
    if (cached) {
      console.log(`Returning ${cached.length} cached Pokemon`);
      return NextResponse.json(cached);
    }
    
    // Fetch all Pokemon from PokeAPI
    console.log('Fetching Pokemon list from PokeAPI...');
    const listResponse = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
    if (!listResponse.ok) {
      throw new Error('Failed to fetch Pokemon list');
    }
    
    const listData: PokeAPIResponse = await listResponse.json();
    console.log(`Found ${listData.count} Pokemon, fetching details...`);
    
    // Start with first 50 Pokemon for immediate display
    const initialBatch = listData.results.slice(0, 50);
    const initialPokemon: Pokemon[] = [];
    
    console.log('Fetching initial batch of 50 Pokemon...');
    const initialPromises = initialBatch.map(async (pokemon, index) => {
      const id = index + 1;
      return fetchPokemonFromPokeAPI(id);
    });
    
    const initialResults = await Promise.all(initialPromises);
    const validInitialPokemon = initialResults.filter(p => p !== null) as Pokemon[];
    initialPokemon.push(...validInitialPokemon);
    
    // Cache the initial batch
    setCache('initial-pokemon', initialPokemon);
    
    // Continue fetching the rest in the background
    const remainingPokemon: Pokemon[] = [];
    const batchSize = 100;
    
    for (let i = 50; i < listData.results.length; i += batchSize) {
      const batch = listData.results.slice(i, i + batchSize);
      console.log(`Processing remaining batch ${Math.floor(i / batchSize) + 1}/${Math.ceil((listData.results.length - 50) / batchSize)}`);
      
      const batchPromises = batch.map(async (pokemon, index) => {
        const id = i + index + 1;
        return fetchPokemonFromPokeAPI(id);
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validPokemon = batchResults.filter(p => p !== null) as Pokemon[];
      remainingPokemon.push(...validPokemon);
      
      // Small delay between batches
      if (i + batchSize < listData.results.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Combine all Pokemon and sort by ID
    const allPokemon = [...initialPokemon, ...remainingPokemon].sort((a, b) => a.id - b.id);
    
    // Cache the complete result
    setCache('all-pokemon', allPokemon);
    
    console.log(`Successfully fetched and cached ${allPokemon.length} Pokemon`);
    return NextResponse.json(allPokemon);
    
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    
    // Fallback to essential Pokemon if everything fails
    const fallbackPokemon = [
      { id: 1, name: 'bulbasaur', type: 'grass/poison', height: 0.7, weight: 6.9, hp: 45, attack: 49, defense: 49, speed: 45, specialAttack: 65, specialDefense: 65, imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', description: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.' },
      { id: 4, name: 'charmander', type: 'fire', height: 0.6, weight: 8.5, hp: 39, attack: 52, defense: 43, speed: 65, specialAttack: 60, specialDefense: 50, imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png', description: 'Obviously prefers hot places. When it rains, steam is said to spout from the tip of its tail.' },
      { id: 7, name: 'squirtle', type: 'water', height: 0.5, weight: 9.0, hp: 44, attack: 48, defense: 65, speed: 43, specialAttack: 50, specialDefense: 64, imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png', description: 'After birth, its back swells and hardens into a shell. Powerfully sprays foam from its mouth.' },
      { id: 25, name: 'pikachu', type: 'electric', height: 0.4, weight: 6.0, hp: 35, attack: 55, defense: 40, speed: 90, specialAttack: 50, specialDefense: 50, imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', description: 'When several of these Pokémon gather, their electricity could build and cause lightning storms.' },
    ];
    
    return NextResponse.json(fallbackPokemon);
  }
}