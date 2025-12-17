// ============================================
// FILE: controllers/admin/booking.controller.js
// ============================================
const moment = require("moment");
const Booking = require("../../models/booking.model");
const User = require("../../models/user.model");

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