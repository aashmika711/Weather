// ---- CONFIG ----
let apiKey = "ad3ce9208f1fa27642da9830ff1c9e52"; // <-- paste your OpenWeather key here

// ---- CLEANED & NORMALIZED CITY LIST ----
// I've removed suffixes like "City"/"Town", fixed dashes and duplicates.
// For very local neighbourhoods (HITEC City, Gachibowli, etc.) we map to Hyderabad
const cities = [
  "New Delhi","Mumbai","Bengaluru","Chennai","Hyderabad","Kolkata","Jaipur",
  "Lucknow","Bhopal","Patna","Thiruvananthapuram","Gandhinagar","Raipur",
  "Ranchi","Bhubaneswar","Dispur","Shillong","Imphal","Aizawl","Agartala",
  "Itanagar","Kohima","Gangtok","Panaji","Dehradun","Shimla","Chandigarh",
  "Srinagar","Jammu","Surat","Vadodara","Indore","Nagpur","Pune","Kanpur",
  "Varanasi","Prayagraj","Ghaziabad","Noida","Meerut","Amritsar","Ludhiana",
  "Jalandhar","Coimbatore","Madurai","Mysuru","Mangaluru","Visakhapatnam",
  "Vijayawada","Guwahati","Adilabad","Komaram Bheem Asifabad","Bhadradri Kothagudem",
  "Hanamkonda","Jagtial","Jangaon","Jayashankar Bhupalpally","Jogulamba Gadwal",
  "Kamareddy","Karimnagar","Khammam","Mahabubabad","Mahbubnagar","Mancherial",
  "Medak","Medchal Malkajgiri","Mulugu","Nagarkurnool","Nalgonda","Narayanpet",
  "Nirmal","Nizamabad","Peddapalli","Rajanna Sircilla","Ranga Reddy","Sangareddy",
  "Siddipet","Suryapet","Vikarabad","Wanaparthy","Warangal","Yadadri Bhuvanagiri",
  "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Mahbubnagar", "Mancherial",
  // Hyderabad neighbourhoods (map to Hyderabad)
  "HITEC City","Gachibowli","Madhapur","Kondapur","Banjara Hills","Jubilee Hills",
  "Abids","Begumpet","Secunderabad"
];

// ---- ALIASES for local names that are not standalone city names in API ----
// map local neighbourhoods or variant names to the main city (safer)
const aliases = {
  "hitec city": "Hyderabad,IN",
  "gachibowli": "Hyderabad,IN",
  "madhapur": "Hyderabad,IN",
  "kondapur": "Hyderabad,IN",
  "banjara hills": "Hyderabad,IN",
  "jubilee hills": "Hyderabad,IN",
  "abids": "Hyderabad,IN",
  "begumpet": "Hyderabad,IN",
  "warangal city": "Warangal,IN",
  "karimnagar city": "Karimnagar,IN",
  "nizamabad city": "Nizamabad,IN",
  "khammam city": "Khammam,IN",
  "mahbubnagar city": "Mahbubnagar,IN",
  "mancherial town": "Mancherial,IN",
  "suryapet town": "Suryapet,IN",
  "sangareddy town": "Sangareddy,IN",
  "adilabad town": "Adilabad,IN",
  "medchal malkajgiri": "Medchal Malkajgiri,IN"
};

// populate datalist
const datalist = document.getElementById("cities");
const unique = Array.from(new Set(cities.map(s => s.trim()))).sort((a,b)=>a.localeCompare(b));
datalist.innerHTML = unique.map(c => `<option value="${c}">${c}</option>`).join("");

// helper: normalize input string
function normalizeKey(s){
  return s.trim().toLowerCase().replace(/\s+/g," ").replace(/[–—]/g," ").replace(/,.*$/,"");
}

// main function
async function getWeatherFor(queryInput){
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<p>Loading...</p>";

  // 1) If alias exists, use it directly (we added country there)
  const key = normalizeKey(queryInput);
  let q = aliases[key] || null;

  // 2) If no alias, first try a direct name lookup with country hint (IN)
  if (!q) {
    q = `${queryInput},IN`;
  }

  // Try direct weather by q parameter first
  try {
    const urlByName = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${apiKey}&units=metric`;
    let res = await fetch(urlByName);
    let data = await res.json();

    // If success -> show
    if (res.ok && data && data.cod === 200) {
      showWeather(data);
      return;
    }

    // If not found or other issue -> fallback to Geocoding API (recommended).
    // Geocoding will return possible matches with lat/lon which we can use.
    // Source: OpenWeather Geocoding API docs (we're using direct geocoding). 
    // If geocoding finds a match we call weather by coordinates.
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(queryInput + ",IN")}&limit=5&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (Array.isArray(geoData) && geoData.length > 0) {
      const place = geoData[0]; // pick the first best match
      const lat = place.lat;
      const lon = place.lon;

      const urlByCoord = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const coordRes = await fetch(urlByCoord);
      const coordData = await coordRes.json();

      if (coordRes.ok && coordData && coordData.cod === 200) {
        showWeather(coordData);
        return;
      } else {
        resultDiv.innerHTML = `<p>Found location but failed to load weather: ${coordData.message || coordRes.statusText}</p>`;
        console.error("coordData", coordData);
        return;
      }
    } else {
      // no geocoding match
      resultDiv.innerHTML = `<p>City not found (tried "${queryInput}"). Try a nearby larger city (e.g., "Hyderabad").</p>`;
      console.warn("Geocoding returned no results for", queryInput, geoData);
      return;
    }
  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = "<p>Error fetching data. Check console for details.</p>";
  }
}

function showWeather(data){
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = `
    <div class="card">
      <strong>${data.name}, ${data.sys.country}</strong>
      <div>🌡 Temp: ${data.main.temp} °C</div>
      <div>Feels like: ${data.main.feels_like} °C</div>
      <div>☁ ${data.weather[0].description}</div>
      <div>💧 Humidity: ${data.main.humidity}%</div>
      <div>💨 Wind: ${data.wind.speed} m/s</div>
    </div>
  `;
}

// UI wiring
document.getElementById("getBtn").addEventListener("click", () => {
  const cityVal = document.getElementById("city").value.trim();
  if (!cityVal) { alert("Select or type a city"); return; }
  getWeatherFor(cityVal);
});

// small convenience: show several cities (example) side-by-side
document.getElementById("showAllBtn").addEventListener("click", async () => {
  // example: show some capitals quickly
  const quick = ["Hyderabad","Mumbai","Bengaluru","Chennai","New Delhi"];
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<p>Loading multiple cities...</p>";
  let html = "";
  for (let c of quick) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(c + ",IN")}&appid=${apiKey}&units=metric`;
      const r = await fetch(url);
      const d = await r.json();
      if (r.ok && d.cod === 200) {
        html += `<div class="card"><strong>${d.name}, ${d.sys.country}</strong>
                 <div>🌡 ${d.main.temp} °C · ${d.weather[0].description}</div></div>`;
      } else {
        html += `<div class="card"><strong>${c}</strong><div>Not found: ${d.message || r.statusText}</div></div>`;
      }
    } catch(e){
      html += `<div class="card"><strong>${c}</strong><div>Error</div></div>`;
    }
  }
  resultDiv.innerHTML = html;
});
