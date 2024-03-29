document.addEventListener("DOMContentLoaded", () => {
    // Objecten om gegevens op te slaan
    const locationData = {};
    const temperatureData = {};
    let lastLocationUpdateTime = 0;

    // Functie om de locatie op te halen
    function getLocation() {
        const currentTime = Date.now();
        
        // Controleer of het interval van 1 minuut is verstreken
        if (currentTime - lastLocationUpdateTime >= 60000) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        updateLocation(position);
                        lastLocationUpdateTime = currentTime; // Update de tijdstempel
                    },
                    error => console.error('Fout bij het ophalen van locatie:', error),
                );
            } else {
                document.getElementById("location").innerText = "Geolocatie wordt niet ondersteund in deze browser.";
            }
        }
    }

    // Functie om de locatie bij te werken
    function updateLocation(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=API_KEY`)
            .then(response => response.json())
            .then(data => {
                const addressInfo = data.results[0];
                if (addressInfo && addressInfo.address_components) {
                    const city = extractAddressComponent(addressInfo, 'locality');

                    getCountryCode(city, countryCode => {
                        const locationText = `${city}, ${countryCode}`;
                        document.getElementById("location").innerText = `Huidige locatie: ${locationText}`;
                        // Voeg locatie toe aan het object
                        locationData.location = locationText;
                        // Sla het JSON-object op in de lokale opslag
                        localStorage.setItem("locationData", JSON.stringify(locationData));

                        // Roep de aangepaste getTemperature-functie aan met dynamische locatie
                        getTemperature(latitude, longitude);
                    });
                } else {
                    document.getElementById("location").innerText = "Locatiegegevens niet beschikbaar.";
                }
            })
            .catch(error => console.error('Fout bij het ophalen van locatiegegevens:', error));
    }

    // Functie om de temperatuur op te halen
    function getTemperature(latitude, longitude) {
        const apiKey = 'API_KEY';

        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`)
            .then(response => response.json())
            .then(data => {
                const temperature = Math.round(data.main.temp);
                document.getElementById("temperature").innerText = `Huidige temperatuur: ${temperature}°C`;
                // Voeg temperatuur toe aan het object
                temperatureData.temperature = temperature;
                // Sla het JSON-object op in de lokale opslag
                localStorage.setItem("temperatureData", JSON.stringify(temperatureData));

                // Stuur locatie- en temperatuurdata naar de server
                sendToServer('/data', { locationData, temperatureData });
            })
            .catch(error => console.error('Fout bij het ophalen van de temperatuur:', error));
    }

    function getCountryCode(city, callback) {
        // Functie om landcode op te halen
        fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=API_KEY`)
            .then(response => response.json())
            .then(data => {
                const addressInfo = data.results[0];
                if (addressInfo && addressInfo.address_components) {
                    const countryCode = extractAddressComponent(addressInfo, 'country');
                    callback(countryCode);
                } else {
                    console.error('Ongeldige gegevens ontvangen van Google Geocoding API');
                }
            })
            .catch(error => console.error('Fout bij het ophalen van landcode:', error));
    }

    function extractAddressComponent(addressInfo, componentType) {
        const component = addressInfo.address_components.find(comp => comp.types.includes(componentType));
        return component ? component.short_name : '';
    }

    setInterval(() => {
        getLocation();
    }, 60000);
    
    // Roep de functie aan bij het laden van de pagina
    getLocation();
});

// Functie om data naar de server te sturen
function sendToServer(endpoint, data) {
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Fout bij het verzenden van gegevens naar de server: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(result => console.log('Server response:', result))
    .catch(error => console.error(error));
}
