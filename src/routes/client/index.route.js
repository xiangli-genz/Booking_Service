const router = require('express').Router();
const homeRoutes = require("./home.route");
const movieRoutes = require("./movie.route");
const contactRoutes = require("./contact.route");
const categoryRoutes = require("./category.route");
const searchRoutes = require("./search.route");
const bookingRoutes = require("./booking.route");
const newsRoutes = require("./news.route");
const contactsRoutes = require("./contacts.route");
const userRoutes = require("./user.route");

const settingMiddleware = require("../../middlewares/client/setting.middleware");
const categoryMiddleware = require("../../middlewares/client/category.middleware");
const userAuthMiddleware = require("../../middlewares/client/user-auth.middleware");

router.use(settingMiddleware.websiteInfo);
router.use(categoryMiddleware.list);
router.use(userAuthMiddleware.checkUserLogin);

router.use('/', homeRoutes);
router.use('/movie', movieRoutes);
router.use('/contact', contactRoutes);
router.use('/category', categoryRoutes);
router.use('/search', searchRoutes);
router.use('/booking', bookingRoutes);
router.use('/news', newsRoutes);
router.use('/contacts', contactsRoutes);
router.use('/user', userRoutes);

module.exports = router;