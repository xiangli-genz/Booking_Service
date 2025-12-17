// controllers/client/booking.controller.js
const Movie = require("../../models/movie.model");
const Booking = require("../../models/booking.model");
const Cinema = require("../../models/cinema.model");
const variableConfig = require("../../config/variable");

const generateHelper = require("../../helpers/generate.helper");
const moment = require("moment");

module.exports.createPost = async (req, res) => {
  try {
    // Tạo mã booking
    const bookingCode = "BK" + generateHelper.generateRandomNumber(10);
    
    let { movieId, cinema, showtimeDate, showtimeTime, showtimeFormat, seats, combos, fullName, phone, email, note, paymentMethod } = req.body;
    
    // ===== FIX CHÍNH: Parse seats ĐÚNG CÁCH =====
    console.log('=== DEBUG SEATS ===');
    console.log('Raw seats:', seats);
    console.log('Type:', typeof seats);
    
    // Nếu seats là string, parse nó
    if (typeof seats === 'string') {
      try {
        seats = JSON.parse(seats);
        console.log('After parse:', seats);
      } catch (e) {
        console.error('Error parsing seats:', e);
        return res.json({
          code: "error",
          message: "Dữ liệu ghế không hợp lệ!"
        });
      }
    }
    
    // Kiểm tra seats có phải array không
    if (!Array.isArray(seats)) {
      console.error('Seats is not array:', seats);
      return res.json({
        code: "error",
        message: "Dữ liệu ghế phải là danh sách!"
      });
    }
    
    // Chuẩn hóa seats - đảm bảo là array of objects
    const seatDetails = seats.map(seat => {
      // Nếu seat là object hợp lệ
      if (typeof seat === 'object' && seat !== null && seat.seatNumber) {
        return {
          seatNumber: seat.seatNumber,
          type: seat.type || 'standard',
          price: parseInt(seat.price) || 50000
        };
      }
      
      // Nếu seat là string (fallback)
      if (typeof seat === 'string') {
        // Thử parse nếu là JSON string
        try {
          const parsed = JSON.parse(seat);
          if (parsed.seatNumber) {
            return {
              seatNumber: parsed.seatNumber,
              type: parsed.type || 'standard',
              price: parseInt(parsed.price) || 50000
            };
          }
        } catch(e) {
          // Không phải JSON, xử lý như string thuần
        }
        
        // Xác định type dựa vào ký tự đầu
        let type = 'standard';
        let price = 50000;
        
        if (seat.startsWith('V')) {
          type = 'vip';
          price = 60000;
        } else if (seat.startsWith('C') || seat.includes('-')) {
          type = 'couple';
          price = 110000;
        }
        
        return { seatNumber: seat, type: type, price: price };
      }
      
      console.error('Invalid seat format:', seat);
      return null;
    }).filter(Boolean);
    
    console.log('Final seatDetails:', seatDetails);
    console.log('==================');
    
    if (seatDetails.length === 0) {
      return res.json({
        code: "error",
        message: "Không có ghế hợp lệ!"
      });
    }
    // ============================================
    
    // Parse combos nếu là string
    if (typeof combos === 'string') {
      try {
        combos = JSON.parse(combos);
      } catch (e) {
        console.error('Error parsing combos:', e);
        combos = {};
      }
    }
    
    // Validate
    if (!movieId || !cinema || !showtimeDate || !showtimeTime) {
      return res.json({
        code: "error",
        message: "Thiếu thông tin đặt vé bắt buộc!"
      });
    }

    if (!fullName || !phone) {
      return res.json({
        code: "error",
        message: "Vui lòng nhập đầy đủ họ tên và số điện thoại!"
      });
    }

    // Lấy thông tin phim
    const movie = await Movie.findOne({
      _id: movieId,
      status: "active",
      deleted: false
    });

    if(!movie) {
      return res.json({
        code: "error",
        message: "Phim không tồn tại hoặc đã ngừng chiếu!"
      });
    }

    // Tính tổng tiền vé
    let subTotal = 0;
    seatDetails.forEach(seat => {
      subTotal += seat.price;
    });

    // Tính tổng tiền combo
    let comboTotal = 0;
    const comboDetails = [];
    
    if(combos && typeof combos === 'object') {
      Object.keys(combos).forEach(key => {
        const combo = combos[key];
        if(combo && combo.quantity && combo.quantity > 0) {
          const quantity = parseInt(combo.quantity) || 0;
          const price = parseInt(combo.price) || 0;
          const totalPrice = price * quantity;
          
          comboTotal += totalPrice;
          comboDetails.push({
            name: combo.name || key,
            quantity: quantity,
            price: price,
            totalPrice: totalPrice
          });
        }
      });
    }

    // Giảm giá
    const discount = 0;

    // Tổng thanh toán
    const total = subTotal + comboTotal - discount;

    // Chuyển đổi showtimeDate sang Date object
    let showtimeDateObj;
    try {
      if (showtimeDate instanceof Date) {
        showtimeDateObj = showtimeDate;
      } else if (typeof showtimeDate === 'string') {
        showtimeDateObj = new Date(showtimeDate);
      } else {
        showtimeDateObj = new Date(showtimeDate);
      }
      
      if (isNaN(showtimeDateObj.getTime())) {
        throw new Error("Invalid date");
      }
    } catch (error) {
      console.error('Date conversion error:', error);
      return res.json({
        code: "error",
        message: "Ngày chiếu không hợp lệ!"
      });
    }

    // ===== QUAN TRỌNG: LƯU VÀO DATABASE =====
    const newBooking = new Booking({
      bookingCode: bookingCode,
      fullName: fullName,
      phone: phone,
      email: email || "",
      note: note || "",
      movieId: movie._id,
      movieName: movie.name,
      movieAvatar: movie.avatar,
      cinema: cinema,
      showtime: {
        date: showtimeDateObj,
        time: showtimeTime,
        format: showtimeFormat || "2D"
      },
      seats: seatDetails, // ← ĐÃ LÀ ARRAY OF OBJECTS
      combos: comboDetails,
      subTotal: subTotal,
      comboTotal: comboTotal,
      discount: discount,
      total: total,
      paymentMethod: paymentMethod || "money",
      paymentStatus: "unpaid",
      status: "initial",
      userId: req.user ? req.user.id : null
    });

    console.log('=== BEFORE SAVE ===');
    console.log('newBooking.seats:', newBooking.seats);
    console.log('Type:', typeof newBooking.seats);
    console.log('Is Array:', Array.isArray(newBooking.seats));
    console.log('First seat:', newBooking.seats[0]);
    console.log('===================');

    await newBooking.save();
    // =========================================

    res.json({
      code: "success",
      message: "Đặt vé thành công!",
      bookingId: newBooking._id
    });

  } catch (error) {
    console.error("Error creating booking:", error);
    res.json({
      code: "error",
      message: "Đặt vé không thành công! Lỗi: " + error.message
    });
  }
}

