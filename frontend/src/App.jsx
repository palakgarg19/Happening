import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

import Header from "./components/Header";
import EventPage from "./components/EventPage";
import AuthModal from "./components/AuthModal";
import MyBookings from "./components/MyBookings";
import AdminPanel from "./components/AdminPanel";
import HostDashboard from "./components/HostDashboard";
import EventFormModal from "./components/EventFormModal";
import HealthCheckFooter from "./components/HealthCheckFooter";
import PayoutModal from "./components/PayoutModal";
import EventBookingsModal from "./components/EventBookingsModal";
import EventDetailPage from "./components/EventDetailPage";
import HostApplicationModal from "./components/HostApplicationModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {
  // === System & Global State ===
  // const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // === Authentication & User State ===
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // === Navigation State ===
  const [activeTab, setActiveTab] = useState("events");
  const [bookingsSubTab, setBookingsSubTab] = useState("confirmed");
  const [highlightEventId, setHighlightEventId] = useState(null);

  // === Core Data State ===
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myBookings, setMyBookings] = useState([]);

  // === Event Search & Filter State ===
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchRadius, setSearchRadius] = useState("25");
  const [searchDate, setSearchDate] = useState("anytime");

  // === Admin-Specific Data State ===
  const [analytics, setAnalytics] = useState(null);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [allApprovedEvents, setAllApprovedEvents] = useState([]);
  const [allRejectedEvents, setAllRejectedEvents] = useState([]);
  const [pendingHosts, setPendingHosts] = useState([]);
  const [approvedHosts, setApprovedHosts] = useState([]);
  const [rejectedHosts, setRejectedHosts] = useState([]);
  const [adminPayouts, setAdminPayouts] = useState([]);
  const [payableEvents, setPayableEvents] = useState([]);

  // === Host-Specific Data State ===
  const [hostStatus, setHostStatus] = useState(null);
  const [myCreatedEvents, setMyCreatedEvents] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [bankAccount, setBankAccount] = useState(null);

  // === Modal Visibility State ===
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showHostApplicationModal, setShowHostApplicationModal] =
    useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showBankAccountForm, setShowBankAccountForm] = useState(false); // <-- Was missing

  // === Form Data State ===
  const [eventFormData, setEventFormData] = useState({
    title: "",
    description: "",
    date_time: "",
    venue: "",
    total_tickets: "",
    price: "",
    category: "",
    image_url: "",
  });
  const [hostApplicationData, setHostApplicationData] = useState({
    phone: "",
    idType: "driver_license",
    idNumber: "",
    organization: "",
    experience: "",
    bio: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
    account_type: "savings",
  });
  const [bankAccountData, setBankAccountData] = useState({
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
    account_type: "savings",
  });
  const [payoutFormData, setPayoutFormData] = useState({
    event_id: "",
    host_id: "",
    amount: "",
    notes: "",
  });

  // === Contextual/Selected Item State ===
  const [eventToEdit, setEventToEdit] = useState(null);
  const [selectedEventForBookings, setSelectedEventForBookings] =
    useState(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [eventBookings, setEventBookings] = useState([]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const data = isLogin ? { email, password } : { email, password, name };
      const response = await axios.post(`${API_BASE}${endpoint}`, data);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      await fetchMyBookings();
      await fetchHostStatus();
      await fetchBankAccount();
      setShowLoginModal(false);
      alert(`${isLogin ? "Login" : "Registration"} successful!`);
    } catch (error) {
      alert(error.response?.data?.error || "Authentication failed");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setHostStatus(null);
    setBankAccount(null);
    setMyBookings([]);
    setPayouts([]);
    localStorage.removeItem("token");
    setActiveTab("events");
  };

  const fetchEvents = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/events/public/upcoming`);
      setEvents(response.data.events);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/events/public/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  const searchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (selectedCategory && selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (minPrice) params.append("min_price", minPrice);
      if (maxPrice) params.append("max_price", maxPrice);

      if (searchLocation && searchRadius) {
        params.append("location", searchLocation);
        params.append("radius", searchRadius);
      }
      if (searchDate && searchDate !== "anytime") {
        params.append("date", searchDate);
      }

      const response = await axios.get(
        `${API_BASE}/events/public/search?${params}`
      );
      setEvents(response.data.events);
    } catch (error) {
      console.error("Failed to search events:", error);
    }
  }, [
    searchQuery,
    selectedCategory,
    minPrice,
    maxPrice,
    searchLocation,
    searchRadius,
    searchDate,
  ]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSearchLocation("");
    setSearchRadius("25");
    setSearchDate("anytime");
    fetchEvents();
  };

  const fetchMyBookings = useCallback(
    async (showAlert = false) => {
      const token = localStorage.getItem("token");
      if (!token || !user) {
        if (showAlert) alert("Please login to view your bookings");
        return;
      }
      try {
        const response = await axios.get(`${API_BASE}/bookings/my-bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMyBookings(response.data.bookings);
        if (showAlert)
          alert(`Loaded ${response.data.bookings.length} bookings`);
      } catch (error) {
        console.error("Failed to fetch bookings:", error);
        if (showAlert) alert("Failed to load your bookings");
      }
    },
    [user]
  );

  const createBooking = useCallback(
    async (eventId, ticketCount) => {
      const token = localStorage.getItem("token");
      if (!token || !user) {
        alert("Please login to book tickets");
        throw new Error("User not logged in");
      }

      try {
        await axios.post(
          `${API_BASE}/bookings`,
          { event_id: eventId, ticket_count: ticketCount },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        alert(
          "Booking accepted! Taking you to 'My Bookings' to complete payment."
        );

        fetchEvents();
        fetchMyBookings();

        setActiveTab("bookings");
        setBookingsSubTab("pending");
        setHighlightEventId(eventId);
        return true;
      } catch (error) {
        console.error("Booking submission error:", error);
        alert(error.response?.data?.error || "Booking failed");
        throw error;
      }
    },
    [user, fetchEvents, fetchMyBookings]
  );

  const applyAsHost = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      console.log("Submitting host application (Full Simulation Mode)...");
      await axios.post(
        `${API_BASE}/hosts/apply`,
        {
          ...hostApplicationData,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(
        "✅ Host application submitted successfully! It is now pending admin review."
      );
      setShowHostApplicationModal(false);
      fetchHostStatus();
      fetchBankAccount();
    } catch (error) {
      console.error("Host application error:", error);
      alert(
        `❌ Application failed: ${
          error.response?.data?.error || "Failed to submit application."
        }`
      );
    }
  };

  const addBankAccount = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.post(
        `${API_BASE}/hosts/bank-account`,
        bankAccountData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message);
      setShowBankAccountForm(false);
      setBankAccountData({
        account_holder_name: "",
        account_number: "",
        ifsc_code: "",
        bank_name: "",
        account_type: "savings",
      });
      fetchBankAccount();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to add bank account");
    }
  };

  const handleViewEventDetail = async (eventId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/events/${eventId}`);
      setSelectedEventDetail(response.data.event);
      setActiveTab("eventDetail");
    } catch (error) {
      console.error("Failed to fetch event detail:", error);
      alert("Could not load event details.");
    } finally {
      setLoading(false);
    }
  };

  const handleHostInputChange = (e) => {
    const { name, value } = e.target;
    setHostApplicationData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const cancelBooking = useCallback(
    async (bookingId) => {
      if (
        !confirm(
          "Are you sure you want to cancel this booking? A refund will be processed if applicable."
        )
      ) {
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const response = await axios.post(
          `${API_BASE}/cancellations/${bookingId}/cancel`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let alertMessage = response.data.message;
        if (
          response.data.refund_status === "processed" ||
          response.data.refund_status === "already_refunded"
        ) {
          alertMessage += ` ✅ Refund ID: ${response.data.refund_id}`;
        } else if (response.data.refund_status === "pending") {
          alertMessage += " ⏳ Refund processing...";
        } else if (response.data.refund_status === "failed") {
          alertMessage += " ❌ Please contact support for manual refund.";
        } else if (response.data.refund_status === "no_payment") {
          alertMessage += " ℹ️ No payment was made for this booking.";
        }
        alert(alertMessage);
        fetchMyBookings();
        fetchEvents();
      } catch (error) {
        console.error("Cancellation error:", error.response?.data);
        alert(error.response?.data?.error || "Failed to cancel booking");
      }
    },
    [fetchMyBookings, fetchEvents]
  );

  const handleCancelPendingBooking = useCallback(
    async (bookingId) => {
      if (!confirm("Are you sure you want to cancel this pending booking?")) {
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        await axios.post(
          `${API_BASE}/bookings/${bookingId}/cancel-pending`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Booking cancelled.");
        fetchMyBookings();
        fetchEvents();
      } catch (error) {
        console.error("Cancel pending booking error:", error);
        alert(error.response?.data?.error || "Failed to cancel booking.");
      }
    },
    [fetchMyBookings, fetchEvents]
  );

  const onResumePayment = useCallback(
    (bookingId) => {
      const token = localStorage.getItem("token");

      return new Promise((resolve, reject) => {
        if (!token || !user) {
          alert("Please login to book tickets");
          return reject(new Error("User not logged in"));
        }

        const processPayment = async () => {
          try {
            const paymentResponse = await axios.post(
              `${API_BASE}/payments/resume-order`,
              { booking_id: bookingId },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            const orderData = paymentResponse.data;

            if (!window.Razorpay) {
              alert("Payment system is loading. Please try again in a moment.");
              return reject(new Error("Razorpay not loaded"));
            }

            const options = {
              key: orderData.key_id,
              amount: orderData.amount * 100,
              currency: orderData.currency,
              name: "Happening Events",
              description: `Complete payment for booking`,
              order_id: orderData.order_id,

              handler: async function (response) {
                try {
                  const verifyResponse = await axios.post(
                    `${API_BASE}/payments/verify-payment`,
                    {
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  if (verifyResponse.data.success) {
                    alert(`🎉 Payment successful! Booking confirmed.`);
                    fetchEvents();
                    fetchMyBookings();
                    resolve(true);
                  } else {
                    alert("Payment verification failed.");
                    reject(new Error("Payment verification failed"));
                  }
                } catch (error) {
                  alert("Payment verification failed.");
                  reject(error);
                }
              },
              prefill: {
                name: user.name,
                email: user.email,
              },
              theme: {
                color: "#007bff",
              },
              modal: {
                ondismiss: function () {
                  alert("Payment cancelled.");
                  reject(new Error("Payment cancelled"));
                },
              },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
          } catch (error) {
            console.error("Resume payment error:", error);
            alert(error.response?.data?.error || "Failed to resume payment");
            reject(error);
          }
        };
        processPayment();
      });
    },
    [user, fetchEvents, fetchMyBookings]
  );

  // Host-specific functions
  const fetchMyCreatedEvents = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return; // <-- Good check
    try {
      const response = await axios.get(`${API_BASE}/events/my-events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyCreatedEvents(response.data.events);
    } catch (error) {
      console.error("Failed to fetch host's events:", error);
    }
  }, [user]);

  const fetchBookingsForEvent = useCallback(
    async (event) => {
      const token = localStorage.getItem("token");
      if (!token || !user || !event) return;
      try {
        const response = await axios.get(
          `${API_BASE}/bookings/event/${event.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEventBookings(response.data.bookings);
        setSelectedEventForBookings(event);
        setShowBookingsModal(true);
      } catch (error) {
        console.error("Failed to fetch event bookings:", error);
        alert("Could not load bookings. Are you the host?");
      }
    },
    [user]
  );

  const fetchMyPayouts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;
    try {
      const response = await axios.get(`${API_BASE}/hosts/my-payouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayouts(response.data.payouts);
    } catch (error) {
      console.error("Failed to fetch payouts:", error);
    }
  }, [user]);

  const fetchBankAccount = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;
    try {
      const response = await axios.get(`${API_BASE}/hosts/bank-account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBankAccount(response.data.bank_account);
    } catch (error) {
      console.error("Failed to fetch bank account:", error);
    }
  }, [user]);

  const fetchHostStatus = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;
    try {
      const response = await axios.get(`${API_BASE}/hosts/my-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHostStatus(response.data.hostStatus);
    } catch (error) {
      console.error("Failed to fetch host status:", error);
    }
  }, [user]);

  const handleCancelEvent = useCallback(
    async (eventId) => {
      if (
        !confirm(
          "Are you sure you want to cancel this event?\nThis will refund ALL confirmed bookings. This action cannot be undone."
        )
      ) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await axios.post(
          `${API_BASE}/events/${eventId}/cancel`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        alert(
          "Event cancelled successfully and all bookings have been refunded."
        );

        fetchMyCreatedEvents();
        fetchEvents();
        fetchMyBookings();
      } catch (error) {
        console.error("Cancel event error:", error);
        alert(error.response?.data?.error || "Failed to cancel the event.");
      }
    },
    [fetchMyCreatedEvents, fetchEvents, fetchMyBookings]
  );

  const handleEventInputChange = (e) => {
    const { name, value } = e.target;
    setEventFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to create/edit events");
      return;
    }

    try {
      if (
        !eventFormData.title ||
        !eventFormData.date_time ||
        !eventFormData.venue ||
        !eventFormData.total_tickets ||
        !eventFormData.price ||
        !eventFormData.category
      ) {
        alert("Please fill in all required fields");
        return;
      }

      if (user?.role !== "admin" && parseFloat(eventFormData.price) > 0) {
        if (!bankAccount) {
          alert("Please add your bank account details to create paid events");
          setShowBankAccountForm(true);
          return;
        }
        if (!bankAccount.is_verified) {
          alert(
            "Your bank account is pending verification. You can only create free events until it's verified."
          );
          return;
        }
      }

      let response;

      if (eventToEdit) {
        // This is an UPDATE
        response = await axios.put(
          `${API_BASE}/events/${eventToEdit.id}`,
          eventFormData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Event updated successfully!");
      } else {
        // This is a CREATE
        response = await axios.post(`${API_BASE}/events`, eventFormData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        alert(response.data.message || "Event request created successfully!");
      }

      setEventFormData({
        title: "",
        description: "",
        date_time: "",
        venue: "",
        total_tickets: "",
        price: "",
        category: "",
        image_url: "",
      });
      setShowEventForm(false);
      setEventToEdit(null);

      fetchEvents();
      fetchMyCreatedEvents();
    } catch (error) {
      console.error("Event submit error:", error);
      alert(error.response?.data?.error || "Failed to submit event");
    }
  };

  const handleCloseEventForm = () => {
    setShowEventForm(false);
    setEventToEdit(null);
    setEventFormData({
      title: "",
      description: "",
      date_time: "",
      venue: "",
      total_tickets: "",
      price: "",
      category: "",
      image_url: "",
    });
  };
  const handleOpenEditModal = (event) => {
    const formattedEvent = {
      ...event,
      date_time: event.date_time ? event.date_time.slice(0, 16) : "",
    };
    setEventToEdit(formattedEvent);
    setEventFormData(formattedEvent);
    setShowEventForm(true);
  };

  const fetchPendingEvents = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/events/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingEvents(response.data.events);
    } catch (error) {
      console.error("Failed to fetch pending events:", error);
    }
  }, []);

  const fetchAllApprovedEvents = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/events/admin/approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllApprovedEvents(response.data.events);
    } catch (error) {
      console.error("Failed to fetch all approved events:", error);
    }
  }, []);

  const fetchAllRejectedEvents = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/events/admin/rejected`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllRejectedEvents(response.data.events);
    } catch (error) {
      console.error("Failed to fetch all rejected events:", error);
    }
  }, []);

  const fetchPendingHosts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(
        `${API_BASE}/hosts/applications/pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPendingHosts(response.data.applications);
    } catch (error) {
      console.error("Failed to fetch pending hosts:", error);
    }
  }, []);

  const fetchApprovedHosts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/hosts/admin/approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApprovedHosts(response.data.applications);
    } catch (error) {
      console.error("Failed to fetch approved hosts:", error);
    }
  }, []);

  const fetchRejectedHosts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/hosts/admin/rejected`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRejectedHosts(response.data.applications);
    } catch (error) {
      console.error("Failed to fetch rejected hosts:", error);
    }
  }, []);

  const fetchPayableEvents = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(
        `${API_BASE}/hosts/admin/payable-events`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPayableEvents(response.data.events);
    } catch (error) {
      console.error("Failed to fetch payable events:", error);
      alert("Could not load list of events to be paid.");
    }
  }, []);

  // Admin-specific functions
  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  }, []);

  const reviewEvent = useCallback(
    async (eventId, action, notes = "") => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        await axios.post(
          `${API_BASE}/events/admin/${eventId}/review`,
          { action, adminNotes: notes },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert(`Event ${action}d successfully!`);
        fetchPendingEvents();
        fetchAllApprovedEvents();
        fetchAllRejectedEvents();
        fetchEvents();
      } catch (error) {
        alert(error.response?.data?.error || "Failed to review event");
      }
    },
    [
      fetchPendingEvents,
      fetchAllApprovedEvents,
      fetchAllRejectedEvents,
      fetchEvents,
    ]
  );

  const fetchUserProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      localStorage.removeItem("token");
    }
  }, []);

  const reviewHost = useCallback(
    async (userId, action, notes = "") => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        await axios.post(
          `${API_BASE}/hosts/applications/${userId}/review`,
          { action, adminNotes: notes },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert(`Host application ${action}d successfully!`);
        fetchPendingHosts();
        fetchApprovedHosts();
        fetchRejectedHosts();
        if (action === "approve") {
          await fetchUserProfile();
          await fetchHostStatus();
          await fetchBankAccount();
        }
      } catch (error) {
        alert(
          error.response?.data?.error || "Failed to review host application"
        );
      }
    },
    [
      fetchPendingHosts,
      fetchApprovedHosts,
      fetchRejectedHosts,
      fetchUserProfile,
      fetchHostStatus,
      fetchBankAccount,
    ]
  );

  const fetchAdminPayouts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/hosts/admin/payouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminPayouts(response.data.payouts);
    } catch (error) {
      console.error("Failed to fetch admin payouts:", error);
    }
  }, []);

  const createPayout = useCallback(
    async (e) => {
      e.preventDefault();
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        await axios.post(`${API_BASE}/hosts/payouts/create`, payoutFormData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("✅ Payout created successfully! (Simulated)");
        setShowPayoutModal(false);
        setPayoutFormData({
          event_id: "",
          host_id: "",
          amount: "",
          notes: "",
        });
        fetchAdminPayouts();
      } catch (error) {
        alert(error.response?.data?.error || "Failed to create payout");
      }
    },
    [payoutFormData, fetchAdminPayouts]
  );

  // const checkAPIHealth = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     const response = await axios.get(`${API_BASE}/health`);
  //     setHealth(response.data);
  //   } catch (error) {
  //     console.error("Failed to connect to API:", error);
  //     setHealth({
  //       message: "❌ Failed to connect to backend API",
  //       error: error.message,
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  const getPayoutStatusColor = (status) => {
    switch (status) {
      case "processed":
        return "badge-success";
      case "processing":
        return "badge-warning";
      case "failed":
        return "badge-danger";
      default:
        return "badge-secondary";
    }
  };

  const getPayoutStatusText = (status) => {
    switch (status) {
      case "processed":
        return "✅ Processed";
      case "processing":
        return "⏳ Processing";
      case "failed":
        return "❌ Failed";
      case "pending":
        return "⏰ Pending";
      default:
        return status;
    }
  };

  /**
   * HOOK 1: App Initialization
   * Runs ONCE on load. Its only job is to fetch PUBLIC data
   * and try to log the user in (fetchUserProfile).
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        // 1. Fetch all public-facing data
        // await checkAPIHealth();
        await fetchEvents();
        await fetchCategories();

        // 2. Check for a token and fetch ONLY the user profile.
        // The *other* useEffect will be triggered by this.
        const token = localStorage.getItem("token");
        if (token) {
          await fetchUserProfile();
        }
      } catch (error) {
        console.error("❌ App initialization error:", error);
      } finally {
        setLoading(false);
      }
    };
    initializeApp();
  }, [fetchEvents, fetchCategories, fetchUserProfile]);

  /**
   * HOOK 2: Search Debouncer
   * Runs 500ms after the user stops changing any search filter.
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // The if-condition now correctly checks ALL filters
      if (
        searchQuery ||
        selectedCategory !== "all" ||
        minPrice ||
        maxPrice ||
        searchLocation ||
        searchDate !== "anytime"
      ) {
        searchEvents();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [
    searchEvents,
    searchQuery,
    selectedCategory,
    minPrice,
    maxPrice,
    searchLocation,
    searchRadius,
    searchDate,
  ]);

  /**
   * HOOK 3: Private Data Fetcher (The "Role" Hook)
   * This hook's job is to react to the 'user' or 'hostStatus'
   * changing, and fetch all private data for that user.
   */
  useEffect(() => {
    // 1. Fetch data for ALL logged-in users
    if (user) {
      fetchHostStatus();
      fetchBankAccount();
      fetchMyBookings();
    }

    // 2. Fetch data for ADMINS
    if (user?.role === "admin") {
      fetchPendingEvents();
      fetchPendingHosts();
      fetchAdminPayouts();
      fetchAllApprovedEvents();
      fetchAllRejectedEvents();
      fetchAnalytics();
    }

    // 3. Fetch data for APPROVED HOSTS
    if (user && hostStatus?.host_status === "approved") {
      fetchMyPayouts();
      fetchMyCreatedEvents();
    }
  }, [
    user,
    hostStatus,
    fetchHostStatus,
    fetchBankAccount,
    fetchMyBookings,
    fetchPendingEvents,
    fetchPendingHosts,
    fetchAdminPayouts,
    fetchAllApprovedEvents,
    fetchAllRejectedEvents,
    fetchAnalytics,
    fetchMyPayouts,
    fetchMyCreatedEvents,
  ]);
  return (
    <div className="app-shell">
      <Header
        user={user}
        activeTab={activeTab}
        onNavigate={setActiveTab}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        hostStatus={hostStatus}
      />

      <main className="app-content container">
        {loading && <div className="loading-spinner">Loading...</div>}

        {activeTab === "events" && (
          <EventPage
            events={events}
            categories={categories}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            searchLocation={searchLocation}
            setSearchLocation={setSearchLocation}
            searchRadius={searchRadius}
            setSearchRadius={setSearchRadius}
            searchDate={searchDate}
            setSearchDate={setSearchDate}
            onSearch={searchEvents}
            onClear={clearFilters}
            onRefresh={fetchEvents}
            onBook={createBooking}
            onViewDetail={handleViewEventDetail}
            user={user}
            onLoginClick={() => setShowLoginModal(true)}
          />
        )}

        {activeTab === "bookings" && user && (
          <MyBookings
            myBookings={myBookings}
            onCancel={cancelBooking}
            onRefresh={fetchMyBookings}
            onResumePayment={onResumePayment}
            onViewDetail={handleViewEventDetail}
            onCancelPending={handleCancelPendingBooking}
            activeTab={bookingsSubTab}
            setActiveTab={setBookingsSubTab}
            highlightEventId={highlightEventId}
            setHighlightEventId={setHighlightEventId}
          />
        )}

        {activeTab === "host" && user && (
          <HostDashboard
            user={user}
            hostStatus={hostStatus}
            bankAccount={bankAccount}
            payouts={payouts}
            onRefreshPayouts={fetchMyPayouts}
            onShowHostModal={() => setShowHostApplicationModal(true)}
            showBankAccountForm={showBankAccountForm}
            setShowBankAccountForm={setShowBankAccountForm}
            bankAccountData={bankAccountData}
            setBankAccountData={setBankAccountData}
            onAddBankAccount={addBankAccount}
            getPayoutStatusColor={getPayoutStatusColor}
            getPayoutStatusText={getPayoutStatusText}
            onShowEventForm={() => setShowEventForm(true)}
            myCreatedEvents={myCreatedEvents}
            onViewBookings={fetchBookingsForEvent}
            onEditEvent={handleOpenEditModal}
            onViewDetail={handleViewEventDetail}
            onCancelEvent={handleCancelEvent}
          />
        )}

        {activeTab === "admin" && user?.role === "admin" && (
          <AdminPanel
            pendingEvents={pendingEvents}
            allApprovedEvents={allApprovedEvents}
            allRejectedEvents={allRejectedEvents}
            onReviewEvent={reviewEvent}
            pendingHosts={pendingHosts}
            approvedHosts={approvedHosts}
            rejectedHosts={rejectedHosts}
            onReviewHost={reviewHost}
            adminPayouts={adminPayouts}
            onRefreshPayouts={fetchAdminPayouts}
            onShowPayoutModal={async () => {
              await fetchPayableEvents();
              setShowPayoutModal(true);
            }}
            getPayoutStatusColor={getPayoutStatusColor}
            getPayoutStatusText={getPayoutStatusText}
            onShowEventForm={() => setShowEventForm(true)}
            onEditEvent={handleOpenEditModal}
            myCreatedEvents={myCreatedEvents}
            onViewBookings={fetchBookingsForEvent}
            onViewDetail={handleViewEventDetail}
            onCancelEvent={handleCancelEvent}
            analytics={analytics}
          />
        )}

        {activeTab === "eventDetail" && (
          <EventDetailPage
            event={selectedEventDetail}
            user={user}
            onBook={createBooking}
            onLoginClick={() => setShowLoginModal(true)}
            onBack={() => setActiveTab("events")}
          />
        )}
      </main>

      {/* <HealthCheckFooter health={health} onRefresh={checkAPIHealth} /> */}

      {showLoginModal && (
        <AuthModal
          onClose={() => setShowLoginModal(false)}
          handleAuth={handleAuth}
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          name={name}
          setName={setName}
        />
      )}

      {showEventForm && (
        <EventFormModal
          onClose={handleCloseEventForm}
          onSubmit={handleEventSubmit}
          formData={eventFormData}
          onInputChange={handleEventInputChange}
          categories={categories}
          user={user}
          bankAccount={bankAccount}
          eventToEdit={eventToEdit}
        />
      )}

      {showHostApplicationModal && (
        <HostApplicationModal
          onClose={() => setShowHostApplicationModal(false)}
          onApplyAsHost={applyAsHost}
          hostApplicationData={hostApplicationData}
          onHostInputChange={handleHostInputChange}
        />
      )}

      {showPayoutModal && (
        <PayoutModal
          onClose={() => setShowPayoutModal(false)}
          onSubmit={createPayout}
          payoutFormData={payoutFormData}
          setPayoutFormData={setPayoutFormData}
          payableEvents={payableEvents}
        />
      )}

      {showBookingsModal && (
        <EventBookingsModal
          bookings={eventBookings}
          eventTitle={selectedEventForBookings?.title}
          onClose={() => setShowBookingsModal(false)}
        />
      )}
    </div>
  );
}

export default App;
