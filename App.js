import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,

} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';



export default function WeatherApp() {
  const [data, setData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const searchInputRef = useRef(null);

  const APII = ''; // Replace with your actual API key

  useEffect(() => {
    getLocationPermissionAndFetch();
  }, []);

  const getLocationPermissionAndFetch = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLat(location.coords.latitude);
      setLon(location.coords.longitude);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lat && lon) {
      fetchWeatherData();
    }
  }, [lat, lon]);

  const fetchWeatherData = async () => {
    if (!APII || APII === 'YOUR_API_KEY_HERE') {
      setError('Please add your OpenWeatherMap API key');
      setLoading(false);
      return;
    }

    try {
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${APII}`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${APII}`)
      ]);

      if (!currentResponse.ok || !forecastResponse.ok) {
        throw new Error(`HTTP error! status: ${currentResponse.status || forecastResponse.status}`);
      }

      const currentData = await currentResponse.json();
      const forecastData = await forecastResponse.json();

      setData(currentData);
      setForecastData(forecastData);
      setError(null);
    } catch (err) {
      setError(err.message);
      setData(null);
      setForecastData(null);
    } finally {
      setLoading(false);
    }
  };

  const searchLocations = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    if (!APII || APII === 'YOUR_API_KEY_HERE') {
      console.log('API key not set');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${APII}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      console.log('Search results:', results);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    searchLocations(text);
  };

  const handleLocationSelect = (location) => {
    console.log('Location selected:', location);
    setLat(location.lat);
    setLon(location.lon);
    setSearchQuery(`${location.name}, ${location.country}`);
    setSearchResults([]);
    setLoading(true);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const handleCurrentLocation = async () => {
    setGettingLocation(true);
    setError(null);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied');
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      const newLat = location.coords.latitude;
      const newLon = location.coords.longitude;

      if (!data || Math.abs(newLat - lat) > 0.001 || Math.abs(newLon - lon) > 0.001) {
        setLat(newLat);
        setLon(newLon);
        setSearchQuery('');
        setSearchResults([]);
        setLoading(true);
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('Location Error', err.message);
    } finally {
      setGettingLocation(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const kelvinToCelsius = (kelvin) => {
    return (kelvin - 273.15).toFixed(1);
  };

  const timestampToTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const getDailyForecast = () => {
    if (!forecastData) return [];
    
    const dailyData = {};
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toDateString();
      
      if (!dailyData[dateKey] || date.getHours() === 12) {
        dailyData[dateKey] = item;
      }
    });
    
    return Object.values(dailyData).slice(0, 5);
  };

  const formatForecastDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleLocationSelect(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.suggestionName}>
        {item.name}
        {item.state && `, ${item.state}`}
        , {item.country}
      </Text>
      {item.local_names?.en && item.local_names.en !== item.name && (
        <Text style={styles.suggestionLocal}>
          {item.local_names.en}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#f8f9fa', '#e9ecef', '#dee2e6']} style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#f8f9fa', '#e9ecef', '#dee2e6']} style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            setLoading(true);
            getLocationPermissionAndFetch();
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#f8f9fa', '#e9ecef', '#dee2e6']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.mainContainer}>
        <View style={styles.headerContainer}>
          {/* Search Section */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Search for a city..."
                placeholderTextColor="#adb5bd"
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
              />
              <TouchableOpacity
                style={[styles.currentLocationBtn, gettingLocation && styles.disabledBtn]}
                onPress={handleCurrentLocation}
                disabled={gettingLocation}
                activeOpacity={0.7}
              >
                <Text style={styles.currentLocationText}>
                  {gettingLocation ? 'Getting...' : '📍'}
                </Text>
              </TouchableOpacity>
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={clearSearch}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {searchLoading && (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            )}
          </View>
          
         
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsHeader}>Found {searchResults.length} location(s):</Text>
              <FlatList
                data={searchResults}
                renderItem={renderSuggestionItem}
                keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                scrollEnabled={true}
              />
            </View>
          )}
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Weather Section */}
          {data && (
            <View style={styles.weatherContainer}>
              <View style={styles.weatherHeader}>
                <Text style={styles.cityName}>
                  {data.name}, {data.sys.country}
                </Text>
                <View style={styles.weatherDisplay}>
                  <Image
                    style={styles.weatherIcon}
                    source={{ uri: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` }}
                  />
                  <Text style={styles.descriptionText}>
                    {data.weather[0].description}
                  </Text>
                </View>
              </View>

              <View style={styles.weatherDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>TEMPERATURE</Text>
                  <Text style={styles.detailValue}>
                    {kelvinToCelsius(data.main.temp)}°C
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>FEELS LIKE</Text>
                  <Text style={styles.detailValue}>
                    {kelvinToCelsius(data.main.feels_like)}°C
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>HUMIDITY</Text>
                  <Text style={styles.detailValue}>
                    {data.main.humidity}%
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>WIND SPEED</Text>
                  <Text style={styles.detailValue}>
                    {data.wind.speed} m/s
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>SUNRISE</Text>
                  <Text style={styles.detailValue}>
                    {timestampToTime(data.sys.sunrise)}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>SUNSET</Text>
                  <Text style={styles.detailValue}>
                    {timestampToTime(data.sys.sunset)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Forecast Section */}
          {forecastData && getDailyForecast().length > 0 && (
            <View style={styles.forecastContainer}>
              <Text style={styles.forecastTitle}>5-Day Forecast</Text>
              {getDailyForecast().map((item, index) => (
                <View key={index} style={styles.forecastItem}>
                  <Text style={styles.forecastDate}>
                    {formatForecastDate(item.dt)}
                  </Text>
                  <Image
                    source={{ uri: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png` }}
                    style={styles.forecastIcon}
                  />
                  <View style={styles.forecastTemps}>
                    <Text style={styles.forecastHigh}>{kelvinToCelsius(item.main.temp_max)}°</Text>
                    <Text style={styles.forecastLow}>{kelvinToCelsius(item.main.temp_min)}°</Text>
                  </View>
                  <Text style={styles.forecastDesc}>
                    {item.weather[0].description}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '300',
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    marginHorizontal: 20,
    marginTop: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '300',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
  },
  searchContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#333',
    fontWeight: '400',
  },
  currentLocationBtn: {
    padding: 15,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#adb5bd',
  },
  currentLocationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
  },
  clearBtn: {
    padding: 15,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  searchLoadingText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '300',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    textAlign: 'center',
  },
  resultsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: 'white',
  },
  suggestionName: {
    fontWeight: '500',
    color: '#333',
    fontSize: 16,
    marginBottom: 4,
  },
  suggestionLocal: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '300',
  },
  weatherContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    maxWidth: 420,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 20,
  },
  weatherHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cityName: {
    color: '#333',
    fontSize: 24,
    fontWeight: '300',
    marginBottom: 20,
    textAlign: 'center',
  },
  weatherDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 10,
  },
  weatherIcon: {
    width: 60,
    height: 60,
  },
  descriptionText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '300',
    textTransform: 'capitalize',
  },
  weatherDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  detailItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 20,
    width: '47%',
    gap: 8,
  },
  detailLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailValue: {
    color: '#333',
    fontSize: 18,
    fontWeight: '300',
  },
  forecastContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    maxWidth: 420,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  forecastTitle: {
    color: '#333',
    fontSize: 20,
    fontWeight: '300',
    marginBottom: 25,
    textAlign: 'center',
  },
  forecastItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  forecastDate: {
    color: '#333',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  forecastIcon: {
    width: 40,
    height: 40,
  },
  forecastTemps: {
    alignItems: 'center',
    minWidth: 60,
    gap: 2,
  },
  forecastHigh: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  forecastLow: {
    color: '#666',
    fontSize: 14,
    fontWeight: '300',
  },
  forecastDesc: {
    color: '#666',
    fontSize: 12,
    fontWeight: '300',
    textTransform: 'capitalize',
    flex: 1.5,
    textAlign: 'right',
  },
});