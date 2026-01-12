// main-app/public/assets/js/scripts.js

// ===== GLOBAL STATE =====
const bookingState = {
  movieId: null,
  movieName: null,
  movieAvatar: null,
  movieDuration: null,
  movieAgeRating: null,
  cinema: "",
  date: "",
  time: "",
  format: "",
  selectedSeats: [],
  ticketPrice: 0,
  prices: {
    standard: 50000,
    vip: 60000,
    couple: 110000,
  },
  combos: {},
  comboTotal: 0,
  customerInfo: {
    name: "",
    phone: "",
    email: "",
    note: "",
  },
  paymentMethod: "cash",
  bookingId: null,
  bookingCode: null,
};

// ===== INITIALIZE =====
// document.addEventListener("DOMContentLoaded", function () {
//   const currentPage = window.location.pathname;

//   console.log("=== PAGE LOADED ===", currentPage);

//   // Load movie detail
//   if (currentPage.includes("/movie/detail/")) {
//     const movieId = currentPage.split("/").pop();
//     loadMovieDetail(movieId);
//   }

//   // Initialize seat grid
//   if (document.getElementById("seat-grid")) {
//     console.log("Initializing seat grid...");
//     initSeatGrid();
//   }

//   // Initialize combo page
//   if (document.getElementById("page-combo-selection")) {
//     console.log("Initializing combo page...");
//     initComboPage();
//   }

//   // Initialize checkout page
//   if (document.getElementById("page-checkout")) {
//     console.log("Initializing checkout page...");
//     initCheckoutPage();
//   }
// });

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const movieId = params.get("id");

  console.log("Movie ID:", movieId);

  if (movieId) {
    loadMovieDetail(movieId);
  }

  if (document.getElementById("seat-grid")) {
    initSeatGrid();
  }

  if (document.getElementById("page-combo-selection")) {
    initComboPage();
  }

  if (document.getElementById("page-checkout")) {
    initCheckoutPage();
  }
});

// ===== LOAD MOVIE DETAIL =====
async function loadMovieDetail(movieId) {
  try {
    const loadingEl = document.getElementById("loading-state");
    const contentEl = document.getElementById("movie-detail-content");

    const res = await fetch(
      `http://localhost:8080/api/catalog/client/movies/${movieId}`
    );
    const data = await res.json();

    if (data.code === "success") {
      const movie = data.data;

      // ✅ Save FULL movie data to state
      bookingState.movieId = movie._id;
      bookingState.movieName = movie.name;
      bookingState.movieAvatar = movie.avatar;
      bookingState.movieDuration = movie.duration;
      bookingState.movieAgeRating = movie.ageRating;
      bookingState.prices = movie.prices || bookingState.prices;

      // ✅ Update ALL movie info in UI
      document.getElementById("movie-avatar").src = movie.avatar;
      document.getElementById("movie-name").textContent = movie.name;
      document.getElementById("movie-age-rating").textContent = movie.ageRating;
      document.getElementById("movie-language").textContent = movie.language;
      document.getElementById("movie-duration").textContent = movie.duration;
      document.getElementById("movie-director").textContent = movie.director;
      document.getElementById("movie-cast").textContent = movie.cast;
      document.getElementById("movie-category").textContent = movie.category;
      document.getElementById("movie-description").textContent =
        movie.description;

      const releaseDate = new Date(movie.releaseDate);
      document.getElementById("movie-release-date").textContent =
        releaseDate.toLocaleDateString("vi-VN");

      // Render showtimes
      renderShowtimes(movie.showtimes);

      // Hide loading, show content
      loadingEl.style.display = "none";
      contentEl.style.display = "block";
    }
  } catch (err) {
    console.error("Error loading movie:", err);
    document.getElementById("loading-state").innerHTML = `
            <i class="fa-solid fa-exclamation-triangle" style="font-size: 48px; color: #EF5350;"></i>
            <p style="margin-top: 20px; color: #666;">Không thể tải thông tin phim!</p>
            <button onclick="window.location.href='/'" class="btn btn-primary" style="margin-top: 15px;">
                <i class="fa-solid fa-home"></i> Về trang chủ
            </button>
        `;
  }
}

