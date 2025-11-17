import EventCard from "./EventCard";
import LocationAutocomplete from "./LocationAutocomplete";

function EventPage({
  events,
  categories,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  searchLocation,
  setSearchLocation,
  searchRadius,
  setSearchRadius,
  searchDate,
  setSearchDate,
  onSearch,
  onClear,
  onBook,
  onViewDetail,
  user,
  onLoginClick,
}) {
  return (
    <div className="event-page">
      <div className="filter-bar">
        <div className="filter-group search-bar">
          <label>Search Events</label>
          <input
            type="text"
            className="form-control"
            placeholder="Event name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Category</label>
          <select
            className="form-control"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>When</label>
          <select
            className="form-control"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          >
            <option value="anytime">Anytime</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="weekend">This Weekend</option>
            <option value="week">Next 7 Days</option>
          </select>
        </div>
        <div className="filter-group">
          {" "}
          <label>Location</label>{" "}
          <LocationAutocomplete
            initialValue={searchLocation}
            onSelect={setSearchLocation}
            placeholder="City or Zip Code..."
          />{" "}
        </div>

        <div className="filter-group">
          {" "}
          <label>Distance</label>{" "}
          <select
            className="form-control"
            value={searchRadius}
            onChange={(e) => setSearchRadius(e.target.value)}
          >
            {" "}
            <option value="5">5 miles</option>{" "}
            <option value="10">10 miles</option>{" "}
            <option value="25">25 miles</option>{" "}
            <option value="50">50 miles</option>{" "}
            <option value="100">100 miles</option>{" "}
          </select>{" "}
        </div>
        <div className="filter-group price-range">
          <label>Price Range</label>
          <div className="price-inputs">
            <input
              type="number"
              className="form-control"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <span>to</span>
            <input
              type="number"
              className="form-control"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={onClear}>
            Clear
          </button>
          <button className="btn btn-primary" onClick={onSearch}>
            Apply
          </button>
        </div>
      </div>

      <h2>Discover Events ({events.length})</h2>
      {events.length === 0 ? (
        <div className="card card-body" style={{ textAlign: "center" }}>
          <p>
            {searchQuery || selectedCategory !== "all" || minPrice || maxPrice
              ? "No events found matching your filters. Try adjusting your search."
              : "No events are available right now. Please check back later!"}
          </p>
          {(searchQuery ||
            selectedCategory !== "all" ||
            minPrice ||
            maxPrice) && (
            <button className="btn btn-primary" onClick={onClear}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onBook={onBook}
              user={user}
              onLoginClick={onLoginClick}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default EventPage;