module.exports.success = async (req, res) => {
  try {
    const { bookingId, phone } = req.query;

    if (!bookingId || !phone) {
      res.redirect("/");
      return;
    }

    const bookingDetail = await Booking.findOne({
      _id: bookingId,
      phone: phone,
      deleted: false
    });

    if(!bookingDetail) {
      res.redirect("/");
      return;
    }

    // Format payment method
    bookingDetail.paymentMethodName = {
      money: "Tiền mặt tại quầy",
      zalopay: "ZaloPay",
      bank: "Chuyển khoản ngân hàng",
      momo: "Momo"
    }[bookingDetail.paymentMethod] || bookingDetail.paymentMethod;

    // Format payment status
    bookingDetail.paymentStatusName = bookingDetail.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán";
    
    // Format booking status
    bookingDetail.statusName = {
      initial: "Đang xử lý",
      confirmed: "Đã xác nhận",
      cancelled: "Đã hủy",
      completed: "Hoàn thành"
    }[bookingDetail.status] || bookingDetail.status;

    // Format dates
    bookingDetail.createdAtFormat = moment(bookingDetail.createdAt).format("HH:mm - DD/MM/YYYY");
    bookingDetail.showtimeDateFormat = moment(bookingDetail.showtime.date).format("DD/MM/YYYY");

    res.render("client/pages/booking-success", {
      pageTitle: "Đặt vé thành công",
      bookingDetail: bookingDetail
    });

  } catch (error) {
    console.error("Error in booking success:", error);
    res.redirect("/");
  }
}