// ===== RENDER SHOWTIMES =====
function renderShowtimes(showtimes) {
  if (!showtimes || showtimes.length === 0) return;

  const cinemaList = document.querySelector(".cinema-list");
  if (!cinemaList) return;

  // Group by cinema
  const grouped = {};
  showtimes.forEach((st) => {
    if (!grouped[st.cinema]) {
      grouped[st.cinema] = {};
    }
    const dateKey = new Date(st.date).toISOString().split("T")[0];
    if (!grouped[st.cinema][dateKey]) {
      grouped[st.cinema][dateKey] = {
        times: st.times || [],
        format: st.format,
      };
    }
  });

  cinemaList.innerHTML = "";

  Object.keys(grouped).forEach((cinema) => {
    const cinemaItem = document.createElement("div");
    cinemaItem.className = "cinema-item";

    let datesHTML = '<div class="date-tabs">';
    const dates = Object.keys(grouped[cinema]);
    dates.forEach((date, idx) => {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString("vi-VN", { weekday: "short" });
      const dayNum = dateObj.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });

      datesHTML += `
                <div class="date-tab ${
                  idx === 0 ? "active" : ""
                }" data-date="${date}">
                    <div style="font-weight: 700;">${dayName}</div>
                    <div style="font-size: 12px;">${dayNum}</div>
                </div>
            `;
    });
    datesHTML += "</div>";

    let timesHTML = '<div class="time-slots">';
    const firstDate = dates[0];
    const times = grouped[cinema][firstDate].times;
    const format = grouped[cinema][firstDate].format;

    times.forEach((time) => {
      timesHTML += `
                <div class="time-slot" data-time="${time}" data-format="${format}">
                    ${time} - ${format}
                </div>
            `;
    });
    timesHTML += "</div>";

    cinemaItem.innerHTML = `
            <div class="cinema-name"><i class="fa-solid fa-building"></i> ${cinema}</div>
            ${datesHTML}
            ${timesHTML}
        `;

    cinemaList.appendChild(cinemaItem);
  });

  attachShowtimeListeners();
}

// ===== ATTACH SHOWTIME LISTENERS =====
function attachShowtimeListeners() {
  document.querySelectorAll(".date-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const parent = this.closest(".cinema-item");
      parent
        .querySelectorAll(".date-tab")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      parent
        .querySelectorAll(".time-slot")
        .forEach((t) => t.classList.remove("selected"));
      checkShowtimeSelection();
    });
  });

  document.querySelectorAll(".time-slot").forEach((slot) => {
    slot.addEventListener("click", function () {
      document
        .querySelectorAll(".time-slot")
        .forEach((s) => s.classList.remove("selected"));
      this.classList.add("selected");

      const cinemaItem = this.closest(".cinema-item");
      const cinemaName = cinemaItem
        .querySelector(".cinema-name")
        .textContent.trim()
        .split(" ")
        .slice(1)
        .join(" ");
      const activeDate = cinemaItem.querySelector(".date-tab.active");
      const dateValue = activeDate ? activeDate.getAttribute("data-date") : "";

      bookingState.cinema = cinemaName;
      bookingState.date = dateValue;
      bookingState.time = this.getAttribute("data-time");
      bookingState.format = this.getAttribute("data-format");

      checkShowtimeSelection();
    });
  });

  const btnToSeat = document.getElementById("btn-to-seat");
  if (btnToSeat) {
    btnToSeat.addEventListener("click", function () {
      if (bookingState.time) {
        sessionStorage.setItem("bookingData", JSON.stringify(bookingState));
        window.location.href = "3002-user-booking-seat.html";
      }
    });
  }
}

function checkShowtimeSelection() {
  const btn = document.getElementById("btn-to-seat");
  if (btn) {
    btn.disabled = !bookingState.time;
  }
}

