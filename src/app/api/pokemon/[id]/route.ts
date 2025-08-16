import { NextResponse } from 'next/server';

// Simple in-memory cache (for development purposes)
const pokemonDetailCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getFromCache(key: string) {
  const cached = pokemonDetailCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  pokemonDetailCache.set(key, {
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

interface EvolutionChain {
  id: number;
  chain: {
    species: {
      name: string;
      url: string;
    };
    evolves_to: EvolutionChain[];
  };
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

    return pokemon;
  } catch (error) {
    console.error(`Error fetching Pokemon ${id}:`, error);
    return null;
  }
}

async function fetchEvolutionChain(speciesUrl: string): Promise<EvolutionChain | null> {
  try {
    const speciesResponse = await fetch(speciesUrl);
    if (!speciesResponse.ok) return null;
    const speciesData = await speciesResponse.json();
    
    const evolutionChainUrl = speciesData.evolution_chain.url;
    const evolutionResponse = await fetch(evolutionChainUrl);
    if (!evolutionResponse.ok) return null;
    
    return await evolutionResponse.json();
  } catch (error) {
    console.error('Error fetching evolution chain:', error);
    return null;
  }
}

function extractEvolutionNames(chain: EvolutionChain['chain']): string[] {
  const evolutions: string[] = [];
  
  function traverse(currentChain: EvolutionChain['chain']) {
    evolutions.push(currentChain.species.name);
    currentChain.evolves_to.forEach(evolution => traverse(evolution));
  }
  
  traverse(chain);
  return evolutions;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pokemonId = parseInt(id);
    const cacheKey = `pokemon-detail-${pokemonId}`;
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`Returning cached details for Pokemon ${pokemonId}`);
      return NextResponse.json(cached);
    }
    
    // First try to get from PokeAPI for more comprehensive data
    const pokemon = await fetchPokemonFromPokeAPI(pokemonId);
    
    if (pokemon) {
      // Fetch evolution chain
      const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`;
      const evolutionChain = await fetchEvolutionChain(speciesUrl);
      const evolutions = evolutionChain ? extractEvolutionNames(evolutionChain.chain) : [];

      const result = {
        pokemon,
        evolutions
      };
      
      // Cache the result
      setCache(cacheKey, result);

      return NextResponse.json(result);
    }

    // Fallback to basic response if PokeAPI fails
    const fallbackResult = {
      pokemon: {
        id: pokemonId,
        name: 'Unknown',
        type: 'Normal',
        height: 1.0,
        weight: 10.0,
        hp: 50,
        attack: 50,
        defense: 50,
        speed: 50,
        specialAttack: 50,
        specialDefense: 50,
        imageUrl: '',
        description: `A mysterious Pokemon with ID ${pokemonId}. Not much is known about this creature.`
      },
      evolutions: []
    };
    
    // Cache the fallback result
    setCache(cacheKey, fallbackResult);

    return NextResponse.json(fallbackResult);

  } catch (error) {
    console.error('Error fetching Pokemon details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Pokemon details' },
      { status: 500 }
    );
  }
}