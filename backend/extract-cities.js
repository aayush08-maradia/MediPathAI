const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'hospitals.json')));

const states = {};

data.forEach(hospital => {
  const state = hospital.state;
  const city = hospital.city;
  
  if (!states[state]) {
    states[state] = new Set();
  }
  states[state].add(city);
});

// Sort and display
Object.keys(states).sort().forEach(state => {
  const cities = Array.from(states[state]).sort();
  console.log(`\n=== ${state} ===`);
  console.log(cities.join(', '));
});

// Also count total
const totalCities = Object.values(states).reduce((sum, set) => sum + set.size, 0);
console.log(`\n\nTotal states: ${Object.keys(states).length}`);
console.log(`Total unique cities: ${totalCities}`);