// ===== SEAT GRID =====
function initSeatGrid() {
  const seatGrid = document.getElementById("seat-grid");
  if (!seatGrid) return;

  // Load from sessionStorage
  const savedData = sessionStorage.getItem("bookingData");
  if (savedData) {
    Object.assign(bookingState, JSON.parse(savedData));
  }

  // ✅ Update seat page info
  const avatarEl = document.getElementById("seat-movie-avatar");
  if (avatarEl && bookingState.movieAvatar) {
    avatarEl.src = bookingState.movieAvatar;
    avatarEl.style.display = "block";
  }

  document.getElementById("seat-movie-name").textContent =
    bookingState.movieName || "-";
  document.getElementById("seat-cinema").textContent =
    bookingState.cinema || "-";
  document.getElementById("seat-date").textContent = bookingState.date
    ? new Date(bookingState.date).toLocaleDateString("vi-VN")
    : "-";
  document.getElementById("seat-time").textContent = bookingState.time
    ? `${bookingState.time} - ${bookingState.format}`
    : "-";

  // ✅ Update prices from movie data
  document.getElementById("price-standard").textContent = formatPrice(
    bookingState.prices.standard
  );
  document.getElementById("price-vip").textContent = formatPrice(
    bookingState.prices.vip
  );
  document.getElementById("price-couple").textContent = formatPrice(
    bookingState.prices.couple
  );

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const seatsPerRow = 10;
  const vipRows = ["F", "G", "H"];
  const coupleRow = "J";

  loadBookedSeats();

  rows.forEach((row) => {
    const seatRow = document.createElement("div");
    seatRow.className = "seat-row";

    if (row === coupleRow) {
      for (let i = 1; i <= seatsPerRow; i += 2) {
        const seatNum = `${row}${i}-${row}${i + 1}`;
        const seat = createSeat(seatNum, "couple", bookingState.prices.couple);
        seatRow.appendChild(seat);
      }
    } else {
      for (let i = 1; i <= seatsPerRow; i++) {
        const seatNum = `${row}${i}`;
        let type = "normal";
        let price = bookingState.prices.standard;

        if (vipRows.includes(row)) {
          type = "vip";
          price = bookingState.prices.vip;
        }

        const seat = createSeat(seatNum, type, price);
        seatRow.appendChild(seat);
      }
    }

    seatGrid.appendChild(seatRow);
  });

  const btnToCombo = document.getElementById("btn-to-combo");
  if (btnToCombo) {
    btnToCombo.addEventListener("click", function () {
      if (bookingState.selectedSeats.length > 0) {
        sessionStorage.setItem("bookingData", JSON.stringify(bookingState));
        window.location.href = "3002-user-booking-combo.html";
      }
    });
  }
}