module.exports.getBookedSeats = async (req, res) => {
  try {
    const { movieId, cinema, date, time } = req.query;
    
    if (!movieId || !cinema || !date || !time) {
      return res.json({
        code: "error",
        message: "Thiếu thông tin cần thiết"
      });
    }

    const movie = await Movie.findById(movieId);
    
    if(!movie) {
      return res.json({
        code: "error",
        message: "Phim không tồn tại"
      });
    }

    const searchDate = new Date(date);
    const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

    const bookings = await Booking.find({
      movieId: movieId,
      cinema: cinema,
      "showtime.date": {
        $gte: startOfDay,
        $lte: endOfDay
      },
      "showtime.time": time,
      status: { $in: ["initial", "confirmed"] },
      deleted: false
    });

    const bookedSeats = [];
    bookings.forEach(booking => {
      if (booking.seats && booking.seats.length > 0) {
        booking.seats.forEach(seat => {
          bookedSeats.push(seat.seatNumber);
        });
      }
    });

    res.json({
      code: "success",
      bookedSeats: bookedSeats
    });

  } catch (error) {
    console.error("Error getting booked seats:", error);
    res.json({
      code: "error",
      message: "Lỗi khi lấy thông tin ghế"
    });
  }
}

module.exports.combo = async (req, res) => {
  try {
    const { movieId } = req.query;
    
    if (!movieId) {
      res.redirect("/");
      return;
    }
    
    const movie = await Movie.findOne({
      _id: movieId,
      status: "active",
      deleted: false
    });
    
    if (!movie) {
      res.redirect("/");
      return;
    }
    
    const combos = variableConfig.defaultCombos || [];
    
    res.render("client/pages/booking-combo", {
      pageTitle: "Chọn Combo",
      movieDetail: movie,
      combos: combos
    });
  } catch (error) {
    console.error("Error in combo page:", error);
    res.redirect("/");
  }
};

module.exports.checkout = async (req, res) => {
  try {
    res.render('client/pages/booking-checkout', {
      pageTitle: 'Xác nhận & Thanh toán',
      movieDetail: {}
    });
  } catch (error) {
    console.error("Error in checkout:", error);
    res.redirect('/');
  }
};

// [GET] /admin/booking/list
module.exports.list = async (req, res) => {
  const find = {
    deleted: false
  };

  const dateFiler = {};

  if(req.query.startDate) {
    const startDate = moment(req.query.startDate).startOf("date").toDate();
    dateFiler.$gte = startDate;
  }

  if(req.query.endDate) {
    const endDate = moment(req.query.endDate).endOf("date").toDate();
    dateFiler.$lte = endDate;
  }

  if(Object.keys(dateFiler).length > 0) {
    find.createdAt = dateFiler;
  }

  if (req.query.keyword) {
    const kw = req.query.keyword.trim();
    if (kw.length > 0) {
      const keywordRegex = new RegExp(kw, "i");
      find.$or = [
        { bookingCode: keywordRegex },
        { fullName: keywordRegex },
        { phone: keywordRegex }
      ];
    }
  }

  // PHÂN TRANG
  const limit = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const totalRecords = await Booking.countDocuments(find);
  const totalPages = Math.ceil(totalRecords / limit);

  const bookingList = await Booking
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .skip(skip)
    .limit(limit);

  for (const booking of bookingList) {
    booking.paymentMethodName = {
      money: "Tiền mặt",
      zalopay: "ZaloPay",
      bank: "Chuyển khoản",
      momo: "Momo"
    }[booking.paymentMethod] || booking.paymentMethod;

    booking.paymentStatusName = booking.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán";

    booking.statusName = {
      initial: "Đang xử lý",
      confirmed: "Đã xác nhận", 
      cancelled: "Đã hủy",
      completed: "Hoàn thành"
    }[booking.status] || booking.status;

    booking.createdAtTime = moment(booking.createdAt).format("HH:mm");
    booking.createdAtDate = moment(booking.createdAt).format("DD/MM/YYYY");
    
    if(booking.showtime && booking.showtime.date) {
      booking.showtimeDateFormat = moment(booking.showtime.date).format("DD/MM/YYYY");
    } else {
      booking.showtimeDateFormat = "--";
    }
    
    // Nếu có userId, gắn thông tin user để hiển thị
    if(booking.userId) {
      try {
        const userInfo = await User.findOne({ _id: booking.userId }).select('fullName email');
        booking.userFullName = userInfo ? (userInfo.fullName || userInfo.email) : null;
      } catch (e) {
        booking.userFullName = null;
      }
    }
  }

  res.render("admin/pages/booking-list", {
    pageTitle: "Quản lý đặt vé",
    bookingList: bookingList,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalRecords: totalRecords,
      limit: limit,
      endRecord: Math.min(page * limit, totalRecords)
    }
  });
};

