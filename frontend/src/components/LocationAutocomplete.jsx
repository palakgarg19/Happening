import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function LocationAutocomplete({ initialValue = "", onSelect, placeholder }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const fetchSuggestions = async (searchQuery) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/locations/autocomplete?q=${searchQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear the old timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set a new timeout
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300); // 300ms debounce

    setShowSuggestions(true);
  };

  const handleSelect = (suggestion) => {
    setQuery(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    onSelect(suggestion.name);
  };

  return (
    <div className="autocomplete-wrapper">
      <input
        type="text"
        className="form-control"
        placeholder={placeholder || "Start typing an address..."}
        value={query}
        onChange={handleChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // Hide list on blur, but delay to allow click
          setTimeout(() => setShowSuggestions(false), 200);
        }}
      />
      {showSuggestions && (query.length > 0 || loading) && (
        <ul className="autocomplete-list">
          {loading && <li className="autocomplete-item loading">Loading...</li>}
          {!loading &&
            suggestions.length > 0 &&
            suggestions.map((s) => (
              <li
                key={s.id}
                className="autocomplete-item"
                onMouseDown={() => handleSelect(s)} // Use onMouseDown to fire before onBlur
              >
                {s.name}
              </li>
            ))}
          {!loading && suggestions.length === 0 && query.length >= 3 && (
            <li className="autocomplete-item empty">No results found</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default LocationAutocomplete;