async function loadBookedSeats() {
  if (
    !bookingState.movieId ||
    !bookingState.cinema ||
    !bookingState.date ||
    !bookingState.time
  ) {
    return;
  }

  try {
    const url = `http://localhost:8080/api/bookings/seats/booked?movieId=${
      bookingState.movieId
    }&cinema=${encodeURIComponent(bookingState.cinema)}&date=${
      bookingState.date
    }&time=${encodeURIComponent(bookingState.time)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === "success" && data.data.bookedSeats) {
      data.data.bookedSeats.forEach((seatNum) => {
        const seatEl = document.querySelector(`[data-seat="${seatNum}"]`);
        if (seatEl) {
          seatEl.classList.add("seat-booked");
          seatEl.style.pointerEvents = "none";
        }
      });
    }
  } catch (err) {
    console.error("Error loading booked seats:", err);
  }
}

function createSeat(seatNum, type, price) {
  const seat = document.createElement("div");
  seat.className = `seat seat-${type}`;
  seat.textContent = seatNum;
  seat.setAttribute("data-seat", seatNum);
  seat.setAttribute("data-price", price);

  seat.addEventListener("click", function () {
    if (this.classList.contains("seat-booked")) return;
    toggleSeat(this);
  });

  return seat;
}

function toggleSeat(seatElement) {
  const seatNum = seatElement.getAttribute("data-seat");
  const price = parseInt(seatElement.getAttribute("data-price"));
  const type = seatElement.classList.contains("seat-vip")
    ? "vip"
    : seatElement.classList.contains("seat-couple")
    ? "couple"
    : "standard";

  if (seatElement.classList.contains("selected")) {
    seatElement.classList.remove("selected");
    const index = bookingState.selectedSeats.findIndex(
      (s) => s.seatNumber === seatNum
    );
    if (index > -1) {
      bookingState.selectedSeats.splice(index, 1);
    }
  } else {
    seatElement.classList.add("selected");
    bookingState.selectedSeats.push({
      seatNumber: seatNum,
      type: type,
      price: price,
    });
  }

  updateSeatDisplay();
}

function updateSeatDisplay() {
  const display = document.getElementById("selected-seats-display");
  const priceDisplay = document.getElementById("total-price");
  const btnNext = document.getElementById("btn-to-combo");

  if (!display || !priceDisplay) return;

  if (bookingState.selectedSeats.length === 0) {
    display.textContent = "Chưa chọn ghế";
    priceDisplay.textContent = "0đ";
    if (btnNext) btnNext.disabled = true;
  } else {
    const seatNumbers = bookingState.selectedSeats
      .map((s) => s.seatNumber)
      .join(", ");
    display.textContent = seatNumbers;

    bookingState.ticketPrice = bookingState.selectedSeats.reduce(
      (sum, s) => sum + s.price,
      0
    );
    priceDisplay.textContent = formatPrice(bookingState.ticketPrice);
    if (btnNext) btnNext.disabled = false;
  }
}

// ===== COMBO PAGE =====
function initComboPage() {
  const savedData = sessionStorage.getItem("bookingData");
  if (savedData) {
    Object.assign(bookingState, JSON.parse(savedData));
  }

  const ticketPriceEl = document.getElementById("ticket-price-display");
  if (ticketPriceEl) {
    ticketPriceEl.textContent = formatPrice(bookingState.ticketPrice);
  }

  updateComboTotal();
}

function goToCheckout() {
  sessionStorage.setItem("bookingData", JSON.stringify(bookingState));
  window.location.href = "3002-user-booking-checkout.html";
}

function changeComboQty(comboId, change) {
  const qtyElement = document.getElementById(`combo-qty-${comboId}`);
  if (!qtyElement) return;

  let currentQty = parseInt(qtyElement.textContent);
  let newQty = Math.max(0, currentQty + change);

  qtyElement.textContent = newQty;

  const comboCard = document.querySelector(`[data-combo="${comboId}"]`);
  const price = parseInt(comboCard.getAttribute("data-price"));
  const name = comboCard.querySelector(".combo-name").textContent;

  if (newQty > 0) {
    bookingState.combos[comboId] = {
      name: name,
      quantity: newQty,
      price: price,
    };
  } else {
    delete bookingState.combos[comboId];
  }

  updateComboTotal();
}

function updateComboTotal() {
  bookingState.comboTotal = 0;
  for (let comboId in bookingState.combos) {
    const combo = bookingState.combos[comboId];
    bookingState.comboTotal += combo.price * combo.quantity;
  }

  const comboDisplay = document.getElementById("combo-price-display");
  if (comboDisplay) {
    comboDisplay.textContent = formatPrice(bookingState.comboTotal);
  }

  const totalDisplay = document.getElementById("total-with-combo");
  if (totalDisplay) {
    const total = bookingState.ticketPrice + bookingState.comboTotal;
    totalDisplay.textContent = formatPrice(total);
  }
}

// ===== CHECKOUT PAGE =====
function initCheckoutPage() {
  const savedData = sessionStorage.getItem("bookingData");
  if (savedData) {
    Object.assign(bookingState, JSON.parse(savedData));
  }

  console.log("=== CHECKOUT PAGE DATA ===", bookingState);

  updateCheckoutPage();
}

function updateCheckoutPage() {
  const elements = {
    movieName: document.getElementById("summary-movie-name"),
    movieDuration: document.getElementById("summary-movie-duration"),
    movieRating: document.getElementById("summary-movie-rating"),
    movieAvatar: document.getElementById("summary-movie-avatar"),
    cinema: document.getElementById("summary-cinema"),
    date: document.getElementById("summary-date"),
    time: document.getElementById("summary-time"),
    seats: document.getElementById("summary-seats"),
    combo: document.getElementById("summary-combo"),
    ticketPrice: document.getElementById("summary-ticket-price"),
    comboPrice: document.getElementById("summary-combo-price"),
    total: document.getElementById("summary-total"),
  };

  // ✅ Movie info
  if (elements.movieName)
    elements.movieName.textContent = bookingState.movieName || "-";
  if (elements.movieDuration)
    elements.movieDuration.textContent = bookingState.movieDuration || "-";
  if (elements.movieRating)
    elements.movieRating.textContent = bookingState.movieAgeRating || "-";
  if (elements.movieAvatar && bookingState.movieAvatar) {
    elements.movieAvatar.src = bookingState.movieAvatar;
    elements.movieAvatar.style.display = "block";
  }

  // Booking details
  if (elements.cinema)
    elements.cinema.textContent = bookingState.cinema || "--";
  if (elements.date)
    elements.date.textContent = bookingState.date
      ? new Date(bookingState.date).toLocaleDateString("vi-VN")
      : "--";
  if (elements.time)
    elements.time.textContent = bookingState.time
      ? `${bookingState.time} - ${bookingState.format}`
      : "--";

  if (elements.seats && bookingState.selectedSeats.length > 0) {
    elements.seats.textContent = bookingState.selectedSeats
      .map((s) => s.seatNumber)
      .join(", ");
  }

  const comboCount = Object.keys(bookingState.combos).length;
  if (elements.combo) {
    elements.combo.textContent =
      comboCount > 0 ? `${comboCount} combo` : "Không";
  }

  // Prices
  if (elements.ticketPrice)
    elements.ticketPrice.textContent = formatPrice(bookingState.ticketPrice);
  if (elements.comboPrice)
    elements.comboPrice.textContent = formatPrice(bookingState.comboTotal);

  const total = bookingState.ticketPrice + bookingState.comboTotal;
  if (elements.total) elements.total.textContent = formatPrice(total);

  console.log("✓ Checkout page updated");
}

// ✅ SỬA HÀM NÀY
async function completeBooking() {
  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const emailInput = document.getElementById("customer-email");
  const noteInput = document.getElementById("customer-note");
  const paymentMethod = document.querySelector('input[name="payment"]:checked');

  if (!nameInput || !phoneInput) {
    alert("Không tìm thấy form!");
    return;
  }

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput ? emailInput.value.trim() : "";
  const note = noteInput ? noteInput.value.trim() : "";

  // Validation
  if (!name) {
    alert("Vui lòng nhập họ tên!");
    nameInput.focus();
    return;
  }

  if (!phone) {
    alert("Vui lòng nhập số điện thoại!");
    phoneInput.focus();
    return;
  }

  const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
  if (!phoneRegex.test(phone)) {
    alert("Số điện thoại không đúng định dạng!");
    phoneInput.focus();
    return;
  }

  const selectedPaymentMethod = paymentMethod ? paymentMethod.value : "cash";

  // Prepare payload
  const payload = {
    movieId: bookingState.movieId,
    movieName: bookingState.movieName,
    movieAvatar: bookingState.movieAvatar,
    cinema: bookingState.cinema,
    showtimeDate: bookingState.date,
    showtimeTime: bookingState.time,
    showtimeFormat: bookingState.format,
    seats: bookingState.selectedSeats,
    combos: bookingState.combos,
    fullName: name,
    phone: phone,
    email: email,
    note: note,
    paymentMethod: selectedPaymentMethod,
  };

  console.log("=== SENDING BOOKING ===", payload);

  try {
    const res = await fetch("http://localhost:8080/api/bookings/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.code === "success") {
      const bookingId = data.data.bookingId;
      const bookingCode = data.data.bookingCode;

      // ✅ LƯU BOOKING INFO
      bookingState.bookingId = bookingId;
      bookingState.bookingCode = bookingCode;
      sessionStorage.setItem("bookingData", JSON.stringify(bookingState));

      // ✅ XỬ LÝ THEO PAYMENT METHOD
      if (selectedPaymentMethod === "cash") {
        // ✅ TIỀN MẶT → CHUYỂN SANG PAYMENT SERVICE LUÔN
        // Payment service sẽ hiển thị thông tin booking + hướng dẫn thanh toán tại quầy
        window.location.href = `3003-cash-payment.html?${bookingId}?method=cash`;
      } else if (selectedPaymentMethod === "momo") {
        // ✅ MOMO → CHUYỂN SANG PAYMENT SERVICE
        // Payment service sẽ tạo payment request và redirect tới MoMo
        window.location.href = `/payment/booking/${bookingId}?method=momo`;
      } else if (selectedPaymentMethod === "zalopay") {
        // ✅ ZALOPAY
        window.location.href = `/payment/booking/${bookingId}?method=zalopay`;
      } else if (selectedPaymentMethod === "bank") {
        // ✅ BANK TRANSFER
        window.location.href = `/payment/booking/${bookingId}?method=bank`;
      } else {
        // Fallback
        alert("Phương thức thanh toán không hợp lệ!");
      }
    } else {
      alert(data.message || "Đặt vé thất bại!");
    }
  } catch (err) {
    console.error("Error creating booking:", err);
    alert("Không thể kết nối tới server!");
  }
}

// ===== UTILITY =====
function formatPrice(price) {
  return price.toLocaleString("vi-VN") + "đ";
}