// [GET] /admin/booking/edit/:id
module.exports.edit = async (req, res) => {
  try {
    const id = req.params.id;

    const bookingDetail = await Booking.findOne({
      _id: id,
      deleted: false
    });

    if(!bookingDetail) {
      res.redirect(`/${pathAdmin}/booking/list`);
      return;
    }

    // Format thời gian
    bookingDetail.createdAtFormat = moment(bookingDetail.createdAt).format("YYYY-MM-DDTHH:mm");
    
    if(bookingDetail.showtime && bookingDetail.showtime.date) {
      bookingDetail.showtimeDateFormat = moment(bookingDetail.showtime.date).format("DD/MM/YYYY");
    } else {
      bookingDetail.showtimeDateFormat = "--";
    }

    // Thêm thông tin user nếu có
    if(bookingDetail.userId) {
      try {
        const User = require("../../models/user.model");
        const userInfo = await User.findOne({ _id: bookingDetail.userId }).select('fullName email phone');
        bookingDetail.userInfo = userInfo;
      } catch (e) {
        bookingDetail.userInfo = null;
      }
    }

    res.render("admin/pages/booking-edit", {
      pageTitle: `Đặt vé: ${bookingDetail.bookingCode}`,
      bookingDetail: bookingDetail,
      paymentMethod: require("../../config/variable").paymentMethod,
      paymentStatus: require("../../config/variable").paymentStatus,
      bookingStatus: require("../../config/variable").bookingStatus
    });
  } catch (error) {
    console.error("Error in booking edit:", error);
    res.redirect(`/${pathAdmin}/booking/list`);
  }
};

// [PATCH] /admin/booking/edit/:id
module.exports.editPatch = async (req, res) => {
  try {
    const id = req.params.id;

    const booking = await Booking.findOne({
      _id: id,
      deleted: false
    });

    if(!booking) {
      return res.json({
        code: "error",
        message: "Thông tin đặt vé không hợp lệ!"
      });
    }

    // Chỉ cập nhật các trường được phép
    const updateData = {
      paymentStatus: req.body.paymentStatus,
      status: req.body.status,
      note: req.body.note || "",
      updatedBy: req.account.id
    };

    await Booking.updateOne({
      _id: id,
      deleted: false
    }, updateData);

    req.flash("success", "Cập nhật đặt vé thành công!");

    res.json({
      code: "success"
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.json({
      code: "error",
      message: "Cập nhật thất bại!"
    });
  }
};

// [PATCH] /admin/booking/delete/:id
module.exports.deletePatch = async (req, res) => {
  try {
    const id = req.params.id;
    
    await Booking.deleteOne({
      _id: id
    });

    req.flash("success", "Xóa đặt vé thành công!");

    res.json({
      code: "success"
    });
  } catch (error) {
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    });
  }
};